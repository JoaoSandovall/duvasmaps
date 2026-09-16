from pydantic import BaseModel
from typing import List, Optional

class PontoLead(BaseModel):
    id: int
    nome: str
    lat: float
    lng: float

class RequisicaoRota(BaseModel):
    leads: List[PontoLead]
    perfil: str = "driving"
    origem_lat: Optional[float] = None
    origem_lng: Optional[float] = None

class RequisicaoBuscaLocal(BaseModel):
    nicho: str
    localidade: str
    max_resultados: int = 20

class ItemParadaRota(BaseModel):
    id: int
    nome: str
    lat: float
    lng: float

class RequisicaoSalvarRota(BaseModel):
    distancia: float
    rota: List[ItemParadaRota]