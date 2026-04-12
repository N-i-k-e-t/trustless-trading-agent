# Trustless Trading Agent

An autonomous AI trading agent with on-chain reputation via ERC-8004, powered by PRISM API and Kraken CLI.

Built for the **AI Trading Agents Hackathon** on lablab.ai (March 30 - April 12, 2026)

**Live Demo:** [trustless-trading-agent-niket-main.vercel.app](https://trustless-trading-agent-niket-main.vercel.app/)

---

## What It Does

The Trustless Trading Agent is an autonomous AI that:

1. **Perceives** - Fetches real-time market data (BTC, ETH, SOL, AVAX) via PRISM API
2. **Decides** - AI analyzes momentum, volume, mean reversion, and PRISM confidence scores
3. **Signs** - Every decision is cryptographically signed via ERC-8004 (EIP-712) before execution
4. **Executes** - Trades executed through Kraken CLI (paper trading mode)
5. **Validates** - On-chain audit trail with verifiable intent hashes and signatures

Every action is **transparent, auditable, and trustless**.

---

## Key Features

- **ERC-8004 On-Chain Identity** - Registered agent on Base Sepolia with verifiable capabilities
- **Real-Time PRISM API Data** - Live prices, signals, and confidence scores
- **6-Point Risk Guardrails** - Pre-trade risk checks (max loss, position size, stop-loss, circuit breaker)
- **Explainable AI** - Full reasoning displayed for every trade decision
- **Trust Score System** - Multi-factor reputation: PnL quality, risk control, consistency, validation
- **DeFi Integration** - Surge (token discovery) + Aerodrome (DEX swaps on Base)
- **Admin Panel** - Session analytics, agent controls, trading parameters, feedback log
- **User Onboarding** - First-visit guide, How It Works section, Quick Start banner
- **Feedback System** - Built-in user feedback with star ratings and categorization
- **Session Tracking** - Live session timer, API call counter, trade counter

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| AI Brain | Technical Analysis (momentum, volume, mean reversion) |
| Market Data | PRISM API (real-time crypto data) |
| Trading | Kraken CLI (paper trading) |
| Identity | ERC-8004 / EIP-712 (on-chain signing) |
| Blockchain | Base Sepolia (agent registration) |
| DeFi | Surge Protocol + Aerodrome Finance |
| Frontend | HTML/JS + Chart.js |
| Crypto | Web Crypto API (SHA-256) |
| Deploy | Vercel |

---

## Project Structure

```
trustless-trading-agent/
  frontend/
    index.html    # Main UI (dashboard, trade history, admin panel, etc.)
    app.js        # Core agent logic (AI, signing, risk checks, session tracking)
  contracts/
    TrustlessAgent.sol  # ERC-8004 smart contract
  README.md
```

---

## How to Run Locally

1. Clone the repo:
```bash
git clone https://github.com/N-i-k-e-t/trustless-trading-agent.git
cd trustless-trading-agent
```

2. Open `frontend/index.html` in a browser (no build step needed)

3. Or serve locally:
```bash
cd frontend
python -m http.server 8080
# Open http://localhost:8080
```

---

## Live Demo

Visit: **[trustless-trading-agent-niket-main.vercel.app](https://trustless-trading-agent-niket-main.vercel.app/)**

### For New Users:
- Onboarding modal appears on first visit
- Quick Start banner guides you to run your first trade
- How It Works section explains the 5-step pipeline

### Key Actions:
1. Select a token (BTC/ETH/SOL/AVAX)
2. Click **Run Trade Cycle** to trigger the AI agent
3. View AI Reasoning, Risk Check, and Proof of Decision
4. Check Trade History for signed trade records
5. Explore Admin Panel for session analytics

---

## Hackathon Sponsors Integration

| Sponsor | Integration | Status |
|---------|------------|--------|
| **PRISM API** | Real-time crypto market data & signals | Active |
| **Kraken CLI** | Trade execution layer for AI agents | Active (Paper) |
| **ERC-8004** | On-chain agent identity & trust standard | Active |
| **Surge** | Early-stage token discovery & trading | Integration Ready |
| **Aerodrome** | DEX liquidity & swap execution on Base | Integration Ready |

---

## Business Model

- **SaaS:** $29-$99/month for premium AI signals
- **API Access:** Per-call billing for AI analysis engine
- **White-Label:** License to exchanges and trading platforms
- **Reputation-as-a-Service:** On-chain trust scores for DeFi protocols
- **Transaction Fees:** 0.1% on profitable trades
- **Enterprise:** Custom deployment for institutional desks

**Target:** 10,000 users in Year 1, $500K ARR

---

## Builder

**Niket Patil** - Full-stack developer & blockchain engineer

---

## License

MIT License

---

*Built for the AI Trading Agents Hackathon 2026 | Prize Pool: $55,000*
