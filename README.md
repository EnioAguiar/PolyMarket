# PolyMarket Bot

> Bot autônomo de trading em mercados preditivos — pesquisa, analisa e executa apostas no Polymarket usando IA.

**Repositório:** [github.com/EnioAguiar/PolyMarket](https://github.com/EnioAguiar/PolyMarket)

---

## O que é?

Bot de trading desenvolvido em TypeScript que opera de forma autônoma no [Polymarket](https://polymarket.com) — a maior plataforma de mercados preditivos do mundo.

O bot monitora mercados em tempo real via WebSocket, coleta evidências de múltiplas fontes (notícias, redes sociais, dados on-chain), usa IA para estimar probabilidades e executa ordens na blockchain (Polygon) quando encontra valor esperado positivo.

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
  Execução via CLOB API v2 (Polygon / USDC)
```

---

## Funcionalidades

- **Modo event-driven** — reage a novos mercados em tempo real via WebSocket, sem polling
- **Research multi-fonte** — agrega sinais de notícias, redes sociais e dados de mercado antes de qualquer decisão
- **Inferência Bayesiana** — calcula probabilidade posterior ponderando cada fonte por confiança e relevância
- **AI Chain** — usa MiniMax AI com chain-of-thought para gerar e validar estimativas
- **Gestão de ciclo** — limita a 3 apostas por ciclo com pausa de 24h após o fechamento
- **Safety Module** — protege o bankroll com três camadas independentes de controle de risco
- **Modo Dry Run** — loga todas as decisões sem executar trades reais
- **Controle via Telegram** — pause, retome e monitore o bot por mensagens no Telegram
- **Health check HTTP** — endpoint `/health` e `/debug` para monitoramento em produção
- **Persistência local** — SQLite com Drizzle ORM para estado de apostas e histórico

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | TypeScript (Node.js ≥ 20) |
| Blockchain | Polygon (MATIC) — USDC como moeda |
| Exchange API | Polymarket CLOB API v2 |
| WebSocket | Polymarket WS (mercados em tempo real) |
| IA | MiniMax AI (chain-of-thought) |
| Banco de dados | SQLite + Drizzle ORM |
| Deploy | Railway |
| Logging | Pino |
| Telegram | Telegraf |

---

## Módulos Principais

```
src/
├── index.ts          # Entry point — servidor HTTP + WebSocket + ciclo principal
├── ai/               # Chain de IA e validação de estimativas
├── research/         # Coleta e agregação de evidências (7 fontes)
├── betting/          # Gestão de ciclo, mutex por mercado, tipos
├── execution/        # Envio de ordens, slippage, arbitragem
├── safety/           # Controle de risco (posição, perda diária, drawdown)
├── api/              # Clientes para Polymarket, CLOB e Telegram
├── websocket/        # Cliente WS, roteador de eventos, subscriptions
├── db/               # Schema SQLite e queries
└── config/           # Carregamento de config.yaml
```

---

## Configuração

Toda a configuração fica em `config.yaml`:

```yaml
dryRun: false  # true = sem trades reais

safety:
  maxPositionSizePct: 0.10    # 10% do bankroll por aposta
  dailyLossLimitPct: 0.05     # 5% de perda diária máxima
  drawdownKillSwitchPct: 0.15 # Kill switch com 15% de drawdown total
```

Variáveis de ambiente necessárias:

```
PRIVATE_KEY          # Chave privada da carteira Polygon
FUNDER_ADDRESS       # Endereço da carteira
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

## Licença

Privado — todos os direitos reservados.
