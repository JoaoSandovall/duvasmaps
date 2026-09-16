import math
import json
import asyncio
import io
import pandas as pd
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db

from models import ImportBatch, Lead, Route, RouteStop, AccessLog, User
from schemas import RequisicaoRota, RequisicaoBuscaLocal, RequisicaoSalvarRota, PontoLead
from config import (
    logger, redis_client, GOOGLE_MAPS_API_KEY, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_ROWS,
    MAX_PLACES_RESULTS, REGISTRATION_SECRET,
)

from security import (
    obter_usuario_atual,
    obter_hash_senha,
    verificar_senha,
    criar_token_acesso,
    registrar_log_auditoria,
    checar_e_incrementar_cota,
    exigir_admin,
    validar_forca_senha,
    verificar_e_registrar_tentativa,
    registrar_tentativa_falha,
    limpar_tentativas_falha,
)

from fastapi.security import OAuth2PasswordRequestForm

from services import (
    otimizar_rota_hibrida,
    geocodificar_endereco,
    resolver_link_maps, 
    processar_dados_arquivo, 
    encontrar_coluna
)

router_leads = APIRouter(prefix="/api", tags=["Leads"])
router_places = APIRouter(prefix="/api", tags=["Places"])
router_routes = APIRouter(prefix="/api", tags=["Routes"])
router_audit = APIRouter(prefix="/api", tags=["Audit"])

