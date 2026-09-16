# Documentação de Requisitos e Regras de Negócio
## Sistema de Roteirização e Prospecção B2B

**Versão:** 2.0
**Status:** Especificação para desenvolvimento

---

## 1. Visão Geral do Sistema

Plataforma web para automação de prospecção B2B (Lead Generation) e otimização logística de visitas de campo. O sistema resolve dois problemas conectados que hoje são tratados manualmente e de forma desconexa:

1. **Descoberta de leads geolocalizados** — via upload de planilha, extração de links do Google Maps, ou busca parametrizada em APIs de mapas.
2. **Roteirização otimizada** — transformando uma lista de endereços em uma rota logisticamente eficiente para visitas presenciais.

**Problema que resolve:** hoje, um profissional de prospecção de campo precisa (a) buscar manualmente estabelecimentos por região, (b) copiar endereços um por um, e (c) decidir a ordem de visita por intuição, sem otimização real de trajeto. O sistema unifica essas três etapas em um fluxo único.

**Usuário-alvo (persona primária):** vendedor autônomo, freelancer ou pequena equipe comercial que faz prospecção presencial (porta a porta) e precisa maximizar número de visitas por dia minimizando deslocamento.

---

## 2. Objetivos do Produto

| Objetivo | Métrica de sucesso |
|---|---|
| Reduzir tempo de preparação de rota | De ~30-40 min manuais (Google Maps + anotações) para menos de 2 min |
| Aumentar visitas por dia | Rota otimizada deve reduzir distância total percorrida em pelo menos 15-20% vs. ordem aleatória |
| Reduzir erro de dados | Taxa de geocodificação bem-sucedida acima de 90% dos registros importados |

---

## 3. Módulos de Entrada de Dados

### 3.1. Upload de Arquivos (Excel/CSV)

- **Formatos suportados:** `.xlsx`, `.csv` (UTF-8 e Latin-1, para evitar erro comum de acentuação em planilhas brasileiras).
- **Validação estrita:** cada linha precisa conter um identificador (nome) e um dado de localização.
- **Ordem de prioridade do algoritmo de extração de localização:**
  1. Latitude e Longitude (uso direto, sem processamento).
  2. Link do Google Maps (extração de Place ID ou coordenadas via parsing da URL).
  3. Endereço completo (submissão à Geocoding API).
- **Feedback ao usuário:** linhas que falham em todas as 3 tentativas devem ser exibidas em uma aba separada de "Pendências" no Data Grid, com o motivo da falha (ex: "endereço não encontrado", "coordenadas inválidas") — nunca falhar silenciosamente.

### 3.2. Motor de Busca Automatizada (Filtros)

Módulo integrado a APIs de Places (ex: Google Places API) para extração de estabelecimentos em lote.

- **Filtro geográfico:** cidade, bairro, CEP, ou raio de distância a partir de um ponto (ex: 10km do centro).
- **Filtro de nicho:** suporte a array de múltiplos termos de busca (ex: `["clínica odontológica", "dentista", "ortodontia"]`).
- **Filtro de relevância:** rating mínimo (ex: > 4.0) e volume mínimo de avaliações (ex: > 50).
- **Controle de paginação/lote:** usuário define o tamanho máximo de retorno (ex: 30 ou 40 registros) — essencial para previsibilidade de custo de API.
- **Estimativa de custo pré-busca:** antes de executar, o sistema deve mostrar uma estimativa de quantas chamadas de API serão consumidas e o custo aproximado, para o usuário confirmar antes de gastar cota.

---

## 4. Interface de Usuário e UX

### 4.1. Layout da Aplicação

- **Painel esquerdo (Data Grid):** formulário de filtros e área de upload. Após busca ou upload, transforma-se em tabela estilo planilha com os dados brutos e colunas extraídas.
- **Painel direito (Mapa e Fila):** mapa georreferenciado + módulo de fila de rota.

### 4.2. Fila da Rota (Route Queue)

- **Ordenação bottom-up:** a origem fica na extremidade inferior da lista, subindo até o último destino — mantém a leitura visual alinhada ao sentido de progresso no mapa.
- **Drag-and-drop:** reordenação manual das paradas diretamente na UI, sobrepondo temporariamente a otimização automática (ver RN01).
- **Indicador de tempo/distância por trecho:** cada item da fila deve mostrar tempo estimado até a próxima parada, não só a ordem — informação que falta na maioria das ferramentas concorrentes e ajuda o usuário a planejar o dia.

---

## 5. Regras de Negócio

