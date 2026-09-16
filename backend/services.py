import math
import httpx
import re
import pandas as pd
import io
from typing import List

from config import logger, GOOGLE_MAPS_API_KEY
from security import url_maps_e_segura
from schemas import PontoLead

def calcular_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

async def otimizar_rota_hibrida(leads: List[PontoLead], perfil: str, tem_origem: bool) -> dict:
    ordered_leads = []
    
    if perfil == "driving":
        coords = ";".join([f"{p.lng},{p.lat}" for p in leads])
        url_trip = f"http://router.project-osrm.org/trip/v1/driving/{coords}"
        try:
            async with httpx.AsyncClient() as client:
                source = "first" if tem_origem else "any"
                resp = await client.get(url_trip, params={"source": source, "roundtrip": "false"}, timeout=20.0)
                if resp.status_code == 200 and resp.json().get("code") == "Ok":
                    data = resp.json()
                    ordered_leads = [None] * len(leads)
                    for i, wp in enumerate(data["waypoints"]):
                        ordered_leads[wp["waypoint_index"]] = leads[i]
        except Exception as e:
            logger.warning(f"Falha no OSRM Trip: {e}")
    
    if not ordered_leads:
        unvisited = leads[1:] if tem_origem else leads.copy()
        current = leads[0] if tem_origem else unvisited.pop(0)
        ordered_leads = [current]
        
        while unvisited:
            next_p = min(unvisited, key=lambda p: calcular_haversine(current.lat, current.lng, p.lat, p.lng))
            ordered_leads.append(next_p)
            unvisited.remove(next_p)
            current = next_p

    coords_ordered = ";".join([f"{p.lng},{p.lat}" for p in ordered_leads])
    
    if perfil == "foot":
        url_route = f"https://routing.openstreetmap.de/routed-foot/route/v1/driving/{coords_ordered}"
    else:
        url_route = f"http://router.project-osrm.org/route/v1/driving/{coords_ordered}"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url_route, params={"geometries": "geojson", "overview": "full"}, timeout=20.0)
            if resp.status_code == 200 and resp.json().get("code") == "Ok":
                route_data = resp.json()["routes"][0]
                distancia_km = round(route_data["distance"] / 1000, 2)
                
                coordenadas = [[c[1], c[0]] for c in route_data["geometry"]["coordinates"]]
                
                return {
                    "rota_ordenada": [p.dict() for p in ordered_leads],
                    "distancia_total_km": distancia_km,
                    "geometria": coordenadas
                }
    except Exception as e:
        logger.warning(f"Falha no OSRM Route: {e}")

    distancia_total = 0
    for i in range(len(ordered_leads) - 1):
        distancia_total += calcular_haversine(ordered_leads[i].lat, ordered_leads[i].lng, ordered_leads[i+1].lat, ordered_leads[i+1].lng)
        
    return {
        "rota_ordenada": [p.dict() for p in ordered_leads],
        "distancia_total_km": round(distancia_total, 2),
        "geometria": [[p.lat, p.lng] for p in ordered_leads]
    }

async def geocodificar_endereco(endereco: str) -> dict:
    if not GOOGLE_MAPS_API_KEY: return None
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": endereco, "key": GOOGLE_MAPS_API_KEY}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'OK' and len(data.get('results', [])) > 0:
                    loc = data['results'][0]['geometry']['location']
                    return {"lat": loc['lat'], "lng": loc['lng']}
    except Exception as e: logger.warning(f"Erro no geocoding: {e}")
    return None

async def resolver_link_maps(url: str) -> dict:
    if not url_maps_e_segura(url): return None
    try:
        async with httpx.AsyncClient(follow_redirects=True, max_redirects=3) as client:
            response = await client.get(url, timeout=10.0)
            final_url = str(response.url)
            if not url_maps_e_segura(final_url): return None
            match_at = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
            if match_at: return {"lat": float(match_at.group(1)), "lng": float(match_at.group(2))}
            match_bang = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', final_url)
            if match_bang: return {"lat": float(match_bang.group(1)), "lng": float(match_bang.group(2))}
    except Exception as e: logger.warning(f"Erro no maps url: {e}")
    return None

def processar_dados_arquivo(file_bytes: bytes, filename: str) -> pd.DataFrame:
    if filename.endswith('.csv'):
        try: return pd.read_csv(io.BytesIO(file_bytes), encoding='utf-8')
        except UnicodeDecodeError: return pd.read_csv(io.BytesIO(file_bytes), encoding='latin-1')
    elif filename.endswith(('.xls', '.xlsx')): return pd.read_excel(io.BytesIO(file_bytes))
    raise ValueError("Formato não suportado. Use .csv ou .xlsx.")

def encontrar_coluna(columns, keywords):
    for col in columns:
        for keyword in keywords:
            if keyword in col: return col
    return None