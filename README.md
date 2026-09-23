# PolyMarket Bot

> Bot autônomo de trading em mercados preditivos — pesquisa, analisa e executa apostas no Polymarket usando IA.

**Repositório:** [github.com/EnioAguiar/PolyMarket](https://github.com/EnioAguiar/PolyMarket)

---

## O que é?

Bot de trading desenvolvido em TypeScript que opera de forma autônoma no [Polymarket](https://polymarket.com) — a maior plataforma de mercados preditivos do mundo.

O bot monitora mercados em tempo real via WebSocket, coleta evidências de múltiplas fontes (notícias, redes sociais, dados on-chain), usa IA para estimar probabilidades e executa ordens na blockchain (Polygon) quando encontra valor esperado positivo.

---

## Status Atual (setembro/2026)

Projeto ficou parado de **05/jun/2026** até **21/set/2026** (último commit antes da retomada: `93fc1628`), no meio da migração para o **CLOB V2** da Polymarket (V2 foi ao ar em 28/abr/2026, antes da parada). **Retomado em 21/set/2026** — sub-projetos 1 a 5 abaixo documentam o trabalho desta nova fase (correção de carteira/infra/safety, pipeline de research, sinal de whale-signal com monitor ao vivo em produção). Este README substitui a antiga pasta `.planning/` (gerada por um skill de planejamento de sessões anteriores) — o conteúdo relevante foi resumido abaixo antes de apagá-la.

**Progresso por milestone:**

| Milestone | Escopo | Status |
|-----------|--------|--------|
| v1.0 — Monitoring Only | WebSocket, pesquisa multi-fonte, safety module, Telegram, deploy Railway | ✅ Completo (7 fases) |
| v1.1 — Production Betting | Execução real de ordens, pipeline de pesquisa conectado, decisão via IA | ✅ Fase 1 (execução real) fechada 21/set/2026 (ver item 9); fases 2 (pesquisa) e 3 (IA) validadas como sub-projetos 4-5, mas **não conectadas** ao caminho de decisão real por escolha explícita — ver "Módulos parcialmente implementados" |

**Onde exatamente parou:** dentro da Fase 1 (v1.1), os planos `01-01` (setup do client EOA) e `01-02` (slippage/bankroll) foram aplicados, mas o checkpoint final `01-03` — testar uma aposta real pequena e confirmar no Polygonscan — ficou **sem validação** até essa retomada (sem `SUMMARY.md`, sem confirmação humana). Os commits seguintes (`969ad157`…`08d377a9`) foram tentativas de destravar esse teste mexendo em RPC, endereço de contrato e tipo de assinatura, sem sucesso confirmado na época. ✅ **Fechado nesta sessão** (21/set/2026, ver item 9 dos Próximos Passos): ordem real casada (`status: matched`), saldo debitado de verdade.

---

## Decisão de Carteira: MetaMask assina, conta é Deposit Wallet — **`POLY_1271` confirmado on-chain** (não mais hipótese)

**Isso inverte o que a pesquisa da Fase 1 concluiu em 11/mai/2026 — e agora está provado, não só inferido.** Sequência completa desta sessão (21/set/2026):

1. Conectamos a EOA `0x18a658c6...` via MetaMask no polymarket.com — resultado: **conta nova** (`id 9843725`, pseudônimo "Satisfied-Caboose"), endereço `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b`, diferente da EOA que assina.
2. Depósito de teste ($3 via Bridge API) creditou pUSD nessa conta, mas a wallet ainda não estava deployada on-chain (`eth_getCode` vazio) — não dava pra confirmar o formato do proxy ainda.
3. Usuário completou o fluxo "Ativar Negociação" da própria Polymarket (Implantar Carteira → Aprovar tokens) e colocou uma aposta real de teste (~$2, mercado "Bitcoin Up or Down"). Isso forçou o deploy da wallet.
4. **`eth_getCode` em `0xA53EE08...` agora retorna bytecode real.** Decodificado: é um clone BeaconProxy que embute dois endereços — `0x00000000000Fb5C9ADea0298D729A0CB3823Cc07` (o **Deposit Wallet Factory** oficial, [docs.polymarket.com/resources/contracts](https://docs.polymarket.com/resources/contracts)) e `0x18a658c68cb3b21a0730F09703cF42c6E5BfD3cE` (a EOA, como owner). Bate exatamente com a doc ("ERC-1967 BeaconProxy clones", [docs.polymarket.com/trading/deposit-wallets](https://docs.polymarket.com/trading/deposit-wallets)). **Confirmado: é Deposit Wallet, não Proxy Wallet nem Safe.**

**Configuração de código, agora sem ambiguidade:**

| Modo | Signature Type (`@polymarket/clob-client-v2`) | Funder | Situação |
|------|----------------|--------|------------|
| EOA — usado **antes de 21/set/2026** | `SignatureTypeV2.EOA = 0` | Igual ao signer | Errado pra essa conta — confirmado, substituído abaixo |
| **Deposit Wallet — confirmado por bytecode** | `SignatureTypeV2.POLY_1271 = 3` | `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a wallet, não a EOA) | É o que os commits antigos (`d23d8a49`, `a746c7ba`, `ead039d5`) tentaram e abandonaram cedo demais — a decisão de abandonar era a errada. |

**O que não muda:** a chave privada (signer) continua sendo a mesma da EOA `0x18a658c6...`. O que muda é `funderAddress` e `signatureType` em `createClobClient()` (`src/api/clob.ts`).


### ✅ `DEPOSIT_WALLET_ADDRESS` corrigido (21/set/2026)

O valor antigo do `.env` (`0x723b9273D0E7F82e87552A441Fe5772f101488e3`) era a conta do **Google/Magic Link** ("Untidy-Mile", id `7629704`, criada 20/abr/2026) — confirmado via `polymarket.com/api/profile/userData` e via bytecode on-chain (clone EIP-1167 apontando pra `0x44e999d5c2f66ef0861317f9a4805ac2e90aeb4f`, a Proxy Factory da própria Polymarket). Login por Google passa por Magic Link, que gerencia a chave por trás — **não existe private key exportável dali**, o bot nunca teria como assinar por essa conta, e ela estava zerada de qualquer forma. Trocado no `.env` por `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a conta nova, ligada à EOA que o bot já controla) — confirmado como valor atual.

Tentativa de calcular esse endereço via `deriveProxyWallet()` da lib já instalada (`@polymarket/builder-relayer-client`) deu um terceiro endereço (`0xA9a78a08...`) que não bate com nada — confirmado inconclusivo por bug documentado da lib ([Polymarket/rs-clob-client#272](https://github.com/Polymarket/rs-clob-client/issues/272), hash de init code desatualizado). **A fonte de verdade é sempre a API/UI da Polymarket, não cálculo local.**

### ✅ Depósito de teste confirmado (21/set/2026)

Primeira tentativa (`tx 0x5181ea7a...`) foi erro de digitação — `transfer()` mandou $2 pra própria EOA (`from == to`), nada chegou na bridge, só gastou gas. Segunda tentativa (`tx 0x045a9b98...`) foi certa: `$3.00 USDC nativo` da EOA `0x18a658c6...` pro endereço de bridge `0xA493bBBA1B09EBeb78ec6681c8432994de1BcE6e` (obtido via `POST bridge.polymarket.com/deposit`, reconfirmado idêntico numa segunda chamada antes do envio).

**Resultado, checado direto on-chain:** saldo de pUSD (`0xC011a7E1...`) em `0xA53EE08...` = **$3.00 exatos**. O Bridge API converteu automaticamente, sem swap manual, sem chamar `wrap()` na mão.

**Resolvido:** o tipo de proxy ficou confirmado (Deposit Wallet, `POLY_1271`) — ver seção "Decisão de Carteira" acima, com bytecode decodificado.

### Estado real da carteira (confirmado on-chain, 21/set/2026)

Endereço EOA (signer) `0x18a658c68cb3b21a0730F09703cF42c6E5BfD3cE` — endereço da conta (Deposit Wallet) `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b`:

| Token | Endereço | EOA (signer) | Conta (`0xA53EE08...`) |
|-------|----------|---------------|--------------------------|
| POL (gas) | nativo | ~7.09 (caiu de 7.14, mas só por causa das 2 transferências de USDC — `0.0459 POL` de gas, bate exato: `0xc6d3×0x5c99792d26 + 0x13127×0x4c8ba21c6a = 0.045926 POL`. Deploy da wallet + aprovação de tokens **foram gasless via Relayer** — nonce da EOA parou em 3, sem transação extra pra isso) | 0 |
| USDC.e | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | 0 | 0 |
| USDC nativo (Circle) | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | **≈ 6.21** | 0 |
| pUSD | `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` | 0 | **$2.26** (confirmado ao vivo — a posição "Bitcoin Up or Down" resolveu e pagou $3.28, depois $1 foi usado numa ordem real casada no mercado do Fed) |
| Posição | mercado "Will the Fed increase interest rates by 25 bps after the October 2026 meeting?" | — | **aberta** — 1 share, `status: matched`, `orderID 0x2dafd698...`, `txHash 0x622f0a66...`, vencimento em ~36 dias |


**Correção sobre a pesquisa da Fase 1:** o endereço de "USDC nativo" que ela recomendava (`0x3c499c542cEF5E6931f0FE6561f6c0D3EaB0f85D`) **não existe como contrato na Polygon** (`eth_getCode` retorna vazio, confirmado em duas RPCs) — a IA antiga alucinou os últimos bytes do endereço (mesmo prefixo `0x3c499c542cEF5E...`, sufixo inventado). O endereço certo do USDC nativo da Circle é `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`, confirmado on-chain com o saldo real acima.

### Moeda aceita: pUSD — mas o caminho oficial de depósito aceita USDC nativo direto

Duas camadas diferentes, não confundir:

- **Contrato on-chain** (`CollateralOnramp.wrap()`, [docs.polymarket.com/concepts/pusd](https://docs.polymarket.com/concepts/pusd)): só aceita **USDC.e** como `_asset`. Chamar isso direto com USDC nativo reverte.
- **Bridge API oficial** (`bridge.polymarket.com`, [docs.polymarket.com/trading/bridge/deposit](https://docs.polymarket.com/trading/bridge/deposit)): "**You can deposit either USDC (native) or USDC.e (bridged)** as the source asset... wrapped into pUSD via the Collateral Onramp" — aceita os dois, inclusive na própria Polygon (`chainId 137`, mínimo **$2**, [supported-assets](https://docs.polymarket.com/trading/bridge/supported-assets)). Nossos ~$6.21 em USDC nativo (ver tabela acima) passam tranquilo no mínimo.

**Conclusão prática:** não precisa fazer swap manual em DEX (QuickSwap/Uniswap) pra converter USDC nativo → USDC.e antes — isso seria gastar em slippage numa quantia pequena à toa. O caminho certo é: `POST bridge.polymarket.com/deposit` com o endereço da carteira → pegar o bridge address tipo `evm` → mandar os USDC nativo (já na Polygon) pra esse endereço → a Polymarket converte e credita pUSD automaticamente. É um passo único de depósito, não algo que o bot precisa fazer a cada ciclo.

**✅ Corrigido (21/set/2026, sub-projeto 1):** a constante `PUSD_ADDRESS` em `src/api/clob.ts` foi corrigida pra `0xC011a7E1...` (pUSD real, não mais `0x2791...` USDC.e) e a função foi renomeada de `getUSDCBalance()` pra `getPUSDBalance()` — confirmado ao vivo retornando `3.28066`, batendo exato com `getBalanceAllowance()` (ver item 3 dos Próximos Passos).

---

## Elegibilidade Geográfica (Geoblock) — Brasil

Confirmado em [docs.polymarket.com/api-reference/geoblock](https://docs.polymarket.com/api-reference/geoblock) (endpoint `GET https://polymarket.com/api/geoblock`, checa IP de origem):

| Nível | O que bloqueia | Países |
|-------|-----------------|--------|
| Block completely (frontend + API) | Nenhuma ordem nova, nem fechar posição existente | Só sancionados OFAC: Irã, Síria, Cuba, Coreia do Norte, Crimeia/Donetsk/Luhansk |
| **Close-only (frontend + API)** | **Fecha posição existente, mas não abre nova** | **Brasil está aqui**, junto com EUA, Reino Unido, Alemanha, França, Rússia, Austrália, Canadá (algumas províncias) e outros ~30 países |
| Close-only (só frontend) | API não é restringida | Irlanda, Japão, Países Baixos, Coreia do Sul, Malta (esportes) |

**Implicação direta:** IP brasileiro **não abre ordem nova nem pelo site nem pela API** — não é "site bloqueado, API livre". Rodar o bot a partir de uma casa/IP residencial no Brasil não funcionaria de jeito nenhum pra abrir posição, mesmo batendo direto na API.

**Por que rodar num servidor cloud não resolve sozinho:** o geoblock verifica o IP de origem da requisição, não a nacionalidade do dono da carteira — mas **EUA está no mesmo tier de bloqueio que o Brasil** (close-only frontend+API), então um deploy Railway numa região US seria tão bloqueado quanto uma casa no Brasil. Servidores primários da Polymarket ficam em `eu-west-2`; a doc cita `eu-west-1` (Irlanda) como "closest non-georestricted region" — Irlanda está só no tier close-only-frontend (API livre). `railway.json`/`railpack.json` não fixam região no repo (é configurado no dashboard do Railway, fora do código) — **região atual não confirmada**. Isso é resolvido pelo proxy já usado no projeto — `proxy-agent`/`socks-proxy-agent` no `package.json` (`global-agent` estava listado ali antes, mas era incompatível com SOCKS5 e foi removido no sub-projeto 2, ver item 4 dos Próximos Passos e `docs/superpowers/plans/2026-09-21-infra-resilience.md`) — essa é a mitigação real, não a região do Railway em si.

**Risco fechado (21/set/2026, alerta Telegram fechado em 22/set/2026, sub-projeto 3):** `src/api/geoblock.ts` checa `/api/geoblock` no startup e desliga o trading real (`createClobClient()` inalcançável) se `blocked: true`, usando o mesmo caminho de proxy que o resto do tráfego de trading. Testado ao vivo: `{"blocked":false,"country":"IN","region":"MH"}`, confirmando que o guard enxerga o egress real via proxy. Alerta via Telegram adicionado no sub-projeto 3 — o processo continua rodando de propósito em modo degradado (bankroll 0), não aborta, mas agora notifica. Ver item 6 dos Próximos Passos e `docs/superpowers/plans/2026-09-21-infra-resilience.md`.

---

## Como funciona

```
WebSocket Polymarket
        │
        ▼
  Novo mercado detectado
        │
        ▼
  Research (coleta de evidências)
  ├── Google News
  ├── Twitter / X
  ├── Reddit
  ├── NewsData.io
  ├── Binance (dados de preço)
  ├── CoinGecko
  └── Crawl4AI (web scraping)
        │
        ▼
  Inferência Bayesiana (estimativa de probabilidade)
        │
        ▼
  AI Chain (TypeSafe/Jev — raciocínio com chain-of-thought)
        │
        ▼
  Safety Module (verificações de risco)
  ├── Tamanho máximo de posição (10% do bankroll)
  ├── Limite de perda diária (5%)
  └── Kill switch por drawdown (15%)
        │
        ▼
  Execução via CLOB API v2 (Polygon / USDC → pUSD)
```

> **Atenção:** o Research (fontes) e o AI Chain (TypeSafe/Jev) existem no código mas **não estão conectados** ao caminho de execução principal (`src/index.ts`). Hoje o bot decide só por preço/liquidez. Ver "Módulos parcialmente implementados" abaixo.

---

## Funcionalidades

- **Modo event-driven** — reage a novos mercados em tempo real via WebSocket, sem polling
- **Research multi-fonte** — agrega sinais de notícias, redes sociais e dados de mercado (implementado, não conectado — ver acima)
- **Inferência Bayesiana** — calcula probabilidade posterior ponderando cada fonte por confiança e relevância
- **AI Chain** — usa TypeSafe/Jev com chain-of-thought para gerar e validar estimativas
- **Gestão de ciclo** — limita a 3 apostas por ciclo com pausa de 24h após o fechamento
- **Safety Module** — três camadas de controle de risco (posição, perda diária, drawdown) — **bugs de wiring corrigidos no sub-projeto 3, ver Problemas Conhecidos**
- **Modo Dry Run** — loga todas as decisões sem executar trades reais
- **Controle via Telegram** — pause, retome e monitore o bot por mensagens no Telegram
- **Health check HTTP** — endpoint `/health` e `/debug` para monitoramento em produção
- **Persistência local** — SQLite com Drizzle ORM para estado de apostas e histórico

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | TypeScript 5.x (Node.js ≥ 20.10) + Python 3.13 (scrapers) |
| Blockchain | Polygon (chainId 137) |
| Exchange API | Polymarket CLOB API **V2** (`https://clob.polymarket.com`, desde 28/abr/2026) |
| SDK | `@polymarket/clob-client-v2` `^1.1.0` — atualizado nesta sessão (era `1.0.3-canary.0`) |
| WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` (mercados em tempo real) |
| IA | TypeSafe/Jev (`src/ai/jev.ts`, substitui MiniMax — decisão tomada no sub-projeto 4, 22/set/2026; só usado pelo pipeline de research, não conectado ao caminho de decisão de trading) |
| Banco de dados | SQLite (`better-sqlite3`) + Drizzle ORM |
| Deploy | Railway (`railpack.json` / `railway.json`, volume persistente em `/data`) |
| Logging | Pino |
| Telegram | Telegraf 4.16.3 |

---

## Módulos Principais

```
src/
├── index.ts          # Entry point PRINCIPAL — servidor HTTP + WebSocket + ciclo event-driven
├── whale-monitor/    # Serviço Railway SEPARADO (23/set/2026) — coleta ao vivo do sinal "carteira nova/dormente aposta alto", grava em src/db (whale_bets), NÃO conectado ao bot de trading — ver "Sub-projeto 5"
├── ai/               # jev.ts (TypeSafe/Jev) — usado só por research/strategies/ (sentiment.ts, tail-end.ts), por sua vez só chamado por scripts/validate-research.ts; whale-monitor NÃO usa IA. minimax.ts/chain.ts/validation.ts foram removidos (código morto, sub-projeto de limpeza)
├── research/         # 8+ fontes de research (news, social, cripto, scraping) + whale-signal.ts (sinal de "copy trading") — implementado, não conectado ao trading real
├── bankroll/         # Kelly criterion sizing — implementado, não conectado (safety/position-limits.ts é o usado)
├── betting/          # CycleManager (3 apostas/ciclo, espera 24h), MarketMutex (dedup por market ID)
├── execution/        # Slippage (10% máx), arbitragem, re-export das funções de ordem do CLOB
├── safety/           # 3 camadas de risco: posição (BANK-01), perda diária (BANK-02), drawdown (BANK-03)
├── api/              # Clientes: clob.ts (CLOB V2), polymarket.ts (Gamma REST), http.ts (RPC Polygon), telegram.ts
├── websocket/        # Client WS, EventRouter, SubscriptionManager
├── db/               # Schema SQLite via Drizzle: source_ratings/source_feeds/research_results (nunca usados pelo fluxo principal) + whale_bets (usado pelo whale-monitor, sub-projeto 5)
├── logging/          # Wrapper Pino (getLogger)
├── types/            # Tipos compartilhados (SafetyState, etc.)
└── config/           # Carregamento de config.yaml
```

### Módulos parcialmente implementados (existem, não estão no caminho de execução)

- `src/research/` — agregador multi-fonte completo, nunca chamado por `index.ts` (o bot de trading real)
- `src/ai/` — cliente Jev completo, nunca chamado por `index.ts`
- `src/bankroll/` — Kelly criterion, nunca chamado (usa `safety/position-limits.ts` em vez disso)
- `src/db/` — tabelas `source_ratings`/`source_feeds`/`research_results` definidas, nunca escritas/lidas pelo fluxo principal. A tabela `whale_bets` **é** ativamente escrita/lida, mas só pelo `src/whale-monitor/` (serviço Railway separado) — não pelo bot de trading.
- `src/whale-monitor/` — serviço completo e rodando em produção (Railway, serviço próprio), mas só coleta dado — não decide nem executa nada no bot de trading.

---

## Integrações Externas

| Integração | Endpoint / Pacote | Auth |
|------------|--------------------|------|
| Gamma REST (listagem de mercados) | `https://gamma-api.polymarket.com/markets` | pública |
| CLOB REST (ordens) | `https://clob.polymarket.com`, `@polymarket/clob-client-v2` | L2 ECDSA via `PRIVATE_KEY` |
| CLOB WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | pública |
| RPC Polygon | `viem` `fallback()` sobre `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org` (verificados ao vivo), override do primeiro via `POLYGON_RPC_URL` | — |
| TypeSafe/Jev (IA de julgamento) | `https://api.typesafe.ai/v1/systemone` | Bearer `TYPESAFE_API_KEY` |
| Polymarket Data API v2 (posições, trades, leaderboard — usado pelo whale-monitor) | `https://data-api.polymarket.com/v2` | pública, sem chave |
| Google News RSS (sentimento de notícia) | `https://news.google.com/rss/search` | pública, sem chave |
| NewsData.io / Google CSE / CoinGecko / Binance WS / API-Football | ver `.env.example` | chaves opcionais por fonte |
| Twitter (Tweepy) / Reddit (PRAW) / Crawl4AI | subprocessos Python (`scripts/*.py`) | credenciais opcionais |
| Telegram | Telegraf | Bearer `TELEGRAM_BOT_TOKEN` |

---

## Testes

`npm test` (Vitest). Cobertura atual:

| Coberto | Não coberto (risco) |
|---------|----------------------|
| `execution/arbitrage.ts`, `execution/slippage.ts`, `bankroll/position-sizing.ts`, `research/` (social, classify, google-news-rss, crawl4ai, strategies sentiment/tail-end/resolution-sniping), `ai/jev.ts`, `api/clob.ts` (`getFunderAddress()`), `safety/daily-loss.ts` + `safety/index.ts` (via `market-resolution.test.ts`, mockando `api/clob.ts`), `safety/persistence.ts`, `betting/index.ts` (CycleManager, via o mesmo teste) | `safety/position-limits.ts` e `safety/drawdown.ts` isolados (só cobertos indiretamente), `betting/mutex.ts`, `websocket/`, `api/clob.ts` (envio real de ordem), `api/telegram.ts`, `index.ts`, `whale-monitor/`, `research/whale-signal.ts` |

Sem CI configurado — testes não rodam automaticamente em push.

---

## Configuração

Parâmetros de trading/safety ficam em `config.yaml`; segredos, endpoints e credenciais vêm de variáveis de ambiente (ver seção abaixo) — as duas coexistem, não é "tudo num lugar só":

```yaml
dryRun: true  # true = sem trades reais (DEFAULT REAL COMMITADO, corrigido no sub-projeto 3). Precisa ser
              # explicitamente setado pra false pra operar com dinheiro real — nunca commitar false como default.
polymarket:
  host: https://clob.polymarket.com
  chainId: 137

safety:
  maxPositionSizePct: 0.10    # 10% do bankroll por aposta
  dailyLossLimitPct: 0.05     # 5% de perda diária máxima
  drawdownKillSwitchPct: 0.15 # Kill switch com 15% de drawdown total
```

Variáveis de ambiente necessárias (bot de trading):

```
PRIVATE_KEY           # Chave privada da carteira MetaMask (EOA) na Polygon
DEPOSIT_WALLET_ADDRESS  # OBRIGATÓRIA — endereço da Deposit Wallet (funder, POLY_1271), ex. 0xA53EE08...;
                        # src/api/clob.ts lança erro no startup se faltar
TELEGRAM_BOT_TOKEN    # Token do bot Telegram (opcional)
TELEGRAM_CHAT_ID      # Chat que recebe notificações (status/erro/aposta/geoblock) — sem ela, toda
                       # notificação falha silenciosamente (opcional, mas recomendada)
POLYMARKET_PROXY_URL  # Proxy socks5h:// — necessário pra passar no geoblock a partir do Brasil
TYPESAFE_API_KEY      # Chave da API de IA (Jev) — só usada pelo pipeline de research, não pelo trading real
POLYGON_RPC_URL       # opcional — sobrepõe o primeiro RPC da lista de fallback
SAFETY_STATE_FILE     # opcional — default data/safety-state.json; no Railway apontar pro volume: /data/safety-state.json
TEST_EXECUTION        # opcional — flag de teste, ver src/index.ts
PORT                  # opcional — porta do servidor HTTP, Railway injeta automaticamente
```

Chaves opcionais do pipeline de research (news/social/cripto, não conectado ao trading real): ver bloco "Research APIs" completo em `.env.example`.

Variáveis de ambiente adicionais do `src/whale-monitor/` (serviço Railway separado, ver Sub-projeto 5):

```
POLYMARKET_PROXY_URL  # mesmo proxy do bot, evita rate-limit por IP compartilhado do Railway
MONITOR_TOKEN         # opcional — protege /stats e /download com ?token=
DB_PATH               # opcional — default /data/polymarket.db (mesmo default do bot, mas serviços separados = volumes separados; recomendo setar explícito, ex. /data/whale-monitor.db, pra evitar confusão)
MIN_BET_USD           # opcional — default 20000
RAILPACK_CONFIG_FILE  # OBRIGATÓRIO nesse serviço = railpack.whale-monitor.json, senão herda o deploy do bot de trading
```

---

## Rodando Localmente

```sh
# Instalar dependências
npm install

# Desenvolvimento (bot de trading, sem watch/hot reload — reinicie manualmente após editar)
npm run dev

# Build para produção (compila src/ inteiro, inclusive whale-monitor/)
npm run build

# Iniciar bot de trading em produção
npm start

# Iniciar whale-monitor localmente (após build) — ver Sub-projeto 5
npm run whale-monitor

# Scripts de validação/backtest (research signal e whale signal) — não fazem parte do runtime
npm run validate-research
npm run validate-whale-signal
```

**Modo Dry Run:** defina `dryRun: true` em `config.yaml` para testar sem executar trades reais.

---

## Deploy (Railway)

O bot roda continuamente no Railway em modo event-driven:

1. Conecta ao WebSocket do Polymarket ao iniciar
2. Permanece ativo aguardando eventos de novos mercados
3. Processa cada mercado de forma assíncrona com mutex por market ID
4. Exponha `/health` para health check do Railway

**Dois serviços Railway a partir do mesmo repositório** (ver Sub-projeto 5): o bot de trading (`railpack.json`, sem `RAILPACK_CONFIG_FILE`) e o `whale-monitor` (`railpack.whale-monitor.json`, via `RAILPACK_CONFIG_FILE=railpack.whale-monitor.json`). `railway.json` (healthcheck `/health`, volume `polymarket-data` em `/data`) é compartilhado — os dois serviços expõem `/health` e podem usar o mesmo volume (desde que `DB_PATH`/`SAFETY_STATE_FILE` apontem pra arquivos diferentes dentro dele).

---

## Problemas Conhecidos (histórico — maioria corrigida no sub-projeto 3)

Levantados na sessão de trabalho de 21/set/2026; a maioria foi corrigida na mesma sessão (marcados ✅ abaixo, com commit). Mantidos aqui como registro do que estava quebrado antes:


- ~~**`/pause` do Telegram funciona pela metade** — seta `isPaused = true` (que É checado antes de avaliar `new_market`, então bloqueia apostas novas), mas a linha seguinte chama `safetyModuleRef.forceKillSwitch(true)`, método que não existe em `SafetyModule` (`src/api/telegram.ts:122`) — isso quebra a execução do handler, o usuário nunca recebe a confirmação "⏸️ Bot paused", e nenhum estado do Safety Module é realmente afetado (o kill switch de verdade é `isKillSwitchActive()`/`resetKillSwitch()`, nunca tocado por esse comando)~~ ✅ **corrigido no sub-projeto 3** (commit `c9368cd2`) — removida a chamada a `forceKillSwitch()` (método inexistente); `/pause`/`/resume` agora só setam `isPaused` e respondem normalmente, sem crashar.
- ~~**Mutex de mercado vaza SEMPRE, não só no erro** — `evaluateMarketForWebSocket()` é chamado sem `await` (`src/index.ts:130`); o único lugar que libera o lock é `CycleManager.resolveBet()`, que exige achar a aposta em `state.bets` — e `state.bets` fica vazio pra sempre porque **`cycleManager.addBet()` nunca é chamado em lugar nenhum do código** (confirmado por grep, zero callers). Resultado: todo mercado avaliado uma vez fica travado pra sempre — nunca reavaliado — e **o limite de 3 apostas por ciclo + pausa de 24h também nunca funcionou** (`canAcceptBet()` checa `state.bets.length >= 3`, que nunca é verdade)~~ ✅ **corrigido no sub-projeto 3** (commit `5f06351b`) — `evaluateMarketForWebSocket()` agora chama `cycleManager.addBet()` no path de sucesso e libera o lock via `try/finally` em todo outro caminho de saída (sem liquidez, safety check falhou, dry run, ordem rejeitada, etc.); o limite de 3 apostas por ciclo + pausa de 24h volta a funcionar de verdade.
- ~~**`recordTrade()` também nunca é chamado** → limite de perda diária e kill switch de drawdown do Safety Module são código morto, nunca disparam de verdade. Combinado com o item acima: **nenhuma das três camadas de proteção (ciclo, perda diária, drawdown) jamais recebeu o resultado de uma aposta de volta** — o bot apostaria sem limite nenhum em produção~~ ✅ **corrigido no sub-projeto 3** (commit `5f06351b`) — `handleMarketResolved()` agora calcula o PnL real e chama `resolveBet()` + `recordTrade()`; as três camadas de proteção (ciclo, perda diária, drawdown) recebem o resultado de cada aposta de volta. Achado adicional no mesmo commit, corrigido junto: `recordLoss()` acumulava `dailyLoss` com sinal errado (positivo) enquanto `checkDailyLoss()` comparava contra um limite negativo — o limite de perda diária era matematicamente incapaz de disparar mesmo depois de conectado.
- ~~**Nenhuma checagem de saldo antes de submeter ordem**, nenhuma confirmação on-chain do `txHash` depois~~ ✅ **corrigido no sub-projeto 3** (commit `9a823386`) — `placeMarketOrder()`/`placeLimitOrder()` agora checam o saldo pUSD antes de qualquer chamada de rede e aguardam confirmação on-chain (`waitForTransactionReceipt`) antes de reportar sucesso. Verificado ao vivo: tentativa de ordem acima do saldo real (2.25716 pUSD) rejeitada com `{"success":false,"reason":"Insufficient balance..."}` antes de qualquer chamada ao CLOB.
- ~~**`config.yaml` commitado com `dryRun: false`** — clone novo + `PRIVATE_KEY` setado = trade real imediato~~ ✅ **corrigido no sub-projeto 3** (commit `1b1a7f8a`) — default trocado pra `dryRun: true`; precisa ser explicitamente setado `false` pra operar com dinheiro real.
- **Safety module é pulado inteiro em dry-run** (`checkBet()` retorna sempre `passed: true`) — bugs de safety ficam escondidos até ir pra produção. **Comportamento intencional, não é um bug** — o sub-projeto 3 (`docs/superpowers/plans/2026-09-21-safety-module-correctness.md`) corrigiu o wiring/persistência do Safety Module mas não alterou esse comportamento de propósito; continua em aberto.
- ~~Estado de safety (perda diária, drawdown, cycle) é só em memória — reinício do bot zera os contadores de proteção~~ ✅ **corrigido no sub-projeto 3** (commit `92890f95`) — persistido em `data/safety-state.json` (`dailyLoss`, `totalDrawdown`, `isKillSwitchActive`, `peakBankroll`), recarregado no startup e salvo a cada `recordTrade()`/`resetKillSwitch()`. **Limitação conhecida**: sobrevive a um restart do mesmo container, mas não necessariamente a um novo deploy no Railway — `railway.json` declara um volume (`polymarket-data` montado em `/data`), porém o path default do código é relativo (`data/safety-state.json`, resolvido a partir do `cwd` do processo — não `/data`) e nenhum arquivo deste repo seta a env var `SAFETY_STATE_FILE` pra apontar pro volume montado. A menos que isso seja configurado manualmente no serviço Railway (não verificável a partir do repo), o arquivo de estado provavelmente cai fora do volume, e um redeploy ainda zera os contadores de proteção.
- ~~RPC fallback list em `src/api/http.ts` está 2/3 morta~~ ✅ **corrigido no sub-projeto 2** (commit `1944b4bf`) — lista trocada por `fallback()` real sobre 3 URLs verificadas.
- ~~**Guard de geoblock não alerta nem aborta** — desliga trading real e loga erro, mas não manda Telegram nem encerra o processo; achado durante o sub-projeto 2 (21/set/2026), ver item 6 dos Próximos Passos~~ ✅ **corrigido no sub-projeto 3** (commit `1b1a7f8a`) — `notifyError(...)` agora dispara um alerta via Telegram quando `geoblock.blocked === true`, antes de setar `geoblocked = true`. O comportamento de desligar o trading real e continuar rodando (sem abortar o processo) foi mantido de propósito.
- ~~**`handleMarketResolved()` registrava toda aposta vencedora como perda total** — comparava `bet.side` (`'YES'`, hardcoded maiúsculo) contra `winningOutcome` vindo cru da API real da Polymarket, que manda `"Yes"`/`"No"` (title case) — `'YES' === 'Yes'` é `false` em JS, então `won` nunca era `true` numa aposta real vencedora, `pnl` saía negativo mesmo quando o saldo subia, e isso envenenava o contador de perda diária com prejuízo falso a cada vitória. Achado só na **revisão final de toda a branch** do sub-projeto 3 (nenhuma das 6 revisões por task pegou, porque o teste novo usava a mesma casing errada no mock, mascarando o bug)~~ ✅ **corrigido** (commit `bfbdd4ca`, refinado em `d0710558`+`11d09ae5`): primeiro fix comparou por string case-insensitive; refinamento final compara por `assetId` exato (`bet.assetId === winningAssetId`, usando o campo `winning_asset_id` que a Polymarket já manda no evento), com a comparação de string como fallback só se o asset ID vier vazio — identidade exata em vez de adivinhação por rótulo. Testes fixam que a comparação por ID tem prioridade de verdade (casos onde ID e string discordam de propósito).

O arquivo original (severidade média/baixa incluída) continua no histórico do git, não precisa reproduzir manualmente: `git show 93fc1628:.planning/codebase/CONCERNS.md`

## Sub-projeto 4: Sistema de Sinal de Pesquisa (Research Signal System) — validado, resultado honesto: sem edge em limiar de preço; pra evento genuíno, achamos vazamento real, não um "sim" ou "não"

Sessão de 22/set/2026, plano `docs/superpowers/plans/2026-09-22-research-signal-system.md`, implementado via subagent-driven-development (9 tasks). Objetivo explícito do usuário: responder de verdade "esse sinal de pesquisa presta pra alguma coisa?", não construir uma feature e assumir que sim.

**O que foi construído:**

- **3 estratégias de research** (`src/research/strategies/`): `sentiment` (pergunta a IA se a resposta é YES/NO com base em notícias reais), `tail_end` (mercados quase resolvidos, calcula confiança implícita a partir do preço), `resolution_sniping` (compara preço à vista real na Binance contra o preço implícito do mercado, pra mercados de limiar cripto).
- **Fontes de dados reais, sem mock**: Google News RSS (`src/research/sources/google-news-rss.ts`, com filtro `beforeDate` pra evitar vazamento de informação futura no backtest), Crawl4AI via subprocesso Python (`src/research/crawl4ai.ts`, texto completo do artigo quando o site permite), Binance (preço à vista pros mercados de limiar).
- **IA de julgamento**: TypeSafe/Jev (`src/ai/jev.ts`) — a decisão de provider de IA que estava em aberto no item 10 dos Próximos Passos (ver abaixo) foi tomada nesta sessão. `TYPESAFE_API_KEY` está no `.env`, veio do login local do TypeSafe desta sessão, confirmado funcionando ao vivo, com retry automático em erro 5xx transitório (`529 system_overloaded`, achado ao vivo) adicionado depois.
- **Script de validação com dados reais** (`scripts/validate-research.ts`): roda as 3 estratégias contra mercados reais da Gamma API — mercados abertos (qualitativo) e mercados já resolvidos (backtest quantitativo, com guarda de vazamento de data).

**Resultado real do backtest — 4 rodadas ao todo, cada uma com sua própria amostra da Gamma API, números reportados separados, não misturados:**

**Rodada 1 (fechamento do Task 8)** — 100 mercados resolvidos, 47 pares Yes/No genuínos (39 com artigo real encontrado antes do `beforeDate`, 8 sem nenhum): **14/39 corretos (35,9%)** nos que tinham sinal, abaixo do acaso. 26/115 artigos (22,6%) com texto completo.

**Rodada 2 (follow-up, achou e corrigiu um bug real no classificador)** — outros 100 mercados resolvidos (a janela "100 mais recentes por id" da Gamma se move), 43 pares Yes/No: **12/34 corretos (35,3%)**, abaixo do acaso. No caminho, achamos que `extractCryptoThreshold()` (classificador do Task 1) exigia um `$` literal antes do número, mas a formulação real da Polymarket pra mercados de curtíssimo prazo omite o cifrão (`"Ethereum above 2,670 on September 22, 3PM ET?"`, sem `$`) — o classificador falhava silenciosamente. Corrigido em `src/research/classify.ts` pra aceitar número puro com separador de milhar (`2,670`, `88,200`), com teste negativo garantindo que um ano solto (`2027`) não é tratado como preço.

**Rodada 3 (follow-up, tentativa de ampliar por paginação)** — um revisor apontou, corretamente, que as rodadas 1 e 2 pareciam ser 100% perguntas de limiar de preço (cripto e ações/commodities), sem nenhum evento genuíno (eleição, aprovação, evento geopolítico). Ampliamos a busca pra 500 mercados resolvidos **na mesma janela "mais recentes por id"** (5 páginas via paginação nova em `fetchMarkets`). Resultado: ainda mais do mesmo — a janela consultada dessa forma (id decrescente) é inteiramente dominada por limiar de preço de curto prazo, sem nenhum evento genuíno:
  - **Limiar de preço cripto (BTC/ETH), n=123: 49/123 corretos (39,8%)**, cobrindo só **5 timestamps de vencimento distintos** — cada ladder de 10-15 strikes no mesmo horário é uma correlação forte do mesmo caminho de preço, não 123 tentativas independentes.
  - **Outros limiares de preço (ações/commodities/índices), n=16: 2/16 corretos (12,5%)**, 5 timestamps distintos — amostra pequena, ruído estatístico alto.
  - **Nenhum dos dois buckets é estatisticamente distinguível de 50% de acaso puro** com esse tamanho de amostra.
  - **Zero mercados de evento genuíno** apareceram mesmo ampliando 5x — a rodada rodou 20 minutos e não terminou (timeout do script), processou 176 dos ~215 esperados; conclusão: **paginar por id não é a alavanca certa** pra achar evento genuíno, é só mais do mesmo tipo de mercado.

**Rodada 4 (follow-up, achou a alavanca certa — e um achado mais sério que qualquer número de acerto)** — testamos ao vivo ordenar por `volumeNum` (volume negociado) em vez de por id, e **isso sim trouxe evento genuíno de verdade**: "Will Donald Trump win the 2024 US Presidential Election?", "Fed decreases interest rates by 50+ bps after January 2026 meeting?", "US forces enter Iran by April 30?", etc. — mercados de altíssimo volume são estruturalmente diferentes dos limiares de preço de baixo volume (~$15-51 nas ladders cripto vs centenas de milhões nesses). 200 mercados buscados, 187 pares Yes/No avaliados. **Resultado bruto: 160/187 (85,6%)** — muito acima do acaso.

**Esse número não é confiável e não deve ser usado.** Investigando os artigos reais usados pra julgar, achamos vazamento de informação confirmado e sistemático: pra mercados de evento genuíno, o `resolveDate` da Polymarket representa quando o **contrato fecha administrativamente**, não quando o **resultado do mundo real ficou conhecido** — e esses dois momentos podem estar dias ou semanas separados. Exemplo real, direto do log: o mercado "Will Kamala Harris win the 2024 Democratic Presidential Nomination?" (`resolveDate` 19/ago/2024) foi julgado com a manchete real **"It's official: Kamala Harris becomes Democrats' 2024 presidential nominee"** (p=0,97) — a indicação já tinha acontecido e sido noticiada antes da data de corte que usamos, então a IA não previu nada, só leu a resposta de volta. O mesmo padrão apareceu em outros mercados (inauguração, final de campeonato, resultado de guerra). **Isso não é um bug de parsing de data — é uma limitação real da abordagem**: o filtro `before:` (tanto o operador de busca do Google quanto nosso filtro defensivo em `google-news-rss.ts`) só protege contra vazamento quando `resolveDate` é genuinamente próximo do momento real do evento (verdade pros limiares de cripto de hora em hora, falso pra a maioria dos mercados de evento administrativamente resolvidos). Documentado no código (`google-news-rss.ts`, `scripts/validate-research.ts`) com aviso explícito pra nenhuma sessão futura reportar esse número por engano.

**Leitura honesta e final, juntando as 4 rodadas:** o pipeline mecânico funciona de ponta a ponta em dados reais — busca de notícia real, julgamento real via Jev, preço real, backtest real. **Duas perguntas diferentes, dois resultados diferentes:**
1. **Contra limiar de preço de curto prazo (cripto e ações/commodities)**: sentimento de notícia não bate o acaso de forma consistente (35-40% nas 3 primeiras rodadas) — o que nem é surpreendente, essas perguntas resolvem por movimento técnico, não notícia. Essa parte está validada com razoável confiança.
2. **Contra evento genuíno**: **ainda não temos uma resposta válida.** Achamos a amostra certa (ordenar por volume), mas a metodologia de backtest (`before: resolveDate`) é estruturalmente inválida pra esse tipo de mercado — qualquer número que ela produzir mede vazamento, não previsão. Responder essa pergunta de verdade exigiria uma data de corte com margem real antes do `resolveDate` (quanto tempo antes varia por tipo de mercado, não é um número universal) ou uma fonte de notícia com timestamp histórico verificado — nenhum dos dois foi implementado nesta sessão.

Não é vitória disfarçada de fracasso nem fracasso disfarçado de vitória — é um limite metodológico real e nomeado, achado através de checagem manual de evidência (não assumido), exatamente o tipo de coisa que essa validação existia pra descobrir.

**Nada disso está conectado ao trading real.** Por instrução explícita do dono do projeto no início desta sessão, este sub-projeto inteiro é só validação — o bot em produção continua decidindo apenas por preço/liquidez (`src/index.ts`, `src/websocket/integration.ts`, `src/betting/`, `src/safety/` e `src/api/clob.ts` não foram tocados por nenhuma task deste sub-projeto). Ver "Módulos parcialmente implementados" acima e item 10 dos Próximos Passos.

---

## Sub-projeto 5: Sinal de "Carteira Nova/Dormente" (Copy Trading) — validado com edge real, monitor ao vivo rodando em produção separada

Sessão de 22-23/set/2026. Motivação: o sub-projeto 4 (sentimento de notícia) não achou edge — o usuário propôs uma hipótese alternativa e mais simples: **uma carteira desconhecida ou dormente que de repente aposta alto é, por si só, um sinal** (o tipo de coisa que comunidades de whale-watching cripto chamam de "sleeper wallet" — faz sentido que quem tem informação real evite reputação pública e use carteira nova pra se esconder).

**Base técnica**: a Polymarket expõe uma API pública, sem autenticação (`data-api.polymarket.com/v2`) com posição, histórico de trade e leaderboard de qualquer carteira — achada e explorada nesta sessão, nunca usada antes no projeto.

**Metodologia final** (`src/research/whale-signal.ts`, compartilhado entre o backtest e o monitor ao vivo): pra cada aposta grande (≥$20k) detectada, reconstrói se a carteira era nova (≤3 trades antes) ou dormente (≥14 dias quieta) **no momento exato daquela aposta**, usando só o histórico da própria carteira (fato on-chain, sem risco de vazamento de informação futura — diferente do sub-projeto 4). Pontua por **edge real** (`payout - preço pago`), não por taxa de acerto bruta — apostar a $0,80 e ganhar 80% das vezes é zero de edge, o preço já embutia isso.

**4 rodadas de backtest, cada uma achando e corrigindo um problema real:**

1. Amostra pequena ($100k+, n=28, 22 eventos): **45,8% de ROI** — parecia excelente, mas amostra pequena demais pra confiar.
2. Amostra ampliada ($20k+, n=79): ROI caiu pra **15,4%**, e o bucket de "confronto direto" (que parecia ótimo) virou **-1,0%** — clássica regressão à média de amostra pequena. Achado que quase passou batido: **33% da amostra era o mesmo evento real** (decisão de juros do Fed, fatiada em 4 mercados diferentes) — corrigido com agrupamento por evento real (`eventSlug` da Gamma), não por mercado individual.
3. **Comparação de controle adicionada** (o teste que faltava): será que "carteira nova/dormente" adiciona algo, ou "aposta grande generica" já basta? Resultado real, com amostra grande — **carteira nova/dormente: 11,2% de ROI (n=79, $5,2M apostado) vs carteira estabelecida: 2,2% de ROI (n=2.445, $138,6M apostado)**. O filtro adiciona valor real, ~5x o edge da população geral de apostadores grandes — confirma a hipótese original, não é só "aposta grande é informativa".
4. **Checagem de impacto de preço** (será que dá pra copiar de verdade, ou o edge só existe no preço que a baleia pegou?): testado contra o histórico real de preço em 4 apostas (a tela de negociação real, não um resumo). Em mercados de "quem vai ganhar" pré-jogo, o preço ficou parado por 15-25 minutos depois da entrada — copiar com atraso de minutos captura quase todo o edge. Em mercado ao vivo (e-sports em andamento), o preço se move rápido por causa do jogo real, não da entrada da baleia — WebSocket ajudaria mais aqui especificamente.

**Ressalva de metodologia** (achado durante revisão): apostas a preço $1,00 (certeza total, sem potencial de lucro) entram no denominador do ROI com edge ≈0, empurrando o número agregado pra baixo sem serem nem positivas nem negativas de verdade — não filtradas ainda, então os números de ROI acima incluem esse efeito de diluição.

**Bugs reais achados e corrigidos no caminho** (documentados nos commits): paginação que descartava filtro nas páginas seguintes (fazia parecer que limiar baixo "trava em rajada de mercado", quando era um bug de URL); parâmetro `condition_ids` da Gamma não aceita vírgula, precisa repetir o parâmetro; Gamma exige `closed=true` explícito, senão só retorna mercado aberto; retry com backoff pra erro 5xx transitório da API.

### Monitor ao vivo — rodando em produção, serviço Railway separado

**`src/whale-monitor/`**, deployado em 23/set/2026 como serviço Railway **independente** do bot de trading (mesmo repositório, `railpack.whale-monitor.json` próprio via env var `RAILPACK_CONFIG_FILE` — necessário porque o `railpack.json` da raiz, usado pelo bot, sobrescreveria o comando de start do monitor também). Roda 24/7 sem depender do computador de ninguém:

- **Coleta contínua**: pergunta pro feed de apostas grandes a cada ~20s, classifica cada carteira (novo/dormente vs estabelecida) e salva **os dois grupos** — o grupo de controle precisa continuar crescendo pra comparação continuar valendo.
- **Backfill de resultado**: a cada ~15min, rechecha apostas pendentes contra a Gamma e preenche resultado real + lucro/prejuízo assim que o mercado resolve.
- **Persistência**: SQLite (tabela `whale_bets` em `src/db/schema.ts`), sobrevive a restart/redeploy (paginação de catch-up recupera o que perdeu durante o tempo fora do ar, até 50 páginas de histórico).
- **Acesso aos dados**: `/health` (aberto), `/stats` e `/download` (protegidos por `?token=` opcional via `MONITOR_TOKEN`) — `/download` gera um snapshot consistente (`VACUUM INTO`) antes de servir, não faz stream do arquivo sendo escrito ao vivo.
- **Não aposta nada, não decide nada** — só coleta. Mesma regra do sub-projeto 4: sinal de research fica desconectado do caminho de trading real até decisão explícita em contrário.

**Estado atual**: rodando, acumulando dado real desde 23/set/2026. Próxima decisão (não tomada ainda): esperar volume suficiente (idealmente algumas semanas, centenas de eventos distintos) antes de qualquer análise mais fina (segmentar por categoria, tamanho relativo ao mercado, etc.) — a mesma amostra pequena que gerou o 45,8%→15,4% de regressão à média nesta sessão é exatamente o risco de tentar cortar os dados demais cedo demais.

---

## Próximos Passos (ordem sugerida)

1. ~~Fazer o depósito único via Bridge API~~ ✅ **feito** (21/set/2026): `tx 0x045a9b98...`, $3.00 pUSD confirmados on-chain em `0xA53EE08...`. A aposta de teste resolveu e pagou (chegou a $3.28), e depois esse saldo foi usado pra validar ordem real no item 9 — saldo atual **$2.26 pUSD** (posição de $1 no mercado do Fed, `status: matched`, ver item 9). Restam ~$6.21 em USDC nativo na EOA.
2. ~~Trocar `createClobClient()` de EOA pra Deposit Wallet~~ ✅ **feito e verificado ao vivo** (21/set/2026, `SignatureTypeV2.POLY_1271` + `funderAddress: '0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b'`): `client.getBalanceAllowance()` não dá mais 404 "no deposit wallet found for owner" — retorna saldo real ($3.28) e allowance máxima nos 4 contratos de Exchange. Implementado via subagent-driven-development, plano em `docs/superpowers/plans/2026-09-21-wallet-trading-correctness.md`.
3. ~~Corrigir `getUSDCBalance()`~~ ✅ **feito e verificado ao vivo**: renomeada pra `getPUSDBalance()`, lê pUSD (`0xC011a7E1...`) na Deposit Wallet. Testado ao vivo: retorna `3.28066`, batendo exato com `getBalanceAllowance`.
4. ✅ **Achado crítico (21/set/2026): o bot em produção não usa proxy nenhum — e a correção planejada evoluiu desde a descoberta.** `import 'global-agent/bootstrap'` só existe em `src/main.ts` (legado); `src/index.ts` (o entry real, `npm start` → `dist/index.js`) nunca importa isso. Mas `global-agent` **nem serviria** mesmo se importado no lugar certo: seus agentes internos não implementam handshake SOCKS5 (confirmado lendo o código-fonte), e o proxy do projeto é `socks5h://...`. Substituído por `proxy-agent` no spec do sub-projeto 2 — **já validado ao vivo com ordem real casada** (ver item 9). Detalhe extra achado no meio do teste: setar `HTTP_PROXY`/`HTTPS_PROXY` como env var literal quebra a autenticação do CLOB (axios detecta essas variáveis sozinho e tenta proxy HTTP puro numa URL SOCKS5) — a correção usa uma variável nova, `POLYMARKET_PROXY_URL`, lida explicitamente via `getProxyForUrl`. Spec: `docs/superpowers/specs/2026-09-21-infra-resilience-design.md`. **Implementado e verificado (21/set/2026)** via `docs/superpowers/plans/2026-09-21-infra-resilience.md`: patch de proxy em `src/index.ts`/`src/main.ts` lendo `POLYMARKET_PROXY_URL` (commit `5e1190e9`), guard de geoblock no startup gating `createClobClient()` quando bloqueado (commit `6f95f531`), e RPC fallback real (commit `1944b4bf`). Verificação end-to-end desta sessão: com o patch aplicado, `checkGeoblock()` reporta `{blocked: false, country: 'IN', region: 'MH'}` — confirma que o tráfego passa pelo proxy Decodo configurado, não pelo IP cru do Railway.
5. ~~Trocar a lista de RPC fallback em `src/api/http.ts`~~ ✅ **feito e verificado** (21/set/2026): trocado pelo `fallback()` do viem sobre as URLs que responderam de verdade — `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org` — removendo o default morto `polygon.llamarpc.com` e `rpc.ankr.com` (exige key). Implementado via `docs/superpowers/plans/2026-09-21-infra-resilience.md` (commit `1944b4bf`).
6. ✅ **Guard de geoblock no startup — feito** (21/set/2026, alerta Telegram fechado em 22/set/2026): `src/api/geoblock.ts` checa `GET https://polymarket.com/api/geoblock` via `https.get` (não `fetch` — só assim herda o patch de proxy) antes de `createClobClient()` em `src/index.ts`; se `blocked: true`, a variável `geoblocked` desliga o trading real pelo mesmo caminho `else` que já existia pro `dryRun` — `createClobClient()` fica inalcançável, confirmado por inspeção estática. Testado ao vivo: retornou `{"blocked":false,"country":"IN","region":"MH"}`, confirmando que o guard enxerga o egress real via proxy. Implementado via `docs/superpowers/plans/2026-09-21-infra-resilience.md` (commit `6f95f531`). **Lacuna do Telegram fechada (22/set/2026, sub-projeto 3)**: `notifyError(...)` agora dispara quando `geoblocked === true` (commit `1b1a7f8a`, `docs/superpowers/plans/2026-09-21-safety-module-correctness.md`); o processo continua sem abortar, por design.
7. ~~Atualizar `@polymarket/clob-client-v2`~~ ✅ **feito**: `1.0.3-canary.0` → `1.1.0`. `@polymarket/builder-signing-sdk` removido.
8. ~~Corrigir os bugs críticos do Safety Module listados acima antes de voltar a rodar com `dryRun: false`.~~ ✅ **feito** (22/set/2026) — sub-projeto 3 completo (`docs/superpowers/plans/2026-09-21-safety-module-correctness.md`): wiring de `addBet()`/`recordTrade()` no path real, fix do mutex leak universal, fix do sinal de `dailyLoss`, `/pause`/`/resume` sem crash, checagem de saldo + confirmação on-chain antes de reportar sucesso, `dryRun: true` como default commitado, alerta via Telegram no geoblock, e persistência do safety state em disco (commits `5f06351b`, `f44869da`, `c9368cd2`, `9a823386`, `1b1a7f8a`, `92890f95`). Build limpo e 39/39 testes passando. **Nota**: o skip do safety module inteiro em dry-run (`checkBet()` sempre `passed: true`) é comportamento intencional do modo dry-run, não um bug — não foi alterado por este plano. **Nota 2**: a persistência do safety state tem a ressalva sobre o volume do Railway descrita no item acima (Problemas Conhecidos) — sobrevive a restart do mesmo container, não necessariamente a um redeploy sem `SAFETY_STATE_FILE` apontando pro volume montado.
9. ✅ **Checkpoint de teste real (antigo `01-03`) — fechado, com ordem real casada (`status: matched`) e saldo debitado de verdade**: 3 rodadas até chegar num resultado limpo. **Rodada 1** (sem proxy): 403 geoblock — mas isso bloqueia antes de qualquer verificação de assinatura, não provava nada sobre `POLY_1271`. No caminho achei e corrigi um bug real: `placeMarketOrder()`/`placeLimitOrder()` retornavam `success: true` incondicionalmente sem checar `result.success`/`errorMsg` do CLOB (commit `0e6f70fc`). **Rodada 2** (proxy da Índia aplicado): ordem aceita (`orderID` real, sem 403), mas `status: "delayed"`, saldo não mudou — e o mercado usado (NFL, `endDate` já tinha passado ~1h15 na hora do teste) confundia o resultado. Reportar isso como "filled" teria sido o mesmo tipo de erro do bug do `executedPrice`, então corrigi o código pra reportar o `status` real do CLOB em vez de assumir preenchimento (commit `01f038c9`). **Rodada 3** (mercado de longo prazo — Fed, 36 dias até o vencimento — com o fix do status): `{"success":true,"orderID":"0x2dafd698...","txHash":"0x622f0a66...","status":"matched"}`, saldo caiu de $3.28 pra $2.26 de verdade. **Isso prova `POLY_1271` assinando e executando ordem real, sem ambiguidade.** Achado extra registrado no spec do sub-projeto 2: setar `HTTP_PROXY`/`HTTPS_PROXY` como env var literal quebra a autenticação (axios tenta proxy HTTP puro numa URL SOCKS5) — corrigido lendo de uma variável nova, `POLYMARKET_PROXY_URL`, passada explícita via `getProxyForUrl`. Notificação do Telegram ainda não testada.
10. 🔶 **Decisão de provider de IA tomada (22/set/2026): TypeSafe/Jev, não MiniMax.** A conta MiniMax cotada antes não tinha plano/crédito ativo — `src/ai/minimax.ts` (e o resto da ilha morta que dependia dele: `chain.ts`, `validation.ts`, `src/types/ai.ts`, `src/test-apis.ts`) foi deletado nesta auditoria (23/set/2026, zero callers confirmados). Substituído como decisão de provider pelo sub-projeto 4: `src/ai/jev.ts`, com `TYPESAFE_API_KEY` real no `.env`, confirmado funcionando em chamadas ao vivo. **O pipeline de research (3 estratégias, Google News RSS, Crawl4AI, backtest) foi construído e validado com dados reais, em 4 rodadas de backtest** — números completos e a leitura honesta final (sem edge em limiar de preço; vazamento real descoberto e documentado pra evento genuíno, não uma resposta positiva nem negativa) estão só na seção "Sub-projeto 4" acima, não repetidos aqui pra evitar duas fontes de verdade divergentes. Por isso **nada disso foi conectado ao caminho de decisão de trading** — isso continua sendo uma decisão futura em aberto, e só faria sentido revisitar depois de implementar uma data de corte com margem real (não `resolveDate` cru) pra evento genuíno e validar de novo. O bot em produção continua decidindo só por preço/liquidez.
11. 🔶 **Sinal de "carteira nova/dormente" validado com controle real, monitor ao vivo deployado (23/set/2026).** Backtest com comparação de controle mostrou edge real (~11,2% ROI pra carteira nova/dormente vs ~2,2% pra carteira estabelecida, mesma amostra) — números completos, ressalvas de metodologia e os bugs achados no caminho estão na seção "Sub-projeto 5" acima. `src/whale-monitor/` está rodando 24/7 em produção como serviço Railway **separado** do bot de trading, só coletando dado real (nenhuma aposta, nenhuma decisão). **Decisão em aberto, não tomada**: quando/se esse sinal deve alimentar decisão de trading real — depende de acumular volume suficiente (semanas, centenas de eventos) antes de qualquer corte mais fino dos dados, pro mesmo risco de regressão à média que apareceu no próprio backtest.

---

## Licença

Privado — todos os direitos reservados.
