import os
import redis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("duvasmap")

REDIS_URL = os.getenv("REDIS_URL", "redis://cache:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# Chaves e Limites
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
MONTHLY_PAID_CALL_LIMIT = int(os.getenv("MONTHLY_PAID_CALL_LIMIT", "500"))
MAX_UPLOAD_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(8 * 1024 * 1024)))
MAX_UPLOAD_ROWS = int(os.getenv("MAX_UPLOAD_ROWS", "800"))
MAX_PLACES_RESULTS = int(os.getenv("MAX_PLACES_RESULTS", "200"))
AUTH_FAIL_LIMIT = int(os.getenv("AUTH_FAIL_LIMIT", "10"))
AUTH_FAIL_WINDOW_SECONDS = int(os.getenv("AUTH_FAIL_WINDOW_SECONDS", "900"))
AUTH_LOCKOUT_SECONDS = int(os.getenv("AUTH_LOCKOUT_SECONDS", "900"))

REGISTRATION_SECRET = os.getenv("REGISTRATION_SECRET")
if not REGISTRATION_SECRET:
    raise RuntimeError(
        "REGISTRATION_SECRET não configurada. Defina um código de convite "
        "(ex: python -c \"import secrets; print(secrets.token_hex(16))\") e "
        "compartilhe apenas com quem deve poder criar conta no sistema."
    )

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")