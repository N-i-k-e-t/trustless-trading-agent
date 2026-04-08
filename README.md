# Trustless Trading Agent

An autonomous AI trading agent with on-chain reputation via ERC-8004, powered by PRISM API and Kraken CLI.

Built for the **AI Trading Agents Hackathon** on lablab.ai.

## What It Does

- AI agent analyzes crypto markets using PRISM API sentiment data
- Executes trades via Kraken CLI simulation
- Signs all actions on-chain using ERC-8004 Trustless Agent identity
- Builds transparent trust score based on trade history
- Real-time dashboard shows agent decisions, P&L, and trust metrics

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python FastAPI |
| AI Brain | OpenAI GPT-4 |
| Market Data | PRISM API |
| Trading | Kraken CLI |
| Identity | ERC-8004 (Solidity) |
| Frontend | HTML/JS + Chart.js |
| Deploy | Docker / Vercel |

## Quick Start

```bash
# Clone
git clone https://github.com/N-i-k-e-t/trustless-trading-agent.git
cd trustless-trading-agent

# Setup
cp .env.example .env
# Fill in your API keys in .env

# Install
pip install -r backend/requirements.txt

# Run
uvicorn backend.main:app --reload
```

Open `frontend/index.html` in browser or visit `http://localhost:8000`

## Docker

```bash
docker build -t trustless-agent .
docker run -p 8000:8000 --env-file .env trustless-agent
```

## Architecture

```
User Dashboard <-> FastAPI Backend <-> OpenAI (Analysis)
                        |                    |
                   PRISM API           Kraken CLI
                  (Sentiment)          (Trading)
                        |
                   ERC-8004
                (On-chain Identity)
```

## API Endpoints

- `GET /api/status` - Agent status and trust score
- `POST /api/analyze` - Trigger market analysis
- `POST /api/trade` - Execute a trade decision
- `GET /api/history` - Trade history with signatures

## WOW Factor

Every trade decision is cryptographically signed on-chain via ERC-8004, creating an immutable audit trail. Users can verify the agent never acted outside its mandate.

## License

MIT
