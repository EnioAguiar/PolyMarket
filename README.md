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

## Decisão de Carteira: MetaMask assina, conta parece ser Deposit Wallet — **POLY_1271 é hipótese, não fato confirmado**

**Isso inverteria o que a pesquisa da Fase 1 concluiu em 11/mai/2026, mas ainda falta uma prova on-chain.** Sequência reconstruída nesta sessão (21/set/2026):

1. Conectamos a EOA `0x18a658c6...` via MetaMask no polymarket.com — resultado: **conta nova** criada (`id 9843725`, pseudônimo "Satisfied-Caboose"), confirmada via `polymarket.com/api/profile/userData?address=0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b`. O endereço da conta é **diferente** da EOA que assina — bate com o modelo `Deposit Wallet`, padrão desde 4/mai/2026 segundo `docs.polymarket.com/trading/wallets-auth`.
2. A tela "Chaves de sessão" apareceu disponível pra essa conta — a doc de Session Keys diz que isso **só existe pra Deposit Wallets** ("a dedicated migration flow from Safe Wallets and Proxy Wallets is planned"), o que é evidência forte a favor de Deposit Wallet.
3. **Mas a wallet `0xA53EE08...` ainda não foi deployada on-chain** (`eth_getCode` retorna vazio, confirmado duas vezes, 21/set/2026) — não dá pra ler o bytecode e confirmar o formato do proxy ainda. Três tentativas de calcular o endereço localmente (`deriveProxyWallet`, `deriveDepositWallet`, `deriveSafe`, todas via `@polymarket/builder-relayer-client` 0.0.9) **não bateram com nada** — inconclusivo, provavelmente lib desatualizada, não prova nem contra Deposit Wallet.
4. A EOA confirmou como "assinante" na própria tela de Relayer da Polymarket — bate com o modelo signer≠wallet.

**Plano pra fechar a dúvida sem custo extra:** o depósito de teste de $2 (próxima seção) vai forçar o deploy da wallet. Depois disso, `eth_getCode` revela o formato de verdade: clone EIP-1167 simples → `POLY_PROXY` (1), Safe → `POLY_GNOSIS_SAFE` (2), proxy ERC-1967/beacon → `POLY_1271` (3). Até lá, tudo abaixo que menciona `POLY_1271` é a hipótese mais provável, não fato fechado.

**Configuração de código, condicionada à confirmação:**

| Modo | Signature Type (`@polymarket/clob-client-v2`) | Funder | Situação |
|------|----------------|--------|------------|
| EOA — **é o que `src/api/clob.ts` usa hoje** | `SignatureTypeV2.EOA = 0` | Igual ao signer | Só funcionaria se a conta fosse EOA pura — **quase certamente não é o caso aqui** |
| **Deposit Wallet — hipótese líder, a confirmar por bytecode** | `SignatureTypeV2.POLY_1271 = 3` | `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a wallet, não a EOA) | Se confirmado, é o que os commits antigos (`d23d8a49`, `a746c7ba`, `ead039d5`) tentaram e abandonaram cedo demais. |

**O que não muda independente da confirmação:** a chave privada (signer) continua sendo a mesma da EOA `0x18a658c6...`. O que muda é `funderAddress` e `signatureType` em `createClobClient()` (`src/api/clob.ts`).


### `DEPOSIT_WALLET_ADDRESS` do `.env` está desatualizado — trocar pelo endereço novo

O valor atual do `.env` (`0x723b9273D0E7F82e87552A441Fe5772f101488e3`) é a conta do **Google/Magic Link** ("Untidy-Mile", id `7629704`, criada 20/abr/2026) — confirmado via `polymarket.com/api/profile/userData` e via bytecode on-chain (clone EIP-1167 apontando pra `0x44e999d5c2f66ef0861317f9a4805ac2e90aeb4f`, a Proxy Factory da própria Polymarket). Login por Google passa por Magic Link, que gerencia a chave por trás — **não existe private key exportável dali**, o bot nunca teria como assinar por essa conta, e ela está zerada de qualquer forma. Descartar esse endereço do `.env` e trocar por `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (a conta nova, ligada à EOA que o bot já controla).

