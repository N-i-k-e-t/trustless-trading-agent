// api/analyze.js - Vercel Serverless Function for Agentic AI Trading Analysis
// This gives the Trustless Trading Agent a REAL LLM brain with memory + ReAct reasoning

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(200).json({
      action: 'HOLD',
      confidence: 0.5,
      reasoning: 'OpenAI API key not configured. Using fallback.',
      risk_level: 'LOW',
      amount: 0.01,
      thought_chain: ['No API key available', 'Defaulting to HOLD'],
      memory_used: false,
      agentic: false
    });
  }

  try {
    const { marketData, tradeHistory, agentState, symbol } = req.body;

    // Build agent memory context from past trades
    const recentTrades = (tradeHistory || []).slice(-10);
    let memoryContext = '';
    if (recentTrades.length > 0) {
      const wins = recentTrades.filter(t => parseFloat(t.pnl) > 0).length;
      const losses = recentTrades.length - wins;
      const totalPnl = recentTrades.reduce((s, t) => s + parseFloat(t.pnl || 0), 0);
      const lastActions = recentTrades.slice(-3).map(t => `${t.action} ${t.sym} @ $${t.price} (PnL: $${t.pnl})`);
      memoryContext = `
--- AGENT MEMORY (Last ${recentTrades.length} trades) ---
Win/Loss: ${wins}W / ${losses}L
Total PnL: $${totalPnl.toFixed(2)}
Recent actions: ${lastActions.join(' | ')}
Last strategy outcomes: ${recentTrades.slice(-3).map(t => t.strategy || 'N/A').join(' | ')}
---
Use this memory to ADAPT your strategy. If recent trades lost money, be more cautious. If winning, consider maintaining approach but watch for overconfidence.`;
    }

    // ReAct-style prompt for true agentic reasoning
    const systemPrompt = `You are an autonomous AI trading agent called "Trustless Trading Agent".
You operate on Base Sepolia with ERC-8004 identity and every decision you make is cryptographically signed.

You MUST think step-by-step using the ReAct framework:
1. OBSERVE - What does the market data tell you?
2. THINK - What patterns do you see? How does this compare to your memory of past trades?
3. REASON - What are the risks? What is the expected outcome?
4. DECIDE - What action to take and why?
5. PLAN - What should you watch for in the next cycle?

You have access to PRISM API real-time data. You are risk-aware with a 6-point risk check system.
You must be honest about uncertainty. Never be overconfident.
${memoryContext}`;

    const userPrompt = `Analyze this market data and make a trading decision.

Current Market Data:
- Symbol: ${symbol || 'BTC'}
- Price: $${marketData?.price || 'N/A'}
- 24h Change: ${marketData?.change24h || 0}%
- Volume: ${marketData?.volume || 'N/A'}
- PRISM Confidence: ${marketData?.confidence || 'N/A'}
- Data Source: ${marketData?.source || 'PRISM_LIVE'}

Agent State:
- Trust Score: ${agentState?.trustScore || 50}/100
- Total Trades: ${agentState?.totalTrades || 0}
- Current PnL: $${agentState?.pnl || 0}
- Daily Loss: $${agentState?.dailyLoss || 0}
- Circuit Breaker: ${agentState?.circuitBreaker ? 'TRIPPED' : 'OK'}

Respond with ONLY valid JSON in this exact format:
{
  "thought_chain": [
    "OBSERVE: <what you see in the data>",
    "THINK: <pattern analysis and memory reference>",
    "REASON: <risk assessment>",
    "DECIDE: <final decision with justification>",
    "PLAN: <what to monitor next>"
  ],
  "action": "BUY" or "SELL" or "HOLD",
  "confidence": 0.0 to 1.0,
  "reasoning": "One-line summary of decision",
  "risk_level": "LOW" or "MEDIUM" or "HIGH",
  "amount": 0.001 to 0.1,
  "strategy_factors": [
    {"factor": "name", "signal": "description", "impact": "+/-value"}
  ],
  "memory_insight": "What you learned from past trades (or 'No history yet')",
  "next_cycle_plan": "What to watch for in the next 30s cycle"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return res.status(200).json({
      ...parsed,
      agentic: true,
      model: 'gpt-4o-mini',
      memory_used: recentTrades.length > 0,
      tokens_used: data.usage?.total_tokens || 0
    });

  } catch (error) {
    return res.status(200).json({
      action: 'HOLD',
      confidence: 0.3,
      reasoning: `AI analysis error: ${error.message}. Defaulting to safe HOLD.`,
      risk_level: 'LOW',
      amount: 0.01,
      thought_chain: [
        'OBSERVE: API call failed',
        'THINK: Cannot analyze without AI',
        'REASON: Safety first - hold position',
        'DECIDE: HOLD until AI is restored',
        'PLAN: Retry next cycle'
      ],
      agentic: false,
      error: error.message
    });
  }
}
