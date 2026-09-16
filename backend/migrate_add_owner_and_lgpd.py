from sqlalchemy import text
from database import engine

DEFAULT_OWNER_FOR_LEGACY_ROWS = "legacy"

STATEMENTS = [
    # import_batches
    "ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS owner_id VARCHAR",
    "ALTER TABLE import_batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()",
    f"UPDATE import_batches SET owner_id = '{DEFAULT_OWNER_FOR_LEGACY_ROWS}' WHERE owner_id IS NULL",
    "ALTER TABLE import_batches ALTER COLUMN owner_id SET NOT NULL",

    # leads
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_id VARCHAR",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()",
    f"UPDATE leads SET owner_id = '{DEFAULT_OWNER_FOR_LEGACY_ROWS}' WHERE owner_id IS NULL",
    "ALTER TABLE leads ALTER COLUMN owner_id SET NOT NULL",

    # routes
    "ALTER TABLE routes ADD COLUMN IF NOT EXISTS owner_id VARCHAR",
    "ALTER TABLE routes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()",
    f"UPDATE routes SET owner_id = '{DEFAULT_OWNER_FOR_LEGACY_ROWS}' WHERE owner_id IS NULL",
    "ALTER TABLE routes ALTER COLUMN owner_id SET NOT NULL",

    """
    CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        owner_id VARCHAR NOT NULL,
        action VARCHAR,
        resource_type VARCHAR,
        resource_id INTEGER,
        detail VARCHAR,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
]

def run():
    with engine.begin() as conn:
        for stmt in STATEMENTS:
            print(f"Executando: {stmt.strip()[:80]}...")
            conn.execute(text(stmt))
    print("Migração concluída com sucesso.")

if __name__ == "__main__":
    run()