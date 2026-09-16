from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, JSON, DateTime, func

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

class ImportBatch(Base):
    __tablename__ = "import_batches"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    owner_id = Column(String, index=True, nullable=False, default="unknown")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    leads = relationship("Lead", back_populates="batch", cascade="all, delete")

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("import_batches.id"))
    owner_id = Column(String, index=True, nullable=False, default="unknown")
    nome = Column(String, index=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    is_valid = Column(Boolean, default=True)
    motivo_falha = Column(String, nullable=True)
    dados_brutos = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    batch = relationship("ImportBatch", back_populates="leads")

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, index=True, nullable=False, default="unknown")
    distancia_total_km = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    stops = relationship("RouteStop", back_populates="route", cascade="all, delete")

class RouteStop(Base):
    __tablename__ = "route_stops"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    ordem = Column(Integer)

    route = relationship("Route", back_populates="stops")


class AccessLog(Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, index=True, nullable=False)
    action = Column(String, index=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(Integer, nullable=True)
    detail = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())