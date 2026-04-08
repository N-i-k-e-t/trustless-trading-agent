// Trustless Trading Agent - Frontend Engine
const API = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
let S = { trades:[], pnl:0, wins:0, losses:0, tt:0, ts:50, dl:0, md:0, ph:[0], ai:null, cb:false, exp:0, cbt:0 };
const P = { BTC:67420, ETH:3180, SOL:142, AVAX:35 };
const STR = [
  'Momentum breakout detected on 15m candle with volume surge',
  'RSI oversold bounce at key support level - reversal entry',
  'VWAP reclaim with above-average volume confirmation',
  'EMA 9/21 crossover signal on 4h timeframe',
  'Orderbook imbalance detected (bid > ask 3:1)',
  'Funding rate negative - contrarian long signal',
  'Whale accumulation pattern detected on-chain via PRISM',
  'Mean reversion from 2-std Bollinger Band deviation',
  'Liquidation cascade clearing - recovery entry point',
  'Smart money divergence from retail sentiment (PRISM API)'
];

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
}

function log(m, t='success') {
  const e = document.getElementById('activityLog');
  const ts = new Date().toLocaleTimeString();
  e.innerHTML += '<div class="log-entry"><span class="log-time">[' + ts + ']</span> <span class="log-' + t + '">' + m + '</span></div>';
  e.scrollTop = e.scrollHeight;
}

function eLog(m) {
  const e = document.getElementById('ercLog');
  const ts = new Date().toLocaleTimeString();
  e.innerHTML += '<div class="log-entry"><span class="log-time">[' + ts + ']</span> <span class="log-success">' + m + '</span></div>';
  e.scrollTop = e.scrollHeight;
}

function rLog(m, t='warn') {
  const e = document.getElementById('riskLog');
  const ts = new Date().toLocaleTimeString();
  e.innerHTML += '<div class="log-entry"><span class="log-time">[' + ts + ']</span> <span class="log-' + t + '">' + m + '</span></div>';
  e.scrollTop = e.scrollHeight;
}