**RN01 — Otimização Obrigatória (Auto-Routing)**
Independentemente do método de entrada (Excel, busca ou link manual) e da ordem cronológica de inserção, o sistema deve rodar o algoritmo de otimização no backend antes da primeira renderização. A fila inicial sempre representa a melhor rota logisticamente viável, nunca a ordem bruta de inserção.
*Exceção:* se o usuário reordenar manualmente via drag-and-drop, essa ordem manual prevalece até nova busca ou recálculo explícito.

**RN02 — Higienização e Enriquecimento de Dados**
Se um registro contiver apenas nome e URL de site próprio (sem endereço ou coordenadas), o backend aciona web scraping e/ou Text Search API para tentar descobrir coordenadas. Registros sem coordenadas válidas após essa rotina recebem flag de erro e não são plotados no mapa, mas permanecem visíveis na aba de Pendências (ver 3.1).

**RN03 — Vínculo Estado-Tabela-Mapa**
A tabela (Data Grid) e o mapa compartilham o mesmo estado global. Ao desmarcar ou excluir uma linha na tabela, o sistema remove imediatamente o nó da fila de rota e recalcula o trajeto com os nós restantes.

**RN04 — Clusterização de Limites de API**
APIs de roteamento (ex: Google Directions) têm limite restrito de waypoints otimizáveis por requisição (tipicamente 25 pontos). Se o usuário solicitar um lote maior (ex: 40 locais), o backend deve:
- Dividir o lote em sub-rotas lógicas por proximidade geográfica (clustering), **ou**
- Utilizar um motor open-source de TSP/VRP (ex: OSRM, VROOM) que suporte lotes maiores sem depender de múltiplas chamadas pagas.

**RN05 — Controle de Custo e Rate Limiting** *(novo)*
O sistema deve registrar o número de chamadas de API feitas por usuário/mês e bloquear ou alertar antes de exceder um teto configurável, evitando estouro de custo inesperado — especialmente relevante para APIs cobradas por chamada (Places, Geocoding, Directions).

**RN06 — Persistência e Cache de Buscas** *(novo)*
Buscas repetidas com os mesmos parâmetros (mesma região + mesmo nicho, dentro de um intervalo de tempo, ex: 7 dias) devem usar dados em cache antes de gerar nova chamada de API, reduzindo custo redundante — comum quando o usuário refina filtros gradualmente.

---

## 6. Requisitos Não-Funcionais

| Categoria | Requisito |
|---|---|
| **Performance** | Renderização inicial do mapa com até 40 pontos em menos de 3 segundos |
| **Disponibilidade** | Sistema deve degradar graciosamente se a API de rotas estiver indisponível (mostrar lista sem otimização, com aviso, em vez de travar) |
| **Segurança de dados** | Dados de leads importados (planilhas com contatos) devem ser tratados como dados sensíveis — criptografia em repouso, sem exposição pública de URLs de acesso |
| **Custo previsível** | Toda ação que consome API paga deve ser precedida de estimativa visível ao usuário (ver 3.2) |
| **Portabilidade de dados** | Usuário deve poder exportar a lista final (com rota otimizada) de volta para CSV/Excel |

---

## 7. Considerações Técnicas

**Stack sugerida (pontos de partida, não obrigatório):**
- **Backend:** Python (FastAPI) — alinhado a stack já dominada, bom suporte a processamento assíncrono para geocodificação em lote.
- **Roteamento/TSP:** para volumes pequenos (< 25 pontos), Google Directions API resolve direto; para volumes maiores, considerar OSRM ou VROOM self-hosted para evitar custo por chamada em escala.
- **Frontend:** React + biblioteca de mapas (Mapbox GL JS ou Google Maps JS API) + drag-and-drop (dnd-kit ou react-beautiful-dnd).
- **Fila/Cache:** Redis para cache de buscas (RN06) e controle de rate limit (RN05).

**Risco técnico principal:** custo de API em escala. Rotas otimizadas via provedores comerciais (Google Route Optimization API) têm preço significativamente mais alto que busca simples de lugares — validar volume esperado de uso antes de decidir entre solução paga gerenciada vs. motor open-source self-hosted.

---

## 8. Fora de Escopo (nesta versão)

Para manter o MVP viável, ficam explicitamente fora da primeira versão:
- Múltiplos usuários/times com permissões diferentes (multi-tenant).
- Integração com CRM externo (ex: exportar lead direto pro Pipedrive/HubSpot).
- Agendamento automático de visitas por calendário.

*(Esses itens podem compor uma fase 2, caso o produto valide tração inicial.)*
