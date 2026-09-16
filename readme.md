# Duvasmap Logistics

Plataforma web para automação de prospecção B2B (lead generation) e roteirização otimizada de visitas de campo. Unifica em um único fluxo o que hoje costuma ser feito manualmente: buscar estabelecimentos por região, importar contatos de planilha, e montar a ordem de visitas do dia.

- **Descoberta de leads:** upload de planilha (`.csv`/`.xlsx`), extração de links do Google Maps, ou busca parametrizada na Google Places API.
- **Roteirização otimizada:** transforma a lista de pontos selecionados numa rota logisticamente eficiente (TSP via matriz de distâncias do OSRM, com origem no GPS do usuário).

**Persona-alvo:** vendedor autônomo, freelancer ou pequena equipe comercial que faz prospecção presencial e precisa maximizar visitas por dia minimizando deslocamento.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python + FastAPI |
| Banco de dados | PostgreSQL |
| Cache / filas de controle | Redis |
| Roteamento (TSP) | OSRM público (`router.project-osrm.org`), com fallback Haversine se indisponível |
| Geocodificação / busca de lugares | Google Geocoding API + Google Places API (New) |
| Frontend | React + Vite, React Router, Tailwind CSS |
| Drag-and-drop da fila de rota | `@dnd-kit` |
| Mapa | React-Leaflet |
| Notificações da UI | `sonner` |
| Proxy / HTTPS | Caddy (certificado automático) |
| Orquestração | Docker Compose |

---

## Arquitetura do backend

```
backend/
├── main.py        # cria a app FastAPI, CORS, registra os routers
├── config.py      # variáveis de ambiente, Redis, limites e segredos
├── database.py    # engine/sessão do SQLAlchemy
├── models.py      # tabelas: User, ImportBatch, Lead, Route, RouteStop, AccessLog
├── schemas.py      # modelos Pydantic das requisições
├── security.py    # JWT, hash de senha, anti-SSRF, lockout de força bruta
├── routers.py      # endpoints da API, agrupados por domínio
├── services.py     # lógica auxiliar (geocoding, OSRM, parsing de planilha)
├── migrate_add_owner_and_lgpd.py  # migração pontual para bancos já existentes
└── cleanup_retention.py           # rotina de retenção de dados (LGPD)
```

O frontend segue o padrão `pages` (telas) + `components` (blocos de UI reutilizáveis) + `hooks` (lógica de estado/API) + `contexts` (autenticação global):

```
frontend/src/
├── App.jsx                    # rotas (react-router)
├── contexts/AuthContext.jsx   # login, registro, token JWT, logout automático em 401
├── pages/                     # Login, Register, Dashboard
├── components/                # SidebarLeft, SidebarRight, InteractiveMap, SortableRouteItem
└── hooks/                     # useLeads, useRouting, useGPS
```

---

## Autenticação e segurança

O acesso à API exige conta e login (JWT). Não existem chaves de API fixas nem endpoints públicos para os dados de leads/rotas.

- **Cadastro fechado por convite:** `/api/register` exige um código de convite (`REGISTRATION_SECRET`) que só quem administra o ambiente deve compartilhar. Sem o código certo, não é possível criar conta.
- **Isolamento por usuário:** cada lote de leads e cada rota salva pertence a quem criou — um usuário não vê os dados de outro.
- **Proteção contra força bruta:** tentativas de login e cadastro com falha repetida bloqueiam o IP temporariamente.
- **Anti-SSRF:** links do Google Maps vindos de planilhas importadas só são seguidos se apontarem para domínios legítimos do Google e resolverem para um IP público (nunca rede interna).
- **Controle de custo:** cada usuário tem um teto mensal de chamadas pagas de API (Places/Geocoding), configurável, com bloqueio automático ao exceder.
- **Limites de upload:** tamanho de arquivo e número de linhas por planilha são limitados para evitar abuso.
- **LGPD:** endpoints de exclusão sob demanda (`DELETE /api/import-batches/{id}`, `DELETE /api/routes/{id}`), log de auditoria (`GET /api/audit-log`, restrito ao usuário administrador) e rotina automática de retenção (`cleanup_retention.py`).
- **HTTPS:** proxy reverso Caddy na frente da aplicação, com certificado emitido e renovado automaticamente quando configurado um domínio real.

---

## Como rodar

### 1. Pré-requisitos
- Docker e Docker Compose instalados.
- Uma chave de API do Google Cloud com **Geocoding API** e **Places API (New)** habilitadas.

### 2. Configurar variáveis de ambiente
Copie o template e preencha os valores:

```bash
cp .env.example .env
```