@router_leads.post("/upload-leads")
async def upload_leads(file: UploadFile = File(...), db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Arquivo excede o tamanho máximo permitido.")
    
    try:
        df = processar_dados_arquivo(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao processar o arquivo.")

    if len(df) > MAX_UPLOAD_ROWS:
        raise HTTPException(status_code=422, detail=f"Arquivo contém {len(df)} linhas, acima do limite de {MAX_UPLOAD_ROWS}.")

    df.columns = [str(c).strip().lower() for c in df.columns]
    col_name = encontrar_coluna(df.columns, ['nome', 'empresa', 'cliente', 'estabelecimento'])
    col_lat = encontrar_coluna(df.columns, ['lat', 'latitude'])
    col_lng = encontrar_coluna(df.columns, ['lng', 'lon', 'longitude'])
    col_link = encontrar_coluna(df.columns, ['link', 'url', 'maps'])
    col_address = encontrar_coluna(df.columns, ['endereço', 'endereco', 'rua', 'local'])

    valid_leads, pending_leads = [], []

    for index, row in df.iterrows():
        identifier = row[col_name] if col_name and pd.notna(row[col_name]) else f"Registro {index + 1}"
        entry = {
            "id": index, "nome": str(identifier).strip(),
            "dados_brutos": {col: (None if (isinstance(row[col], float) and math.isnan(row[col])) else row[col]) for col in df.columns}
        }

        if col_lat and col_lng and pd.notna(row[col_lat]) and pd.notna(row[col_lng]):
            try:
                lat_val, lng_val = float(row[col_lat]), float(row[col_lng])
                if -90 <= lat_val <= 90 and -180 <= lng_val <= 180:
                    entry["localizacao"] = {"tipo": "coordenadas", "lat": lat_val, "lng": lng_val}
                    valid_leads.append(entry)
                    continue
            except ValueError:
                pass

        if col_link and pd.notna(row[col_link]) and str(row[col_link]).strip().startswith('http'):
            link_val = str(row[col_link]).strip()
            coords = await resolver_link_maps(link_val)
            if coords:
                entry["localizacao"] = {"tipo": "coordenadas", "lat": coords["lat"], "lng": coords["lng"], "origem_conversao": "regex_maps_link"}
                valid_leads.append(entry)
            else:
                entry["motivo_falha"], entry["localizacao"] = "Link inválido/inacessível.", {"tipo": "link_maps", "valor": link_val}
                pending_leads.append(entry)
            continue

        if col_address and pd.notna(row[col_address]) and str(row[col_address]).strip():
            address_val = str(row[col_address]).strip()
            checar_e_incrementar_cota(owner)
            coords = await geocodificar_endereco(address_val)
            if coords:
                entry["localizacao"] = {"tipo": "coordenadas", "lat": coords["lat"], "lng": coords["lng"], "origem_conversao": "geocoding"}
                valid_leads.append(entry)
            else:
                entry["motivo_falha"], entry["localizacao"] = "Endereço encontrado.", {"tipo": "endereco", "valor": address_val}
                pending_leads.append(entry)
            continue

        entry["motivo_falha"] = "Nenhum dado de localização válido."
        pending_leads.append(entry)

    try:
        novo_lote = ImportBatch(filename=file.filename, owner_id=owner)
        db.add(novo_lote)
        db.commit()
        db.refresh(novo_lote)

        leads_db = []
        for v in valid_leads:
            leads_db.append(Lead(batch_id=novo_lote.id, owner_id=owner, nome=v["nome"], lat=v["localizacao"]["lat"], lng=v["localizacao"]["lng"], is_valid=True, dados_brutos=v.get("dados_brutos")))
        for p in pending_leads:
            leads_db.append(Lead(batch_id=novo_lote.id, owner_id=owner, nome=p["nome"], is_valid=False, motivo_falha=p.get("motivo_falha"), dados_brutos=p.get("dados_brutos")))

        if leads_db:
            db.add_all(leads_db)
            db.commit()
            
        registrar_log_auditoria(db, owner, "upload_leads", "import_batch", novo_lote.id, detail=f"{len(valid_leads)} válidos, {len(pending_leads)} pendentes")
    except Exception:
        db.rollback()
        logger.exception("Erro ao salvar lote de leads no banco.")
        raise HTTPException(status_code=500, detail="Erro ao salvar dados.")

    return {"arquivo": file.filename, "total_registros": len(df), "leads_validos": len(valid_leads), "leads_pendentes": len(pending_leads), "data": {"validos": valid_leads, "pendentes": pending_leads}}


@router_leads.get("/my-batches")
async def listar_meus_lotes(db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    batches = db.query(ImportBatch).filter(ImportBatch.owner_id == owner).order_by(ImportBatch.created_at.desc()).all()
    return {"batches": [{"id": b.id, "filename": b.filename, "created_at": b.created_at.isoformat() if b.created_at else None, "total_leads": len(b.leads)} for b in batches]}


@router_leads.delete("/import-batches/{batch_id}")
async def deletar_lote(batch_id: int, db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id, ImportBatch.owner_id == owner).first()
    if not batch: raise HTTPException(status_code=404, detail="Lote não encontrado.")
    
    total_leads = len(batch.leads)
    db.delete(batch)
    db.commit()
    registrar_log_auditoria(db, owner, "delete_batch", "import_batch", batch_id, detail=f"{total_leads} leads removidos.")
    return {"message": "Lote removido."}


@router_places.post("/search-places")
async def buscar_locais(req: RequisicaoBuscaLocal, db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    max_resultados = min(req.max_resultados, MAX_PLACES_RESULTS)

    nicho_formatado, localidade_formatada = req.nicho.strip().lower(), req.localidade.strip().lower()
    cache_key = f"search_new_api:{nicho_formatado}:{localidade_formatada}:{max_resultados}"
    
    try:
        if (cached_data := redis_client.get(cache_key)): return json.loads(cached_data)
    except Exception: pass

    if not GOOGLE_MAPS_API_KEY: raise HTTPException(status_code=500, detail="Chave do Google não configurada.")

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName.text,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.websiteUri,nextPageToken",
        "Content-Type": "application/json"
    }
    
    current_body = {
        "textQuery": f"{req.nicho} em {req.localidade}",
        "languageCode": "pt-BR",
        "pageSize": 20
    }

    try:
        async with httpx.AsyncClient() as client:
            all_results, next_page_token = [], None
            
            while len(all_results) < max_resultados:
                checar_e_incrementar_cota(owner)

                response = await client.post(url, headers=headers, json=current_body, timeout=15.0)
                
                if response.status_code != 200:
                    logger.error(f"Erro Nova API Google: {response.status_code} - {response.text}")
                    if response.status_code == 403:
                        raise HTTPException(status_code=403, detail="Você precisa ativar a 'Places API (New)' no Google Cloud Console.")
                    break

                data = response.json()
                page_places = data.get('places', [])
                all_results.extend(page_places)
                
                next_page_token = data.get('nextPageToken')
                if not next_page_token or len(all_results) >= max_resultados: break
                
                await asyncio.sleep(2)
                current_body["pageToken"] = next_page_token

            all_results = all_results[:max_resultados]
            valid_leads = []
            
            for i, p in enumerate(all_results):
                lat = p.get('location', {}).get('latitude')
                lng = p.get('location', {}).get('longitude')
                if not lat or not lng: continue

                valid_leads.append({
                    "id": int(pd.Timestamp.now().timestamp() * 1000) + i, 
                    "nome": p.get('displayName', {}).get('text', 'Sem Nome'),
                    "localizacao": {"tipo": "coordenadas", "lat": lat, "lng": lng, "origem_conversao": "places_api_new"},
                    "dados_brutos": {
                        "endereco": p.get('formattedAddress', ''), 
                        "rating": p.get('rating', 0), 
                        "total_avaliacoes": p.get('userRatingCount', 0),
                        "site": p.get('websiteUri', ''),
                        "link": f"https://www.google.com/maps/search/?api=1&query={lat},{lng}&query_place_id={p.get('id')}"
                    }
                })

            response_data = {"data": {"validos": valid_leads, "pendentes": []}}
            
            is_complete = len(all_results) >= req.max_resultados or not next_page_token
            if is_complete:
                try: redis_client.setex(cache_key, 604800, json.dumps(response_data))
                except Exception: pass

            registrar_log_auditoria(db, owner, "search_places", detail=f"nicho='{req.nicho}', resultados={len(valid_leads)}")
            return response_data

    except HTTPException: raise
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail="Erro interno ao buscar estabelecimentos.")


@router_routes.post("/optimize-route")
async def otimizar_rota(req: RequisicaoRota, owner: str = Depends(obter_usuario_atual)):
    if not req.leads: raise HTTPException(status_code=400, detail="Nenhum ponto válido.")
    
    pontos_para_otimizar = req.leads.copy()
    
    tem_origem = req.origem_lat is not None and req.origem_lng is not None
    if tem_origem:
        ponto_origem = PontoLead(id=-1, nome="[BASE] ORIGEM OPERACIONAL", lat=req.origem_lat, lng=req.origem_lng)
        pontos_para_otimizar.insert(0, ponto_origem)

    if len(pontos_para_otimizar) < 2:
        return {"rota_ordenada": [req.leads[0].dict()], "distancia_total_km": 0.0, "geometria": []}

    resultado = await otimizar_rota_hibrida(pontos_para_otimizar, req.perfil, tem_origem)

    if resultado and tem_origem:
        resultado["rota_ordenada"] = [p for p in resultado["rota_ordenada"] if p["id"] != -1]
        
    return resultado


@router_routes.post("/save-route")
async def salvar_rota(payload: RequisicaoSalvarRota, db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    try:
        nova_rota = Route(distancia_total_km=payload.distancia, owner_id=owner)
        db.add(nova_rota)
        db.commit()
        db.refresh(nova_rota)

        stops_db = [RouteStop(route_id=nova_rota.id, lead_id=p.id if p.id < 1_000_000_000 else None, ordem=i + 1) for i, p in enumerate(payload.rota)]
        db.add_all(stops_db)
        db.commit()

        registrar_log_auditoria(db, owner, "save_route", "route", nova_rota.id)
        return {"message": "Rota salva com sucesso!", "route_id": nova_rota.id}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar a rota.")


@router_routes.post("/export-route")
async def exportar_rota(req: RequisicaoRota, db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    if not req.leads: raise HTTPException(status_code=400, detail="Nenhum dado.")
    registrar_log_auditoria(db, owner, "export_route", detail=f"{len(req.leads)} pontos")
    
    try:
        df = pd.DataFrame([lead.dict() for lead in req.leads])
        df.rename(columns={"id": "ID Original", "nome": "Estabelecimento", "lat": "Latitude", "lng": "Longitude"}, inplace=True)
        df.insert(0, 'Ordem na Rota', range(1, len(df) + 1))

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Rota Otimizada')
        output.seek(0)
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao gerar arquivo.")

    headers = {'Content-Disposition': 'attachment; filename="rota_otimizada.xlsx"'}
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')


@router_routes.get("/my-routes")
async def listar_minhas_rotas(db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    routes = db.query(Route).filter(Route.owner_id == owner).order_by(Route.created_at.desc()).all()
    return {"routes": [{"id": r.id, "distancia_total_km": r.distancia_total_km, "created_at": r.created_at.isoformat() if r.created_at else None, "total_paradas": len(r.stops)} for r in routes]}


@router_routes.delete("/routes/{route_id}")
async def deletar_rota(route_id: int, db: Session = Depends(get_db), owner: str = Depends(obter_usuario_atual)):
    route = db.query(Route).filter(Route.id == route_id, Route.owner_id == owner).first()
    if not route: raise HTTPException(status_code=404, detail="Rota não encontrada.")
    db.delete(route)
    db.commit()
    registrar_log_auditoria(db, owner, "delete_route", "route", route_id)
    return {"message": f"Rota #{route_id} removida."}


@router_audit.get("/audit-log")
async def listar_logs_auditoria(limit: int = 100, db: Session = Depends(get_db), owner: str = Depends(exigir_admin)):
    limit = max(1, min(limit, 500))
    logs = db.query(AccessLog).order_by(AccessLog.created_at.desc()).limit(limit).all()
    return {"logs": [{"id": log.id, "owner_id": log.owner_id, "action": log.action, "resource_type": log.resource_type, "resource_id": log.resource_id, "detail": log.detail, "created_at": log.created_at.isoformat() if log.created_at else None} for log in logs]}

@router_audit.post("/register")
async def registrar_usuario(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ip = verificar_e_registrar_tentativa(request, "register")

    codigo_convite = form_data.client_secret
    if not codigo_convite or codigo_convite != REGISTRATION_SECRET:
        registrar_tentativa_falha(ip, "register")
        raise HTTPException(status_code=403, detail="Código de convite inválido.")

    validar_forca_senha(form_data.password)

    usuario_existente = db.query(User).filter(User.username == form_data.username).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Usuário já registrado")

    novo_usuario = User(
        username=form_data.username,
        hashed_password=obter_hash_senha(form_data.password)
    )
    db.add(novo_usuario)
    db.commit()
    limpar_tentativas_falha(ip, "register")
    return {"msg": "Usuário criado com sucesso!"}

@router_audit.post("/token")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    ip = verificar_e_registrar_tentativa(request, "login")

    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verificar_senha(form_data.password, user.hashed_password):
        registrar_tentativa_falha(ip, "login")
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")

    limpar_tentativas_falha(ip, "login")
    access_token = criar_token_acesso(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}