Tentativa de calcular esse endereço via `deriveProxyWallet()` da lib já instalada (`@polymarket/builder-relayer-client`) deu um terceiro endereço (`0xA9a78a08...`) que não bate com nada — confirmado inconclusivo por bug documentado da lib ([Polymarket/rs-clob-client#272](https://github.com/Polymarket/rs-clob-client/issues/272), hash de init code desatualizado). **A fonte de verdade é sempre a API/UI da Polymarket, não cálculo local.**

### ✅ Depósito de teste confirmado (21/set/2026)

Primeira tentativa (`tx 0x5181ea7a...`) foi erro de digitação — `transfer()` mandou $2 pra própria EOA (`from == to`), nada chegou na bridge, só gastou gas. Segunda tentativa (`tx 0x045a9b98...`) foi certa: `$3.00 USDC nativo` da EOA `0x18a658c6...` pro endereço de bridge `0xA493bBBA1B09EBeb78ec6681c8432994de1BcE6e` (obtido via `POST bridge.polymarket.com/deposit`, reconfirmado idêntico numa segunda chamada antes do envio).

**Resultado, checado direto on-chain:** saldo de pUSD (`0xC011a7E1...`) em `0xA53EE08...` = **$3.00 exatos**. O Bridge API converteu automaticamente, sem swap manual, sem chamar `wrap()` na mão.

**Detalhe que ainda fica em aberto:** mesmo com saldo, `eth_getCode` em `0xA53EE08...` continua vazio — receber pUSD (ERC-20 comum) não exige que a wallet em si já esteja deployada, só a primeira **ação** da wallet (colocar ordem, mover fundos) deve forçar o deploy. Ou seja, o tipo de proxy (`POLY_1271` vs `POLY_PROXY` vs `POLY_GNOSIS_SAFE`) só vai ficar 100% confirmado na primeira tentativa real de ordem no CLOB — que é o próximo passo depois de ajustar `src/api/clob.ts`.

### Estado real da carteira (confirmado on-chain, 21/set/2026)

Endereço EOA (signer) `0x18a658c68cb3b21a0730F09703cF42c6E5BfD3cE` — endereço da conta (Deposit Wallet) `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b`:

| Token | Endereço | EOA (signer) | Conta (`0xA53EE08...`) |
|-------|----------|---------------|--------------------------|
| POL (gas) | nativo | ~7.13 — sobrando | 0 |
| USDC.e | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | 0 | 0 |
| USDC nativo (Circle) | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | **≈ 6.21** (depois do depósito de teste) | 0 |
| **pUSD** | `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` | 0 | **$3.00 — depósito de teste confirmado** |


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

1. ~~Fazer o depósito único via Bridge API~~ ✅ **feito** (21/set/2026): `tx 0x045a9b98...`, $3.00 pUSD confirmados on-chain em `0xA53EE08...`. Restam ~$6.21 em USDC nativo na EOA pra depois de validar o fluxo de trading.
2. **Trocar `createClobClient()` em `src/api/clob.ts` de EOA pra Deposit Wallet**: `signatureType: SignatureTypeV2.POLY_1271` (hipótese líder, não confirmada por bytecode ainda — ver seção acima), `funderAddress: '0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b'` (não mais igual ao signer). O `walletClient` (assinatura) continua o mesmo, só o funder muda. Atualizar `DEPOSIT_WALLET_ADDRESS` no `.env` pra esse valor novo. **A primeira ordem real de teste confirma ou derruba a hipótese `POLY_1271`** — se rejeitar a assinatura, tentar `POLY_PROXY` (1) ou `POLY_GNOSIS_SAFE` (2) em seguida.
3. **Corrigir `getUSDCBalance()` em `src/api/clob.ts`**: depois do depósito, o saldo de bankroll tem que vir de **pUSD** (`0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB`) **na Deposit Wallet** (`0xA53EE08...`), não `PUSD_ADDRESS` (que hoje aponta pra USDC.e e além disso lê a EOA errada). Renomear a constante enquanto mexe.
4. **Trocar a lista de RPC fallback em `src/api/http.ts`** pelas que responderam de verdade: `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org` — tirar `polygon.llamarpc.com` do topo e `rpc.ankr.com` da lista (exige key agora).
5. **Adicionar guard de geoblock no startup**: checar `GET https://polymarket.com/api/geoblock` a partir do IP real de deploy; abortar/alertar via Telegram se `blocked: true` (Brasil está em close-only tanto no frontend quanto na API). Time já usa proxy pra isso — validar que o proxy configurado responde num país fora da lista de restrição.
6. Atualizar `@polymarket/clob-client-v2` de `1.0.3-canary.0` para `1.1.0` estável; remover `@polymarket/builder-signing-sdk` (obsoleto pós-V2, builder auth virou campo `builderCode` na ordem).
7. Corrigir os bugs críticos do Safety Module listados acima antes de voltar a rodar com `dryRun: false`.
8. Terminar o checkpoint de teste real (antigo `01-03`): aposta pequena, confirmar `txHash` no Polygonscan, validar notificação no Telegram.
9. Só depois disso: conectar `research/` e `ai/` ao fluxo de decisão (hoje o bot decide só por preço/liquidez).

---

## Licença

Privado — todos os direitos reservados.
