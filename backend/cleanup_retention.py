import os
from datetime import datetime, timedelta, timezone
from database import SessionLocal
from models import ImportBatch, AccessLog

RETENTION_DAYS = int(os.getenv("LEAD_RETENTION_DAYS", "180"))


def run():
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    db = SessionLocal()
    try:
        old_batches = db.query(ImportBatch).filter(ImportBatch.created_at < cutoff).all()

        if not old_batches:
            print(f"Nenhum lote mais antigo que {RETENTION_DAYS} dias. Nada a remover.")
            return

        for batch in old_batches:
            print(f"Removendo lote #{batch.id} ('{batch.filename}', owner={batch.owner_id}, "
                  f"criado em {batch.created_at}) — {len(batch.leads)} lead(s) associado(s).")

            db.add(AccessLog(
                owner_id="system_retention",
                action="auto_delete_batch_retention",
                resource_type="import_batch",
                resource_id=batch.id,
                detail=f"Removido automaticamente após {RETENTION_DAYS} dias de retenção.",
            ))
            db.delete(batch)

        db.commit()
        print(f"{len(old_batches)} lote(s) removido(s) por política de retenção.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()