import os
import socket
import ipaddress
from urllib.parse import urlparse
from datetime import datetime, timedelta, timezone, date
from fastapi import HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import get_db
from models import AccessLog
from config import (
    logger,
    redis_client,
    MONTHLY_PAID_CALL_LIMIT,
    AUTH_FAIL_LIMIT,
    AUTH_FAIL_WINDOW_SECONDS,
    AUTH_LOCKOUT_SECONDS,
    ADMIN_USERNAME,
)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY não configurada. Defina essa variável de ambiente com um "
        "valor longo e aleatório (ex: python -c \"import secrets; print(secrets.token_hex(32))\") "
        "antes de iniciar a aplicação. Por segurança, não há mais um valor padrão embutido no código."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 dia

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

MIN_PASSWORD_LENGTH = int(os.getenv("MIN_PASSWORD_LENGTH", "8"))


def validar_forca_senha(password: str):

    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres.",
        )


def obter_hash_senha(password: str):
    return pwd_context.hash(password)


def verificar_senha(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def criar_token_acesso(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def obter_usuario_atual(token: str = Depends(oauth2_scheme)):
    credenciais_exception = HTTPException(
        status_code=401,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credenciais_exception
    except JWTError:
        raise credenciais_exception
    return username


async def exigir_admin(owner: str = Depends(obter_usuario_atual)) -> str:
    if owner != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador.")
    return owner


def registrar_log_auditoria(db: Session, owner: str, action: str, resource_type: str = None, resource_id: int = None, detail: str = None):
    try:
        db.add(AccessLog(owner_id=owner, action=action, resource_type=resource_type, resource_id=resource_id, detail=detail))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Falha ao gravar log de auditoria ({action}): {e}")


def checar_e_incrementar_cota(owner_name: str, calls: int = 1):
    key = f"custo:{owner_name}:{date.today().strftime('%Y-%m')}"
    try:
        current = redis_client.incrby(key, calls)
        if current == calls:
            redis_client.expire(key, 60 * 60 * 24 * 32)
        if current > MONTHLY_PAID_CALL_LIMIT:
            raise HTTPException(status_code=429, detail=f"Limite mensal de chamadas da API atingido para '{owner_name}'.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao checar contador de custo no Redis: {e}")

def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconhecido"


def verificar_e_registrar_tentativa(request: Request, prefixo: str):
    ip = _client_ip(request)
    try:
        if redis_client.exists(f"{prefixo}:lock:{ip}") == 1:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas seguidas. Tente novamente mais tarde.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Erro ao checar lockout ({prefixo}) no Redis: {e}")
    return ip


def registrar_tentativa_falha(ip: str, prefixo: str):
    try:
        key = f"{prefixo}:fail:{ip}"
        current = redis_client.incr(key)
        if current == 1:
            redis_client.expire(key, AUTH_FAIL_WINDOW_SECONDS)
        if current >= AUTH_FAIL_LIMIT:
            redis_client.setex(f"{prefixo}:lock:{ip}", AUTH_LOCKOUT_SECONDS, "1")
            redis_client.delete(key)
            logger.warning(f"IP {ip} bloqueado temporariamente em '{prefixo}' após {current} falhas.")
    except Exception as e:
        logger.warning(f"Erro ao registrar falha ({prefixo}) no Redis: {e}")


def limpar_tentativas_falha(ip: str, prefixo: str):
    try:
        redis_client.delete(f"{prefixo}:fail:{ip}")
    except Exception:
        pass

DOMINIOS_MAPS_PERMITIDOS = {"maps.google.com", "www.google.com", "google.com", "goo.gl", "maps.app.goo.gl"}

def url_maps_e_segura(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return False
        hostname = parsed.hostname.lower()
        if not any(hostname == d or hostname.endswith("." + d) for d in DOMINIOS_MAPS_PERMITIDOS):
            return False

        addr_infos = socket.getaddrinfo(hostname, None)
        for info in addr_infos:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
                return False
        return True
    except Exception:
        return False