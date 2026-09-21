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

## Decisão de Carteira: EOA + MetaMask + USDC (não deposit wallet)

Decisão validada na pesquisa da Fase 1 (`01-RESEARCH.md`, 11/mai/2026), e é a que está implementada hoje em `src/api/clob.ts` (`SignatureTypeV2.EOA`):

| Modo | Signature Type | Funder | Observação |
|------|----------------|--------|------------|
| **EOA (usado)** | `0` | Igual ao signer (endereço da MetaMask) | Precisa de USDC + MATIC (gas) na própria carteira. Fluxo mais simples, sem wrapping ERC-1271. |
| Deposit wallet (descartado) | `3` (`POLY_1271`) | Endereço separado, validado via ERC-1271 | Testado antes (commits `d23d8a49`, `a746c7ba`, `ead039d5`) e abandonado a favor de EOA. |

**O "bate e volta" nos commits antigos foi essa indecisão entre os dois modos** — já está resolvida: manter EOA + MetaMask + USDC.

### Confusão de endereço de contrato (não resolvida)

Três endereços diferentes aparecem na história do projeto, e o código hoje usa o errado para o propósito atual:

| Token | Endereço | Onde é citado |
|-------|----------|----------------|
| pUSD (collateral oficial do CLOB V2 desde 28/abr/2026) | `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` | [docs.polymarket.com/resources/contracts](https://docs.polymarket.com/resources/contracts) |
| USDC nativo (Polygon) | `0x3c499c542cEF5E6931f0FE6561f6c0D3EaB0f85D` | Recomendado pela pesquisa da Fase 1 para ler saldo da carteira EOA |
| USDC.e (bridged, legado) | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | **É o que está hardcoded hoje** em `src/api/clob.ts` na constante `PUSD_ADDRESS` (nome errado — nem é pUSD) |

**Ponto em aberto para a próxima sessão:** a doc oficial de migração V2 diz que o collateral do CLOB agora é pUSD e que "traders API-only" precisam converter USDC.e → pUSD via `wrap()` no contrato `CollateralOnramp` (`0x93070a847efEf7F70739046A929D47a521F5B8ee`) — isso vale independente do modo de assinatura (EOA ou deposit wallet). Ou seja: mesmo com EOA correto, pode ser necessário ter pUSD (não USDC bruto) na carteira para as ordens liquidarem. Isso nunca foi testado. Ver checklist em [docs.polymarket.com/v2-migration](https://docs.polymarket.com/v2-migration).

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

Lista completa (severidade média/baixa incluída) preservada em `.planning/codebase/CONCERNS.md` antes de ser apagada — reproduzir manualmente se precisar do detalhe fino.

---

## Próximos Passos (ordem sugerida)

1. **Resolver a confusão de collateral**: confirmar se CLOB V2 exige saldo em pUSD mesmo em modo EOA; se sim, decidir entre (a) fazer `wrap()` de USDC → pUSD via `CollateralOnramp` (`0x93070a847efEf7F70739046A929D47a521F5B8ee`) ou (b) confirmar que EOA aceita USDC nativo direto. Testar com valor pequeno.
2. Corrigir `PUSD_ADDRESS` em `src/api/clob.ts` — renomear e apontar para o endereço certo conforme decisão acima.
3. Atualizar `@polymarket/clob-client-v2` de `1.0.3-canary.0` para `1.1.0` estável; remover `@polymarket/builder-signing-sdk` (obsoleto pós-V2, builder auth virou campo `builderCode` na ordem).
4. Reverter o debug solto sem commit em `src/api/http.ts` (removeu fallback de RPC e retry) — não é trabalho em andamento, é regressão.
5. Corrigir os bugs críticos do Safety Module listados acima antes de voltar a rodar com `dryRun: false`.
6. Terminar o checkpoint de teste real (antigo `01-03`): aposta pequena, confirmar `txHash` no Polygonscan, validar notificação no Telegram.
7. Só depois disso: conectar `research/` e `ai/` ao fluxo de decisão (hoje o bot decide só por preço/liquidez).

---

## Licença

Privado — todos os direitos reservados.
