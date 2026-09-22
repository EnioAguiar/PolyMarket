# PolyMarket Bot

> Bot autônomo de trading em mercados preditivos — pesquisa, analisa e executa apostas no Polymarket usando IA.

**Repositório:** [github.com/EnioAguiar/PolyMarket](https://github.com/EnioAguiar/PolyMarket)

---

## O que é?

Bot de trading desenvolvido em TypeScript que opera de forma autônoma no [Polymarket](https://polymarket.com) — a maior plataforma de mercados preditivos do mundo.

O bot monitora mercados em tempo real via WebSocket, coleta evidências de múltiplas fontes (notícias, redes sociais, dados on-chain), usa IA para estimar probabilidades e executa ordens na blockchain (Polygon) quando encontra valor esperado positivo.

---

## Status Atual (setembro/2026)

Projeto parado desde **05/jun/2026** (último commit `93fc1628`), no meio da migração para o **CLOB V2** da Polymarket (V2 foi ao ar em 28/abr/2026, antes da parada). Este README substitui a antiga pasta `.planning/` (gerada por um skill de planejamento de sessões anteriores) — o conteúdo relevante foi resumido abaixo antes de apagá-la.

**Progresso por milestone:**

| Milestone | Escopo | Status |
|-----------|--------|--------|
| v1.0 — Monitoring Only | WebSocket, pesquisa multi-fonte, safety module, Telegram, deploy Railway | ✅ Completo (7 fases) |
| v1.1 — Production Betting | Execução real de ordens, pipeline de pesquisa conectado, decisão via IA | 🔶 Fase 1 (execução real) incompleta; fases 2 (pesquisa) e 3 (IA) nunca iniciadas |

**Onde exatamente parou:** dentro da Fase 1 (v1.1), os planos `01-01` (setup do client EOA) e `01-02` (slippage/bankroll) foram aplicados, mas o checkpoint final `01-03` — testar uma aposta real pequena e confirmar no Polygonscan — **nunca foi validado** (sem `SUMMARY.md`, sem confirmação humana). Os commits seguintes (`969ad157`…`08d377a9`) são tentativas de destravar esse teste mexendo em RPC, endereço de contrato e tipo de assinatura, sem sucesso confirmado.

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
| EOA — **é o que `src/api/clob.ts` usa hoje** | `SignatureTypeV2.EOA = 0` | Igual ao signer | Errado pra essa conta — confirmado |
| **Deposit Wallet — confirmado por bytecode** | `SignatureTypeV2.POLY_1271 = 3` | `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a wallet, não a EOA) | É o que os commits antigos (`d23d8a49`, `a746c7ba`, `ead039d5`) tentaram e abandonaram cedo demais — a decisão de abandonar era a errada. |

**O que não muda:** a chave privada (signer) continua sendo a mesma da EOA `0x18a658c6...`. O que muda é `funderAddress` e `signatureType` em `createClobClient()` (`src/api/clob.ts`).


### `DEPOSIT_WALLET_ADDRESS` do `.env` está desatualizado — trocar pelo endereço novo

O valor atual do `.env` (`0x723b9273D0E7F82e87552A441Fe5772f101488e3`) é a conta do **Google/Magic Link** ("Untidy-Mile", id `7629704`, criada 20/abr/2026) — confirmado via `polymarket.com/api/profile/userData` e via bytecode on-chain (clone EIP-1167 apontando pra `0x44e999d5c2f66ef0861317f9a4805ac2e90aeb4f`, a Proxy Factory da própria Polymarket). Login por Google passa por Magic Link, que gerencia a chave por trás — **não existe private key exportável dali**, o bot nunca teria como assinar por essa conta, e ela está zerada de qualquer forma. Descartar esse endereço do `.env` e trocar por `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a conta nova, ligada à EOA que o bot já controla).

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
| pUSD | `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` | 0 | **$3.28** (confirmado ao vivo via `getBalanceAllowance`/`getPUSDBalance()` — a posição resolveu e pagou mais que os $3 depositados) |
| Posição | mercado "Bitcoin Up or Down" (5min, 21/set) | — | **resolvida** — era 2.2988 shares "Up" @ $0.87 (custo $2.02); o saldo pós-resolução ($3.28) já reflete o payout, não está mais em aberto |


**Correção sobre a pesquisa da Fase 1:** o endereço de "USDC nativo" que ela recomendava (`0x3c499c542cEF5E6931f0FE6561f6c0D3EaB0f85D`) **não existe como contrato na Polygon** (`eth_getCode` retorna vazio, confirmado em duas RPCs) — a IA antiga alucinou os últimos bytes do endereço (mesmo prefixo `0x3c499c542cEF5E...`, sufixo inventado). O endereço certo do USDC nativo da Circle é `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`, confirmado on-chain com o saldo real acima.

### Moeda aceita: pUSD — mas o caminho oficial de depósito aceita USDC nativo direto

Duas camadas diferentes, não confundir:

- **Contrato on-chain** (`CollateralOnramp.wrap()`, [docs.polymarket.com/concepts/pusd](https://docs.polymarket.com/concepts/pusd)): só aceita **USDC.e** como `_asset`. Chamar isso direto com USDC nativo reverte.
- **Bridge API oficial** (`bridge.polymarket.com`, [docs.polymarket.com/trading/bridge/deposit](https://docs.polymarket.com/trading/bridge/deposit)): "**You can deposit either USDC (native) or USDC.e (bridged)** as the source asset... wrapped into pUSD via the Collateral Onramp" — aceita os dois, inclusive na própria Polygon (`chainId 137`, mínimo **$2**, [supported-assets](https://docs.polymarket.com/trading/bridge/supported-assets)). Nossos ~$9.21 em USDC nativo passam tranquilo no mínimo.

**Conclusão prática:** não precisa fazer swap manual em DEX (QuickSwap/Uniswap) pra converter USDC nativo → USDC.e antes — isso seria gastar em slippage numa quantia pequena à toa. O caminho certo é: `POST bridge.polymarket.com/deposit` com o endereço da carteira → pegar o bridge address tipo `evm` → mandar os USDC nativo (já na Polygon) pra esse endereço → a Polymarket converte e credita pUSD automaticamente. É um passo único de depósito, não algo que o bot precisa fazer a cada ciclo.

**Conclusão sobre o endereço hardcoded hoje:** a constante `PUSD_ADDRESS` em `src/api/clob.ts` aponta pra `0x2791...` (USDC.e) — mas o saldo real está em USDC nativo, então **nem esse endereço nem o nome da constante batem com a realidade da carteira**. Depois do depósito via Bridge API, o saldo relevante pra bankroll passa a ser o de **pUSD** (`0xC011a7E1...`), não USDC.e nem USDC nativo — `getUSDCBalance()` precisa ler dali.

---

## Elegibilidade Geográfica (Geoblock) — Brasil

Confirmado em [docs.polymarket.com/api-reference/geoblock](https://docs.polymarket.com/api-reference/geoblock) (endpoint `GET https://polymarket.com/api/geoblock`, checa IP de origem):

| Nível | O que bloqueia | Países |
|-------|-----------------|--------|
| Block completely (frontend + API) | Nenhuma ordem nova, nem fechar posição existente | Só sancionados OFAC: Irã, Síria, Cuba, Coreia do Norte, Crimeia/Donetsk/Luhansk |
| **Close-only (frontend + API)** | **Fecha posição existente, mas não abre nova** | **Brasil está aqui**, junto com EUA, Reino Unido, Alemanha, França, Rússia, Austrália, Canadá (algumas províncias) e outros ~30 países |
| Close-only (só frontend) | API não é restringida | Irlanda, Japão, Países Baixos, Coreia do Sul, Malta (esportes) |

**Implicação direta:** IP brasileiro **não abre ordem nova nem pelo site nem pela API** — não é "site bloqueado, API livre". Rodar o bot a partir de uma casa/IP residencial no Brasil não funcionaria de jeito nenhum pra abrir posição, mesmo batendo direto na API.

**Por que rodar num servidor cloud não resolve sozinho:** o geoblock verifica o IP de origem da requisição, não a nacionalidade do dono da carteira — mas **EUA está no mesmo tier de bloqueio que o Brasil** (close-only frontend+API), então um deploy Railway numa região US seria tão bloqueado quanto uma casa no Brasil. Servidores primários da Polymarket ficam em `eu-west-2`; a doc cita `eu-west-1` (Irlanda) como "closest non-georestricted region" — Irlanda está só no tier close-only-frontend (API livre). `railway.json`/`railpack.json` não fixam região no repo (é configurado no dashboard do Railway, fora do código) — **região atual não confirmada**. Isso é resolvido pelo proxy já usado no projeto (`proxy-agent`/`socks-proxy-agent`/`global-agent` no `package.json`) — a mitigação real é essa, não a região do Railway em si.

**Risco em aberto:** nunca foi confirmado que a região atual do deploy Railway está fora da lista de restrição. Adicionar uma checagem do endpoint `/api/geoblock` no startup do bot (falhar cedo e alertar via Telegram se `blocked: true`) evitaria descobrir isso só quando uma ordem for rejeitada em produção.

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
  AI Chain (MiniMax AI — raciocínio com chain-of-thought)
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

> **Atenção:** o Research (fontes) e o AI Chain (MiniMax) existem no código mas **não estão conectados** ao caminho de execução principal (`src/index.ts`). Hoje o bot decide só por preço/liquidez. Ver "Módulos parcialmente implementados" abaixo.

---

## Funcionalidades

- **Modo event-driven** — reage a novos mercados em tempo real via WebSocket, sem polling
- **Research multi-fonte** — agrega sinais de notícias, redes sociais e dados de mercado (implementado, não conectado — ver acima)
- **Inferência Bayesiana** — calcula probabilidade posterior ponderando cada fonte por confiança e relevância
- **AI Chain** — usa MiniMax AI com chain-of-thought para gerar e validar estimativas
- **Gestão de ciclo** — limita a 3 apostas por ciclo com pausa de 24h após o fechamento
- **Safety Module** — três camadas de controle de risco (posição, perda diária, drawdown) — **parcialmente quebrado, ver Problemas Conhecidos**
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
| SDK | `@polymarket/clob-client-v2` — **pinado em `1.0.3-canary.0`, defasado** (estável atual: `1.1.0`) |
| WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` (mercados em tempo real) |
| IA | MiniMax AI (`MiniMax-M2.7`, API compatível com Anthropic) |
| Banco de dados | SQLite (`better-sqlite3`) + Drizzle ORM |
| Deploy | Railway (`railpack.json` / `railway.json`, volume persistente em `/data`) |
| Logging | Pino |
| Telegram | Telegraf 4.16.3 |

---

## Módulos Principais

```
src/
├── index.ts          # Entry point PRINCIPAL — servidor HTTP + WebSocket + ciclo event-driven
├── main.ts           # Entry point LEGADO — loop de polling via Gamma REST API, não usado em produção
├── ai/               # Chain de IA (MiniMax) — implementado, não conectado ao fluxo principal
├── research/         # 8+ fontes de research (news, social, cripto, scraping) — implementado, não conectado
├── bankroll/         # Kelly criterion sizing — implementado, não conectado (safety/position-limits.ts é o usado)
├── betting/          # CycleManager (3 apostas/ciclo, espera 24h), MarketMutex (dedup por market ID)
├── execution/         # Slippage (10% máx), arbitragem, re-export das funções de ordem do CLOB
├── safety/           # 3 camadas de risco: posição (BANK-01), perda diária (BANK-02), drawdown (BANK-03)
├── api/              # Clientes: clob.ts (CLOB V2), polymarket.ts (Gamma REST), http.ts (RPC Polygon), telegram.ts
├── websocket/        # Client WS, EventRouter, SubscriptionManager
├── db/               # Schema SQLite (source_ratings, source_feeds, research_results) via Drizzle
└── config/           # Carregamento de config.yaml
```

### Módulos parcialmente implementados (existem, não estão no caminho de execução)

- `src/research/` — agregador multi-fonte completo, nunca chamado por `index.ts`
- `src/ai/` — chain MiniMax completo, nunca chamado por `index.ts`
- `src/bankroll/` — Kelly criterion, nunca chamado (usa `safety/position-limits.ts` em vez disso)
- `src/db/` — schema definido, nunca escrito/lido pelo fluxo principal

---

## Integrações Externas

| Integração | Endpoint / Pacote | Auth |
|------------|--------------------|------|
| Gamma REST (listagem de mercados) | `https://gamma-api.polymarket.com/markets` | pública |
| CLOB REST (ordens) | `https://clob.polymarket.com`, `@polymarket/clob-client-v2` | L2 ECDSA via `PRIVATE_KEY` |
| CLOB WebSocket | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | pública |
| RPC Polygon | `viem`, padrão `https://polygon.llamarpc.com`, override via `POLYGON_RPC_URL` | — |
| MiniMax AI | `https://api.minimax.io/anthropic/v1/messages` | Bearer `MINIMAX_API_KEY` |
| NewsData.io / Google CSE / CoinGecko / Binance WS / API-Football | ver `.env.example` | chaves opcionais por fonte |
| Twitter (Tweepy) / Reddit (PRAW) / Crawl4AI | subprocessos Python (`scripts/*.py`) | credenciais opcionais |
| Telegram | Telegraf | Bearer `TELEGRAM_BOT_TOKEN` |

---

## Testes

`npm test` (Vitest). Cobertura atual:

| Coberto | Não coberto (risco) |
|---------|----------------------|
| `execution/arbitrage.ts`, `execution/slippage.ts`, `bankroll/position-sizing.ts`, `research/` (social) | **`safety/` inteiro (0% — maior risco financeiro)**, `betting/cycle.ts`, `betting/mutex.ts`, `websocket/`, `api/clob.ts`, `api/telegram.ts`, `index.ts`/`main.ts` |

Sem CI configurado — testes não rodam automaticamente em push.

---

## Configuração

Toda a configuração fica em `config.yaml`:

```yaml
dryRun: false  # true = sem trades reais — HOJE ESTÁ COMMITADO COMO false, cuidado ao clonar
polymarket:
  host: https://clob.polymarket.com
  chainId: 137

safety:
  maxPositionSizePct: 0.10    # 10% do bankroll por aposta
  dailyLossLimitPct: 0.05     # 5% de perda diária máxima
  drawdownKillSwitchPct: 0.15 # Kill switch com 15% de drawdown total
```

Variáveis de ambiente necessárias:

```
PRIVATE_KEY          # Chave privada da carteira MetaMask (EOA) na Polygon
DEPOSIT_WALLET_ADDRESS  # Definida no .env.example mas não usada no código atual (modo EOA não precisa)
TELEGRAM_BOT_TOKEN   # Token do bot Telegram (opcional)
MINIMAX_API_KEY      # Chave da API de IA
```

---

## Rodando Localmente

```sh
# Instalar dependências
npm install

# Desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run build

# Iniciar em produção
npm start
```

**Modo Dry Run:** defina `dryRun: true` em `config.yaml` para testar sem executar trades reais.

---

## Deploy (Railway)

O bot roda continuamente no Railway em modo event-driven:

1. Conecta ao WebSocket do Polymarket ao iniciar
2. Permanece ativo aguardando eventos de novos mercados
3. Processa cada mercado de forma assíncrona com mutex por market ID
4. Exponha `/health` para health check do Railway

---

## Problemas Conhecidos (críticos, nunca corrigidos)

Levantados na última sessão de trabalho, ainda presentes no código:

- **`/pause` do Telegram não funciona de verdade** — chama `forceKillSwitch()`, método que não existe em `SafetyModule` (`src/api/telegram.ts:122`)
- **Erros de avaliação de mercado são engolidos silenciosamente** — `evaluateMarketForWebSocket()` é chamado sem `await`; o mutex do market também vaza nesse caminho de erro (`src/index.ts:120`)
- **`recordTrade()` nunca é chamado** → limite de perda diária e kill switch de drawdown são código morto, nunca disparam de verdade
- **Nenhuma checagem de saldo antes de submeter ordem**, nenhuma confirmação on-chain do `txHash` depois
- **`config.yaml` commitado com `dryRun: false`** — clone novo + `PRIVATE_KEY` setado = trade real imediato
- **Safety module é pulado inteiro em dry-run** (`checkBet()` retorna sempre `passed: true`) — bugs de safety ficam escondidos até ir pra produção
- Estado de safety (perda diária, drawdown, cycle) é só em memória — reinício do bot zera os contadores de proteção
- **RPC fallback list em `src/api/http.ts` está 2/3 morta**: `polygon.llamarpc.com` (default) falhou DNS, `rpc.ankr.com/polygon` agora exige API key própria — confirmado por teste direto em 21/set/2026. Só `1rpc.io/matic` e `polygon-bor-rpc.publicnode.com` responderam (`polygon.drpc.org` também). Isso explica os commits antigos mexendo em RPC — o padrão já nasceu quebrado.

O arquivo original (severidade média/baixa incluída) continua no histórico do git, não precisa reproduzir manualmente: `git show 93fc1628:.planning/codebase/CONCERNS.md`

---

## Próximos Passos (ordem sugerida)

1. ~~Fazer o depósito único via Bridge API~~ ✅ **feito** (21/set/2026): `tx 0x045a9b98...`, $3.00 pUSD confirmados on-chain em `0xA53EE08...`. A aposta de teste resolveu e pagou — saldo atual $3.28 pUSD (confirmado ao vivo, ver item 2). Restam ~$6.21 em USDC nativo na EOA.
2. ~~Trocar `createClobClient()` de EOA pra Deposit Wallet~~ ✅ **feito e verificado ao vivo** (21/set/2026, `SignatureTypeV2.POLY_1271` + `funderAddress: '0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b'`): `client.getBalanceAllowance()` não dá mais 404 "no deposit wallet found for owner" — retorna saldo real ($3.28) e allowance máxima nos 4 contratos de Exchange. Implementado via subagent-driven-development, plano em `docs/superpowers/plans/2026-09-21-wallet-trading-correctness.md`.
3. ~~Corrigir `getUSDCBalance()`~~ ✅ **feito e verificado ao vivo**: renomeada pra `getPUSDBalance()`, lê pUSD (`0xC011a7E1...`) na Deposit Wallet. Testado ao vivo: retorna `3.28066`, batendo exato com `getBalanceAllowance`.
4. 🔴 **NOVO ACHADO CRÍTICO (21/set/2026, durante a verificação da task acima): o bot em produção não usa proxy nenhum.** `import 'global-agent/bootstrap'` só existe em `src/main.ts` (entry point legado) — `src/index.ts`, o entry point real (`npm start` → `dist/index.js`), **nunca importa isso**. Ou seja, todo o trabalho de escolher país/proxy da Decodo é irrelevante em produção hoje: o bot sai direto pelo IP do Railway. E tem um segundo bug em cima: `global-agent/bootstrap` só lê `GLOBAL_AGENT_HTTP_PROXY` (com esse prefixo), não `HTTP_PROXY`/`HTTPS_PROXY` — mesmo importando no lugar certo, as variáveis do `.env` de hoje não seriam lidas sem `GLOBAL_AGENT_ENVIRONMENT_VARIABLE_NAMESPACE=''` ou renomear as variáveis. **Prioridade alta pro sub-projeto 2 (infra), antes de qualquer deploy real.**
5. **Trocar a lista de RPC fallback em `src/api/http.ts`**: confirmado ao vivo nesta sessão que o default (`polygon.llamarpc.com`) falha e `getPUSDBalance()` retorna silenciosamente `0` (capturado no catch) até apontar `POLYGON_RPC_URL` pra `https://1rpc.io/matic` (testado, funciona). A lista `POLYGON_RPC_URLS` no código nem implementa fallback de verdade — só usa `[0]`, os outros dois itens são código morto. Trocar pelas que responderam de verdade: `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org` — tirar `polygon.llamarpc.com` do topo e `rpc.ankr.com` (exige key agora).
6. **Adicionar guard de geoblock no startup**: checar `GET https://polymarket.com/api/geoblock` a partir do IP real de deploy; abortar/alertar via Telegram se `blocked: true` (Brasil está em close-only tanto no frontend quanto na API). Depende do item 4 acima estar resolvido primeiro (sem proxy funcionando, esse guard vai sempre ver o IP cru do Railway).
7. ~~Atualizar `@polymarket/clob-client-v2`~~ ✅ **feito**: `1.0.3-canary.0` → `1.1.0`. `@polymarket/builder-signing-sdk` removido.
8. Corrigir os bugs críticos do Safety Module listados acima antes de voltar a rodar com `dryRun: false`.
9. 🔶 **Checkpoint de teste real (antigo `01-03`) — parcialmente feito, não fechar ainda**: a aposta de teste (ver item 1) foi colocada **manualmente pelo usuário na interface da Polymarket**, não pelo `placeMarketOrder()`/`createAndPostMarketOrder()` do bot. O que foi provado ao vivo é só **autenticação + wiring do funder** (`getBalanceAllowance()` com `POLY_1271` não dá mais 404). **O código de colocar ordem do bot em si, assinando com `POLY_1271`, nunca foi exercitado nesta sessão** — ainda é hipótese não testada. Notificação do Telegram também não foi validada. Falta: rodar `placeMarketOrder()` de verdade (aposta pequena, os ~$3.28 de pUSD disponíveis servem) e confirmar que a ordem do bot passa pela assinatura POLY_1271 igual ao teste manual.
10. Só depois disso: conectar `research/` e `ai/` ao fluxo de decisão (hoje o bot decide só por preço/liquidez).

---

## Licença

Privado — todos os direitos reservados.
