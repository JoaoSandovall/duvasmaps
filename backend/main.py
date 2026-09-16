from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from config import CORS_ORIGINS
from routers import router_leads, router_places, router_routes, router_audit

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Duvasmap API", 
    description="Motor de roteirização B2B - Refatorado com Clean Architecture"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router_leads)
app.include_router(router_places)
app.include_router(router_routes)
app.include_router(router_audit)