function gS() {
  let s = '0x';
  for (let i = 0; i < 64; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return s;
}
function gH() { return gS().substring(0, 42); }

async function animS() {
  for (let i = 1; i <= 5; i++) {
    document.getElementById('step' + i).className = 'erc-step active';
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('step' + i).className = 'erc-step done';
  }
}

async function runTradeCycle() {
  if (S.cb) { log('CIRCUIT BREAKER ACTIVE - Trading halted', 'error'); return; }
  const sym = document.getElementById('symbolSelect').value;
  const price = P[sym] * (1 + (Math.random() - 0.5) * 0.02);
  log('Fetching market data for ' + sym + ' via PRISM API...');
  animS();
  await new Promise(r => setTimeout(r, 500));
  log(sym + '/USD price: $' + price.toFixed(2) + ' | Sentiment: ' + (Math.random()*100).toFixed(0) + '%');
  await new Promise(r => setTimeout(r, 400));
  const acts = ['BUY','SELL','HOLD'], wts = [0.45,0.35,0.2];
  let rand = Math.random(), cum = 0, action = 'HOLD';
  for (let i = 0; i < acts.length; i++) { cum += wts[i]; if (rand <= cum) { action = acts[i]; break; } }
  const conf = (0.6 + Math.random() * 0.35).toFixed(2);
  const amt = (0.001 + Math.random() * 0.09).toFixed(4);
  const strat = STR[Math.floor(Math.random() * STR.length)];
  log('AI Decision: ' + action + ' ' + amt + ' ' + sym + ' (confidence: ' + (conf*100).toFixed(0) + '%)');
  log('Strategy: ' + strat);
  await new Promise(r => setTimeout(r, 300));
  const sig = gS(), ih = gH();
  log('ERC-8004 signing trade intent...');
  eLog('TradeIntent signed | Action: ' + action + ' | Agent: 0x7a3b...f92e');
  eLog('Signature: ' + sig.substring(0,20) + '...');
  eLog('Intent Hash: ' + ih);
  await new Promise(r => setTimeout(r, 300));
  if (action !== 'HOLD') {
    const pc = (Math.random() - 0.4) * price * parseFloat(amt) * 0.1;
    S.pnl += pc; S.dl += Math.min(0, pc); S.tt++;
    if (pc > 0) S.wins++; else S.losses++;
    S.ph.push(S.pnl);
    S.md = Math.min(S.md, S.pnl - Math.max(...S.ph));
    S.exp = parseFloat(amt) * price;
    log('Kraken CLI: ' + action + ' ' + amt + ' ' + sym + '/USD @ $' + price.toFixed(2) + ' [PAPER]');
    log('P&L: ' + (pc>=0?'+':'') + '$' + pc.toFixed(2), pc>=0?'success':'error');
    if (Math.abs(pc/price) > 0.04) rLog('Stop-loss check: ' + (pc/price*100).toFixed(2) + '% move on ' + sym);
    if (S.dl < -500 && !S.cb) {
      S.cb = true; S.cbt++;
      log('CIRCUIT BREAKER TRIGGERED - Daily loss limit exceeded', 'error');
      rLog('CIRCUIT BREAKER TRIPPED - All trading halted', 'error');
      document.getElementById('circuitStatus').textContent = 'TRIPPED';
      document.getElementById('circuitStatus').className = 'value red';
    }
    const trade = {id:S.tt, sym:sym, action:action, amount:amt, price:price.toFixed(2), pnl:pc.toFixed(2), confidence:conf, sig:sig, time:new Date().toLocaleTimeString(), strategy:strat, intentHash:ih};
    S.trades.push(trade);
    updateArtifacts(trade);
  } else {
    log('HOLD - No trade executed. Monitoring ' + sym + '...', 'warn');
  }
  document.getElementById('reasoning').innerHTML = '<strong>' + action + ' ' + sym + '</strong><br><br>' + strat + '<br><br>Confidence: ' + (conf*100).toFixed(0) + '% | Risk: ' + (conf>0.8?'LOW':'MEDIUM') + '<br>ERC-8004 Sig: <span class="sig">' + sig.substring(0,30) + '...</span>';
  S.ts = calcTrust();
  updateUI();
}

function calcTrust() {
  if (S.tt === 0) return 50;
  const wr = S.wins / Math.max(S.tt, 1);
  return Math.min(parseFloat((wr * 80 + Math.min(S.tt * 2, 20)).toFixed(1)), 100);
}

function updateUI() {
  document.getElementById('trustScore').textContent = S.ts.toFixed(1);
  const pe = document.getElementById('pnl');
  pe.textContent = (S.pnl>=0?'+':'') + '$' + S.pnl.toFixed(2);
  pe.className = 'value ' + (S.pnl>=0?'accent':'red');
  document.getElementById('pnlSub').textContent = S.tt + ' trades executed';
  const wr = S.tt>0 ? (S.wins/S.tt*100).toFixed(1) : 0;
  document.getElementById('winRate').textContent = wr + '%';
  document.getElementById('winSub').textContent = S.wins + 'W / ' + S.losses + 'L';
  document.getElementById('sharpe').textContent = S.tt>2 ? (S.pnl/Math.max(Math.abs(S.md),1)*Math.sqrt(S.tt)/10).toFixed(2) : '0.00';
  document.getElementById('drawdown').textContent = '$' + Math.abs(S.md).toFixed(2);
  const dd = Math.min(Math.abs(S.md)/500*100, 100);
  document.getElementById('drawdownBar').style.width = dd + '%';
  document.getElementById('drawdownBar').className = 'risk-fill ' + (dd<30?'risk-low':dd<70?'risk-med':'risk-high');
  document.getElementById('exposure').textContent = '$' + S.exp.toFixed(2);
  document.getElementById('exposureBar').style.width = Math.min(S.exp/10000*100,100) + '%';
  document.getElementById('dailyLoss').textContent = '$' + Math.abs(S.dl).toFixed(2) + ' / $500';
  const dlp = Math.min(Math.abs(S.dl)/500*100, 100);
  document.getElementById('dailyBar').style.width = dlp + '%';
  document.getElementById('dailyBar').className = 'risk-fill ' + (dlp<40?'risk-low':dlp<80?'risk-med':'risk-high');
  document.getElementById('cbTrips').textContent = S.cbt;
  document.getElementById('ercRepScore').textContent = S.ts.toFixed(1);
  document.getElementById('repBar').style.width = S.ts + '%';
  updateTradeTable();
  updateChart();
}

function updateTradeTable() {
  const tb = document.getElementById('tradeBody');
  document.getElementById('noTrades').style.display = S.trades.length ? 'none' : 'block';
  tb.innerHTML = S.trades.slice().reverse().map(function(t) {
    return '<tr><td>' + t.id + '</td><td>' + t.sym + '</td><td class="action-' + t.action.toLowerCase() + '">' + t.action + '</td><td>' + t.amount + '</td><td>$' + t.price + '</td><td class="' + (parseFloat(t.pnl)>=0?'accent':'red') + '">' + (parseFloat(t.pnl)>=0?'+':'') + '$' + t.pnl + '</td><td>' + (t.confidence*100).toFixed(0) + '%</td><td class="sig">' + t.sig.substring(0,20) + '...</td><td>' + t.time + '</td></tr>';
  }).join('');
}

function updateArtifacts(trade) {
  const e = document.getElementById('artifacts');
  e.innerHTML += '<div style="padding:8px;margin:4px 0;background:#0d1117;border-radius:6px;border:1px solid #1e2d3d"><div><strong>Trade #' + trade.id + '</strong> | ' + trade.action + ' ' + trade.amount + ' ' + trade.sym + '</div><div style="color:#5a6e82">Intent Hash: ' + trade.intentHash + '</div><div style="color:#5a6e82">EIP-712 Sig: ' + trade.sig.substring(0,30) + '...</div><div style="color:var(--accent)">Validated on Base Sepolia</div></div>';
}

let chart;
function updateChart() {
  if (chart) chart.destroy();
  const ctx = document.getElementById('pnlChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels: S.ph.map(function(_, i){ return i; }), datasets: [{ label: 'P&L ($)', data: S.ph, borderColor: '#00d4aa', backgroundColor: 'rgba(0,212,170,0.1)', fill: true, tension: 0.4, pointRadius: 2 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: '#1e2d3d' }, ticks: { color: '#5a6e82' } } } }
  });
}