Gere valores aleatórios para os segredos críticos (nunca use os valores de exemplo):

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"   # JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(16))"   # REGISTRATION_SECRET
python3 -c "import secrets; print(secrets.token_hex(24))"   # POSTGRES_PASSWORD, REDIS_PASSWORD
```

O backend **recusa iniciar** se `DATABASE_URL`, `JWT_SECRET_KEY` ou `REGISTRATION_SECRET` não estiverem definidos — isso é intencional, para nunca subir com um valor padrão inseguro.

### 3. Subir os containers

```bash
docker-compose up -d --build
```

Isso sobe: PostgreSQL, Redis, backend (FastAPI), frontend (Vite dev server), worker de retenção de dados, e o proxy Caddy.

### 4. Criar o primeiro usuário
Acesse `http://localhost:5173`, vá em "Solicitar credencial de operação" e cadastre-se usando o `REGISTRATION_SECRET` que você definiu no `.env` como código de convite. Para ter acesso ao log de auditoria, use como nome de usuário o mesmo valor configurado em `ADMIN_USERNAME` (padrão: `admin`).

### 5. Configurar a chave do Google
Cole sua chave em `GOOGLE_MAPS_API_KEY` no `.env` e reinicie o backend:

```bash
docker-compose up -d --build backend
```

---

## Variáveis de ambiente

Veja `.env.example` para a lista completa e comentada. As mais importantes:

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Montada a partir de `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` |
| `REDIS_PASSWORD` | Senha do Redis (cache, cotas, lockout de login) |
| `GOOGLE_MAPS_API_KEY` | Chave da Geocoding API / Places API |
| `JWT_SECRET_KEY` | Assina os tokens de login — obrigatória, sem valor padrão |
| `REGISTRATION_SECRET` | Código de convite exigido para criar conta — obrigatória |
| `ADMIN_USERNAME` | Username com acesso ao log de auditoria |
| `MONTHLY_PAID_CALL_LIMIT` | Teto de chamadas pagas por usuário/mês |
| `MAX_PLACES_RESULTS` | Teto de resultados por busca de lugares |
| `MAX_UPLOAD_SIZE_BYTES` / `MAX_UPLOAD_ROWS` | Limites de planilha importada |
| `AUTH_FAIL_LIMIT` / `AUTH_FAIL_WINDOW_SECONDS` / `AUTH_LOCKOUT_SECONDS` | Bloqueio por força bruta no login/cadastro |
| `LEAD_RETENTION_DAYS` | Dias até um lote de leads ser apagado automaticamente |
| `DOMAIN` | Domínio real para HTTPS automático via Caddy (produção) |

---

## Principais endpoints da API

Todos sob prefixo `/api`, exigindo `Authorization: Bearer <token>` exceto `/token` e `/register`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/token` | Login — retorna o token JWT |
| POST | `/register` | Cria conta (exige código de convite) |
| POST | `/upload-leads` | Importa planilha de leads |
| GET | `/my-batches` | Lista lotes importados pelo usuário logado |
| DELETE | `/import-batches/{id}` | Exclui um lote e seus leads (LGPD) |
| POST | `/search-places` | Busca estabelecimentos no Google Places |
| POST | `/optimize-route` | Calcula a rota otimizada (TSP) |
| POST | `/save-route` | Salva a rota no banco |
| GET | `/my-routes` | Lista rotas salvas pelo usuário logado |
| DELETE | `/routes/{id}` | Exclui uma rota salva |
| POST | `/export-route` | Exporta a rota final em `.xlsx` |
| GET | `/audit-log` | Log de auditoria (somente `ADMIN_USERNAME`) |

---

## Manutenção

- **Migrar um banco já existente** (criado antes das colunas `owner_id`/`created_at`):
  ```bash
  docker-compose exec backend python migrate_add_owner_and_lgpd.py
  ```
- **Rodar a limpeza de retenção manualmente** (o `retention-worker` já faz isso todo dia sozinho):
  ```bash
  docker-compose exec backend python cleanup_retention.py
  ```

---

## Regras de negócio

- **Otimização automática:** a fila de rota sempre parte da melhor ordem calculada pelo backend; reordenar manualmente (drag-and-drop) sobrepõe essa ordem até um novo cálculo.
- **Enriquecimento de dados:** um lead sem coordenadas passa por três tentativas em cascata — coordenadas diretas, link do Google Maps, endereço via geocoding — antes de cair em "pendências".
- **Estado único:** desmarcar ou excluir um lead na tabela remove imediatamente o ponto do mapa e da fila de rota.
- **Custo prévio:** toda busca paga mostra uma estimativa de custo antes de ser confirmada pelo usuário.
- **Degradação graciosa:** se o OSRM estiver fora do ar, a rota volta a ser calculada por distância em linha reta (Haversine), com aviso, em vez de travar a aplicação.

## Fora de escopo (nesta versão)

- Múltiplos times com permissões diferentes (RBAC completo) — hoje existe só distinção entre usuário comum e `ADMIN_USERNAME`.
- Integração direta com CRMs externos (Pipedrive, HubSpot, etc.).
- Agendamento automático de visitas por calendário.