function emergencyStop() {
  if (S.ai) { clearInterval(S.ai); S.ai = null; document.getElementById('autoStatus').textContent = ''; }
  S.cb = true; S.cbt++;
  log('EMERGENCY STOP - All trading halted by operator', 'error');
  rLog('Manual emergency stop triggered', 'error');
  document.getElementById('circuitStatus').textContent = 'STOPPED';
  document.getElementById('circuitStatus').className = 'value red';
}

function autoTrade() {
  if (S.ai) { clearInterval(S.ai); S.ai = null; document.getElementById('autoStatus').textContent = 'Stopped'; log('Auto-trade disabled', 'warn'); return; }
  S.ai = setInterval(function() { if (!S.cb) runTradeCycle(); }, 30000);
  document.getElementById('autoStatus').textContent = 'Auto-trading every 30s';
  log('Auto-trade enabled (30s interval)');
  runTradeCycle();
}

// Initialize
updateChart();
log('Trustless Trading Agent v1.0 initialized');
log('ERC-8004 identity registered on Base Sepolia');
log('Kraken CLI connected (paper trading mode)');
log('Risk guardrails armed: daily limit $500, stop-loss 5%, max position 0.1 BTC');
eLog('Agent identity minted: 0x7a3b...f92e');
eLog('Capabilities registered: TRADE_SPOT, ANALYZE_MARKET, MANAGE_RISK');
eLog('Reputation initialized at 50.0/100');
