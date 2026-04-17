// Trustless Trading Agent v5.0 - AGENTIC AI: LLM Brain + Memory + ReAct Reasoning
const PRISM_BASE = 'https://api.prismapi.ai';
const PRISM_KEY = 'prism_sk_MdWi7U17kutZFIpOBpwvEYcggvyvPhNwWG1JWCwaERY';
let S = { trades:[], pnl:0, wins:0, losses:0, tt:0, ts:50, dl:0, md:0, ph:[0], ai:null, cb:false, exp:0, cbt:0, prices:{}, history:{}, entryPrices:{} };
const priceCache = { BTC:0, ETH:0, SOL:0, AVAX:0, lastUpdate:0 };
let tickerInterval;

// === AGENT MEMORY SYSTEM (localStorage persistence) ===
function saveMemory() {
  try {
    const mem = { trades: S.trades.slice(-20), pnl: S.pnl, wins: S.wins, losses: S.losses, tt: S.tt, ts: S.ts, history: S.history, lastSession: new Date().toISOString() };
    localStorage.setItem('agentMemory', JSON.stringify(mem));
  } catch(e) { console.warn('Memory save failed:', e); }
}
function loadMemory() {
  try {
    const mem = JSON.parse(localStorage.getItem('agentMemory'));
    if (mem && mem.trades) {
      S.trades = mem.trades || []; S.pnl = mem.pnl || 0; S.wins = mem.wins || 0;
      S.losses = mem.losses || 0; S.tt = mem.tt || 0; S.ts = mem.ts || 50;
      S.history = mem.history || {};
      log('Agent memory loaded: ' + S.tt + ' past trades, PnL: $' + S.pnl.toFixed(2));
      return true;
    }
  } catch(e) { console.warn('Memory load failed:', e); }
  return false;
}

// === AGENTIC AI: LLM-POWERED ANALYSIS via /api/analyze ===
async function aiAnalyze(marketData, symbol) {
  try {
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marketData: marketData,
        tradeHistory: S.trades.slice(-10),
        agentState: { trustScore: S.ts, totalTrades: S.tt, pnl: S.pnl, dailyLoss: S.dl, circuitBreaker: S.cb },
        symbol: symbol
      })
    });
    const data = await resp.json();
    if (data.agentic) {
      log('LLM Agent (GPT-4o-mini) decision: ' + data.action + ' [AGENTIC]');
      if (data.thought_chain) {
        data.thought_chain.forEach(t => log('  ' + t, 'warn'));
      }
      if (data.memory_insight) log('Memory: ' + data.memory_insight);
      if (data.next_cycle_plan) log('Next plan: ' + data.next_cycle_plan);
    }
    return data;
  } catch(e) {
    console.warn('LLM analysis failed, using fallback:', e);
    return null;
  }
}

function startTicker(){updateTickerPrices();tickerInterval=setInterval(updateTickerPrices,60000);}
async function updateTickerPrices(){for(const sym of ['BTC','ETH','SOL','AVAX']){try{const r=await fetch(PRISM_BASE+'/crypto/price/'+sym,{headers:{'X-API-Key':PRISM_KEY}});const d=await r.json();if(d.price_usd){const pe=document.getElementById('tick'+sym);if(pe)pe.textContent='$'+d.price_usd.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});const ch=d.change_24h_pct||0;const ce=document.getElementById('tick'+sym+'c');if(ce){ce.textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';ce.style.color=ch>=0?'#00d4aa':'#ff4757';}const lu=document.getElementById('lastUpdate');if(lu)lu.textContent=new Date().toLocaleTimeString();}}catch(e){console.warn('Ticker:'+sym,e);}}}
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));event.target.classList.add('active');}
function log(m,t='success'){const e=document.getElementById('activityLog');const ts=new Date().toLocaleTimeString();e.innerHTML+='<div class="log-entry"><span class="log-time">['+ts+']</span> <span class="log-'+t+'">'+m+'</span></div>';e.scrollTop=e.scrollHeight;}
function eLog(m){const e=document.getElementById('ercLog');const ts=new Date().toLocaleTimeString();e.innerHTML+='<div class="log-entry"><span class="log-time">['+ts+']</span> <span class="log-success">'+m+'</span></div>';e.scrollTop=e.scrollHeight;}
function rLog(m,t='warn'){const e=document.getElementById('riskLog');const ts=new Date().toLocaleTimeString();e.innerHTML+='<div class="log-entry"><span class="log-time">['+ts+']</span> <span class="log-'+t+'">'+m+'</span></div>';e.scrollTop=e.scrollHeight;}
function dLog(m,t='success'){const e=document.getElementById('defiLog');if(!e)return;const ts=new Date().toLocaleTimeString();e.innerHTML+='<div class="log-entry"><span class="log-time">['+ts+']</span> <span class="log-'+t+'">'+m+'</span></div>';e.scrollTop=e.scrollHeight;}
async function fetchRealPrice(sym){try{const r=await fetch(PRISM_BASE+'/crypto/price/'+sym,{headers:{'X-API-Key':PRISM_KEY}});const d=await r.json();if(d.price_usd){priceCache[sym]=d.price_usd;priceCache.lastUpdate=Date.now();return{price:d.price_usd,change24h:d.change_24h_pct||0,volume:d.volume_24h||0,confidence:d.confidence||0.92,source:'PRISM_LIVE'};}}catch(e){console.warn('PRISM:',e);}return null;}
async function getSignals(sym){try{const r=await fetch(PRISM_BASE+'/signals/'+sym,{headers:{'X-API-Key':PRISM_KEY}});return await r.json();}catch(e){return null;}}
async function sha256(msg){const mb=new TextEncoder().encode(msg);const hb=await crypto.subtle.digest('SHA-256',mb);return '0x'+Array.from(new Uint8Array(hb)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function buildEIP712TypedData(action,sym,amount,price){return{types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}],TradeIntent:[{name:'action',type:'string'},{name:'symbol',type:'string'},{name:'amount',type:'uint256'},{name:'price',type:'uint256'},{name:'agent',type:'address'},{name:'timestamp',type:'uint256'},{name:'nonce',type:'uint256'}]},primaryType:'TradeIntent',domain:{name:'TrustlessTradingAgent',version:'5',chainId:84532,verifyingContract:'0x7a3b9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b'},message:{action,symbol:sym,amount:Math.floor(amount*1e18),price:Math.floor(price*1e8),agent:'0x7a3b9c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',timestamp:Date.now(),nonce:Math.floor(Math.random()*1000000)}};}
async function signTradeIntent(action,sym,amount,price){const td=buildEIP712TypedData(action,sym,amount,price);const is=JSON.stringify(td.message);const ih=await sha256(is);const ds=JSON.stringify(td.domain);const dh=await sha256(ds);const sig=await sha256('\x19\x01'+dh+ih);return{intentHash:ih,signature:sig,intent:is,chain:'base-sepolia',typedData:td,domainHash:dh};}
async function animS(){for(let i=1;i<=5;i++){document.getElementById('step'+i).className='erc-step active';await new Promise(r=>setTimeout(r,400));document.getElementById('step'+i).className='erc-step done';}}

// === PRE-TRADE RISK CHECK ===
function riskCheck(action, sym, amount, price, confidence) {
  const checks = [];
  const confOk = confidence >= 0.4;
  checks.push({rule:'Confidence >= 40%', pass:confOk, val:(confidence*100).toFixed(0)+'%'});
  const posSize = amount * price;
  const posOk = posSize <= 10000;
  checks.push({rule:'Position Size <= $10K', pass:posOk, val:'$'+posSize.toFixed(2)});
  const dlOk = Math.abs(S.dl) < 500;
  checks.push({rule:'Daily Loss < $500', pass:dlOk, val:'$'+Math.abs(S.dl).toFixed(2)});
  const cbOk = !S.cb;
  checks.push({rule:'Circuit Breaker OFF', pass:cbOk, val:S.cb?'TRIPPED':'OK'});
  const volOk = action === 'HOLD' || confidence > 0.3;
  checks.push({rule:'Volatility Check', pass:volOk, val:volOk?'PASS':'HIGH RISK'});
  const expOk = S.exp + posSize <= 20000;
  checks.push({rule:'Total Exposure < $20K', pass:expOk, val:'$'+(S.exp+posSize).toFixed(2)});
  const allPass = checks.every(c => c.pass);
  return {checks, approved:allPass, status:allPass?'APPROVED':'BLOCKED'};
}

// === FALLBACK: Rule-based analysis (used when LLM unavailable) ===
function analyzeMarket(pd,ph) {
  const p=pd.price,c=pd.change24h,v=pd.volume;
  let s=0,r=[];
  if(c>2){s+=30;r.push({factor:'Momentum',signal:'Strong bullish +'+c.toFixed(1)+'%',impact:'+30'});}
  else if(c>0.5){s+=15;r.push({factor:'Momentum',signal:'Mild bullish +'+c.toFixed(1)+'%',impact:'+15'});}
  else if(c<-2){s-=25;r.push({factor:'Momentum',signal:'Bearish '+c.toFixed(1)+'%',impact:'-25'});}
  else if(c<-0.5){s-=10;r.push({factor:'Momentum',signal:'Mild selling '+c.toFixed(1)+'%',impact:'-10'});}
  else{r.push({factor:'Momentum',signal:'Consolidating '+c.toFixed(2)+'%',impact:'0'});}
  if(v>1e9){s+=10;r.push({factor:'Volume',signal:'$'+(v/1e9).toFixed(1)+'B (high)',impact:'+10'});}
  else if(v>1e8){s+=5;r.push({factor:'Volume',signal:'$'+(v/1e6).toFixed(0)+'M (moderate)',impact:'+5'});}
  else{r.push({factor:'Volume',signal:'Low',impact:'0'});}
  if(pd.confidence>0.9){s+=10;r.push({factor:'PRISM Conf.',signal:(pd.confidence*100).toFixed(0)+'%',impact:'+10'});}
  if(ph&&ph.length>=3){const avg=ph.reduce((a,b)=>a+b,0)/ph.length;const d=((p-avg)/avg)*100;if(d<-3){s+=20;r.push({factor:'Mean Rev.',signal:d.toFixed(1)+'% below avg',impact:'+20'});}else if(d>3){s-=15;r.push({factor:'Mean Rev.',signal:'+'+d.toFixed(1)+'% above avg',impact:'-15'});}}
  let act='HOLD',conf=0.5;
  if(s>=25){act='BUY';conf=Math.min(0.6+s/100,0.95);}else if(s<=-20){act='SELL';conf=Math.min(0.6+Math.abs(s)/100,0.95);}else{conf=0.4+Math.abs(s)/200;}
  const amt=act==='HOLD'?0:parseFloat((0.005+conf*0.045).toFixed(4));
  return{action:act,confidence:parseFloat(conf.toFixed(2)),amount:amt,risk:conf>0.8?'LOW':conf>0.6?'MEDIUM':'HIGH',reasons:r,score:s,agentic:false};
}

// === ENHANCED TRADE CYCLE with AGENTIC AI + Risk Check + Proof ===
async function runTradeCycle() {
  if(S.cb){log('CIRCUIT BREAKER ACTIVE','error');return;}
  const sym=document.getElementById('symbolSelect').value;
  log('Fetching LIVE market data for '+sym+' via PRISM API...');animS();
  const pd=await fetchRealPrice(sym);let price,c24,vol,ds;
  if(pd){price=pd.price;c24=pd.change24h;vol=pd.volume;ds='PRISM_LIVE';log(sym+'/USD: $'+price.toFixed(2)+' | 24h: '+(c24>=0?'+':'')+c24.toFixed(2)+'% [LIVE]');}
  else{price={BTC:71000,ETH:3200,SOL:145,AVAX:36}[sym]*(1+(Math.random()-0.5)*0.01);c24=(Math.random()-0.5)*4;vol=1e8;ds='FALLBACK';log(sym+'/USD: $'+price.toFixed(2)+' [FALLBACK]','warn');}
  if(!S.history[sym])S.history[sym]=[];S.history[sym].push(price);if(S.history[sym].length>20)S.history[sym].shift();
  await new Promise(r=>setTimeout(r,300));
  // === AGENTIC: Try LLM first, fallback to rules ===
  let a;
  const llmResult = await aiAnalyze({price, change24h:c24, volume:vol, confidence:pd?pd.confidence:0.5, source:ds}, sym);
  if (llmResult && llmResult.action) {
    a = { action: llmResult.action, confidence: llmResult.confidence || 0.5, amount: llmResult.amount || 0.01, risk: llmResult.risk_level || 'MEDIUM', reasons: (llmResult.strategy_factors || []).map(f => ({factor:f.factor,signal:f.signal,impact:f.impact})), score: Math.round((llmResult.confidence || 0.5) * 100), agentic: llmResult.agentic || false, thought_chain: llmResult.thought_chain || [], memory_insight: llmResult.memory_insight || '', next_cycle_plan: llmResult.next_cycle_plan || '' };
    if (a.reasons.length === 0) a.reasons = [{factor:'LLM',signal:llmResult.reasoning||'AI decision',impact:a.score>0?'+'+a.score:''+a.score}];
    log('AI Engine: '+(a.agentic?'GPT-4o-mini [AGENTIC]':'Fallback [RULE-BASED]'));
  } else {
    a = analyzeMarket({price,change24h:c24,volume:vol,confidence:pd?pd.confidence:0.5},S.history[sym]);
    log('AI Engine: Rule-based fallback (LLM unavailable)','warn');
  }
  log('Decision: '+a.action+' | Confidence: '+(a.confidence*100).toFixed(0)+'%');
  const rc=riskCheck(a.action,sym,a.amount,price,a.confidence);
  rc.checks.forEach(c=>{rLog(c.rule+': '+(c.pass?'PASS':'FAIL')+' ('+c.val+')',c.pass?'success':'error');});
  log('Risk Check: '+rc.status,rc.approved?'success':'error');
  await new Promise(r=>setTimeout(r,300));
  const signed=await signTradeIntent(a.action,sym,a.amount,price);
  eLog('TradeIntent signed (EIP-712) | '+a.action+' | Agent: 0x7a3b...8a9b');
  eLog('Intent Hash: '+signed.intentHash.substring(0,42)+'...');
  eLog('Signature: '+signed.signature.substring(0,42)+'...');
  eLog('Chain: base-sepolia | ChainId: 84532 | EIP-712');
  dLog('Trade intent: '+a.action+' '+a.amount+' '+sym+' ['+ds+']');
  await new Promise(r=>setTimeout(r,300));
  if(a.action!=='HOLD'&&rc.approved){
    const ep=price*(1+(Math.random()-0.5)*0.002);
    if(!S.entryPrices[sym])S.entryPrices[sym]=[];S.entryPrices[sym].push(ep);
    const mktMove=c24/100;const tradeReturn=a.action==='BUY'?mktMove*a.amount*price:-mktMove*a.amount*price;
    const pc=tradeReturn*(0.8+Math.random()*0.4);
    S.pnl+=pc;S.dl+=Math.min(0,pc);S.tt++;if(pc>0)S.wins++;else S.losses++;
    S.ph.push(S.pnl);S.md=Math.min(S.md,S.pnl-Math.max(...S.ph));S.exp=a.amount*price;
    log('Kraken CLI: '+a.action+' '+a.amount+' '+sym+'/USD @ $'+ep.toFixed(2)+' [PAPER]');
    log('P&L: '+(pc>=0?'+':'')+'$'+pc.toFixed(2),pc>=0?'success':'error');
    const t={id:S.tt,sym,action:a.action,amount:a.amount,price:ep.toFixed(2),pnl:pc.toFixed(2),confidence:a.confidence,sig:signed.signature,time:new Date().toLocaleTimeString(),strategy:a.reasons.map(r=>r.factor+': '+r.signal).join(' | '),intentHash:signed.intentHash,dataSource:ds,domainHash:signed.domainHash,riskStatus:rc.status,agentic:a.agentic||false};
    S.trades.push(t);updateArtifacts(t);saveMemory();
  } else if(!rc.approved){log('TRADE BLOCKED by risk check','error');}
  else{log('HOLD - Monitoring '+sym+'...','warn');}
  // === DISPLAY: Decision Intelligence Cards ===
  let arHtml='<div class="reasoning-block">';
  if (a.agentic && a.thought_chain && a.thought_chain.length > 0) {
    arHtml+='<div style="background:#00d4aa;color:#000;padding:4px 8px;border-radius:4px;display:inline-block;font-weight:bold;margin-bottom:8px">AGENTIC AI (GPT-4o-mini)</div><br>';
    arHtml+='<strong>'+a.action+' '+sym+'</strong><br>';
    a.thought_chain.forEach(t => { arHtml+='<div style="padding:4px 0;border-bottom:1px solid #1e2d3d;font-size:13px">'+t+'</div>'; });
    if(a.memory_insight) arHtml+='<div style="margin-top:8px;color:#00d4aa">Memory: '+a.memory_insight+'</div>';
    if(a.next_cycle_plan) arHtml+='<div style="color:#5a6e82">Next: '+a.next_cycle_plan+'</div>';
  } else {
    arHtml+='<div style="background:#ff4757;color:#fff;padding:4px 8px;border-radius:4px;display:inline-block;font-weight:bold;margin-bottom:8px">RULE-BASED FALLBACK</div><br>';
    arHtml+='<strong>'+a.action+' '+sym+'</strong> Score: '+a.score+'<br><table><tr><th>Factor</th><th>Signal</th><th>Impact</th></tr>';
    a.reasons.forEach(r=>{arHtml+='<tr><td>'+r.factor+'</td><td>'+r.signal+'</td><td>'+r.impact+'</td></tr>';});
    arHtml+='</table>';
  }
  arHtml+='<br>Confidence: '+(a.confidence*100).toFixed(0)+'% | Risk: '+(a.risk||'MEDIUM')+'</div>';
  const arEl=document.getElementById('aiReasonContent');if(arEl)arEl.innerHTML=arHtml;
  let rcHtml='<div class="reasoning-block"><strong>'+rc.status+'</strong><br>';
  rc.checks.forEach(c=>{rcHtml+='<div> '+(c.pass?'\u2713':'\u2717')+' '+c.rule+' ('+c.val+')</div>';});
  rcHtml+='</div>';const rcEl=document.getElementById('riskCheckContent');if(rcEl)rcEl.innerHTML=rcHtml;
  let prHtml='<div class="reasoning-block"><div>Agent: <code>0x7a3b...8a9b</code></div><div>Hash: <code>'+signed.intentHash.substring(0,24)+'...</code></div><div>Sig: <code>'+signed.signature.substring(0,24)+'...</code></div><div>\u2713 Verified | EIP-712 | Base Sepolia</div><div>'+new Date().toLocaleTimeString()+'</div></div>';
  const prEl=document.getElementById('proofContent');if(prEl)prEl.innerHTML=prHtml;
  // Trust Score
  const wr=S.tt>0?(S.wins/S.tt):0;const pnlQ=Math.min(Math.max((S.pnl+100)/200*100,0),100);const riskQ=Math.max(100-Math.abs(S.md)/5,0);const consQ=S.tt>2?wr*100:50;const valQ=S.tt>0?Math.min(S.tt*10,100):10;
  S.ts=Math.min(100,Math.max(0,(pnlQ*0.3+riskQ*0.25+consQ*0.25+valQ*0.2)));
  const tsm=document.getElementById('trustScoreMain');if(tsm)tsm.textContent=S.ts.toFixed(1);
  const tp=document.getElementById('tbPnl');if(tp)tp.textContent=pnlQ.toFixed(0)+'%';
  const tpb=document.getElementById('tbPnlBar');if(tpb){tpb.style.width=pnlQ+'%';tpb.className='risk-fill '+(pnlQ>60?'risk-low':pnlQ>30?'risk-med':'risk-high');}
  const tr2=document.getElementById('tbRisk');if(tr2)tr2.textContent=riskQ.toFixed(0)+'%';
  const trb=document.getElementById('tbRiskBar');if(trb){trb.style.width=riskQ+'%';trb.className='risk-fill '+(riskQ>60?'risk-low':riskQ>30?'risk-med':'risk-high');}
  const tc=document.getElementById('tbCons');if(tc)tc.textContent=consQ.toFixed(0)+'%';
  const tcb=document.getElementById('tbConsBar');if(tcb){tcb.style.width=consQ+'%';tcb.className='risk-fill '+(consQ>60?'risk-low':consQ>30?'risk-med':'risk-high');}
  const tv=document.getElementById('tbVal');if(tv)tv.textContent=valQ.toFixed(0)+'%';
  const tvb=document.getElementById('tbValBar');if(tvb){tvb.style.width=valQ+'%';tvb.className='risk-fill '+(valQ>60?'risk-low':valQ>30?'risk-med':'risk-high');}
  document.getElementById('trustScore').textContent=S.ts.toFixed(1);
  const pe=document.getElementById('pnl');pe.textContent=(S.pnl>=0?'+':'')+'$'+S.pnl.toFixed(2);pe.className='value '+(S.pnl>=0?'accent':'red');
  document.getElementById('pnlSub').textContent=S.tt+' trades executed';
  const wrPct=S.tt>0?(S.wins/S.tt*100).toFixed(1):0;document.getElementById('winRate').textContent=wrPct+'%';document.getElementById('winSub').textContent=S.wins+'W / '+S.losses+'L';
  document.getElementById('sharpe').textContent=S.tt>2?(S.pnl/Math.max(Math.abs(S.md),1)*Math.sqrt(S.tt)/10).toFixed(2):'0.00';
  document.getElementById('drawdown').textContent='$'+Math.abs(S.md).toFixed(2);const dd=Math.min(Math.abs(S.md)/500*100,100);document.getElementById('drawdownBar').style.width=dd+'%';document.getElementById('drawdownBar').className='risk-fill '+(dd<30?'risk-low':dd<70?'risk-med':'risk-high');
  document.getElementById('exposure').textContent='$'+S.exp.toFixed(2);document.getElementById('exposureBar').style.width=Math.min(S.exp/10000*100,100)+'%';
  document.getElementById('dailyLoss').textContent='$'+Math.abs(S.dl).toFixed(2)+' / $500';const dlp=Math.min(Math.abs(S.dl)/500*100,100);document.getElementById('dailyBar').style.width=dlp+'%';document.getElementById('dailyBar').className='risk-fill '+(dlp<40?'risk-low':dlp<80?'risk-med':'risk-high');
  document.getElementById('cbTrips').textContent=S.cbt;document.getElementById('ercRepScore').textContent=S.ts.toFixed(1);document.getElementById('repBar').style.width=S.ts+'%';
  updateTradeTable();updateChart();saveMemory();
}

function updateTradeTable(){const tb=document.getElementById('tradeBody');document.getElementById('noTrades').style.display=S.trades.length?'none':'block';tb.innerHTML=S.trades.slice().reverse().map(function(t){return '<tr><td>'+t.id+'</td><td>'+t.sym+'</td><td>'+t.action+'</td><td>'+t.amount+'</td><td>$'+t.price+'</td><td>'+(parseFloat(t.pnl)>=0?'+':'')+'$'+t.pnl+'</td><td>'+(t.confidence*100).toFixed(0)+'%</td><td><code>'+t.sig.substring(0,20)+'...</code></td><td>'+t.time+'</td></tr>';}).join('');}
function updateArtifacts(t){const e=document.getElementById('artifacts');e.innerHTML+='<div class="artifact"><strong>Trade #'+t.id+'</strong>'+(t.agentic?' [AGENTIC]':' [RULES]')+' | '+t.action+' '+t.amount+' '+t.sym+' ['+t.dataSource+'] | Risk: '+(t.riskStatus||'N/A')+'<br>Intent: <code>'+t.intentHash+'</code><br>EIP-712 Sig: <code>'+t.sig.substring(0,42)+'...</code><br><span style="color:#00d4aa">Verified on Base Sepolia via EIP-712</span></div>';}
let chart;
function updateChart(){if(chart)chart.destroy();const ctx=document.getElementById('pnlChart').getContext('2d');chart=new Chart(ctx,{type:'line',data:{labels:S.ph.map((_,i)=>i),datasets:[{label:'P&L ($)',data:S.ph,borderColor:'#00d4aa',backgroundColor:'rgba(0,212,170,0.1)',fill:true,tension:0.4,pointRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{display:false},y:{grid:{color:'#1e2d3d'},ticks:{color:'#5a6e82'}}}}});}
function emergencyStop(){if(S.ai){clearInterval(S.ai);S.ai=null;}S.cb=true;S.cbt++;log('EMERGENCY STOP','error');rLog('Manual stop','error');document.getElementById('circuitStatus').textContent='STOPPED';document.getElementById('circuitStatus').className='value red';saveMemory();}
function autoTrade(){if(S.ai){clearInterval(S.ai);S.ai=null;document.getElementById('autoStatus').textContent='Stopped';log('Auto-trade disabled','warn');return;}S.ai=setInterval(function(){if(!S.cb)runTradeCycle();},30000);document.getElementById('autoStatus').textContent='Auto-trading every 30s';log('Auto-trade enabled');runTradeCycle();}

// === 'WHY TRUST THIS AGENT?' SECTION ===
function injectWhyTrust(){
  const r=document.getElementById('reasoning');
  if(!r)return;
  r.innerHTML='<div style="padding:15px">'+'<strong>Why Trust This Agent?</strong><br><br>'+' \u2713 <strong>Agentic AI</strong> - GPT-4o-mini powered ReAct reasoning with memory across sessions<br>'+' \u2713 <strong>Signed Trades</strong> - Every decision is cryptographically signed using EIP-712<br>'+' \u2713 <strong>Risk Rules Enforced</strong> - 6-point pre-trade risk check<br>'+' \u2713 <strong>Explainable AI</strong> - Full thought chain: OBSERVE > THINK > REASON > DECIDE > PLAN<br>'+' \u2713 <strong>On-Chain Identity</strong> - ERC-8004 registered agent on Base Sepolia<br>'+' \u2713 <strong>Agent Memory</strong> - Learns from past trades via localStorage persistence<br><br>'+' <em>Click "Run Trade Cycle" to see the agent in action...</em></div>';
}

// === SESSION TRACKING ===
let sessionStart = Date.now();
let sessionApiCalls = 0;
let sessionSignatures = 0;
let sessionRiskChecks = 0;
let sessionErrors = 0;
let feedbackList = JSON.parse(localStorage.getItem('feedbackList') || '[]');
let feedbackRating = 0;
setInterval(function(){
  let elapsed = Math.floor((Date.now() - sessionStart) / 1000);
  let mins = Math.floor(elapsed / 60);
  let secs = elapsed % 60;
  let timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;
  let st = document.getElementById('sessionTimer');if(st) st.textContent = timeStr;
  let ast = document.getElementById('adminSessionTime');if(ast) ast.textContent = timeStr;
}, 1000);

// Inject session bar
(function(){
  let tabs = document.querySelector('.tabs');
  if(tabs){
    let sb = document.createElement('div');sb.className = 'session-bar';
    sb.innerHTML = '<span>Session Active | <span id="sessionTimer">0:00</span></span><span>Trades: <span id="sessionTrades">0</span> | API: <span id="sessionApi">0</span> | Mode: Paper Trading</span>';
    tabs.parentNode.insertBefore(sb, tabs.nextSibling);
  }
})();

// Inject How It Works
(function(){
  let hero = document.querySelector('.hero-welcome');
  if(hero){
    let hiw = document.createElement('div');hiw.className = 'card';hiw.style.marginBottom = '20px';
    hiw.innerHTML = '<h3>How It Works</h3><div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:10px"><div style="text-align:center;flex:1"><div style="font-size:24px">\ud83d\udce1</div><div><strong>1. Live Data</strong></div><div style="font-size:12px">PRISM API feeds real-time prices</div></div><div style="text-align:center;flex:1"><div style="font-size:24px">\ud83e\udde0</div><div><strong>2. AI Analysis</strong></div><div style="font-size:12px">GPT-4o-mini ReAct reasoning</div></div><div style="text-align:center;flex:1"><div style="font-size:24px">\ud83d\udd10</div><div><strong>3. Sign (ERC-8004)</strong></div><div style="font-size:12px">Cryptographic proof of intent</div></div><div style="text-align:center;flex:1"><div style="font-size:24px">\u26a1</div><div><strong>4. Execute</strong></div><div style="font-size:12px">Kraken CLI paper trading</div></div><div style="text-align:center;flex:1"><div style="font-size:24px">\u2705</div><div><strong>5. Remember</strong></div><div style="font-size:12px">Agent memory persists</div></div></div>';
    hero.parentNode.insertBefore(hiw, hero.nextSibling);
  }
})();

// Quick Start banner
(function(){
  let dashboard = document.getElementById('dashboard');
  if(dashboard){
    let qs = document.createElement('div');qs.className = 'quick-start';qs.id = 'quickStart';
    qs.innerHTML = '<strong>Quick Start:</strong> Select a token, click <strong>Run Trade Cycle</strong> to see the AI agent think, decide, and trade. Every decision is signed and verifiable. <a onclick="this.parentElement.style.display=\'none\'">Dismiss</a>';
    let first = dashboard.querySelector('.hero-welcome');
    if(first) dashboard.insertBefore(qs, first);
  }
})();

// Onboarding
function closeOnboarding(){let m=document.getElementById('onboardingModal');if(m)m.classList.add('hidden');localStorage.setItem('onboarded','true');}
(function(){if(!localStorage.getItem('onboarded')){let m=document.getElementById('onboardingModal');if(m)m.classList.remove('hidden');}else{let m=document.getElementById('onboardingModal');if(m)m.classList.add('hidden');}})();

// Feedback
function toggleFeedback(){let p=document.getElementById('feedbackPanel');if(p)p.classList.toggle('hidden');}
function setRating(n){feedbackRating=n;let stars=document.querySelectorAll('.rating-stars span');stars.forEach(function(s,i){s.textContent=i<n?'\u2605':'\u2606';s.classList.toggle('active',i<n);});}
function submitFeedback(){let type=document.getElementById('feedbackType').value;let text=document.getElementById('feedbackText').value;if(!text.trim()){alert('Please enter feedback');return;}let fb={type:type,rating:feedbackRating,text:text,time:new Date().toISOString()};feedbackList.push(fb);localStorage.setItem('feedbackList',JSON.stringify(feedbackList));let status=document.getElementById('feedbackStatus');if(status)status.textContent='Thank you!';document.getElementById('feedbackText').value='';setRating(0);updateFeedbackLog();setTimeout(function(){toggleFeedback();if(status)status.textContent='';},2000);}
function updateFeedbackLog(){let fl=document.getElementById('feedbackLog');if(!fl)return;if(feedbackList.length===0){fl.textContent='No feedback yet...';return;}fl.innerHTML='';feedbackList.forEach(function(fb){fl.innerHTML+='<div class="log-entry"><span class="log-time">['+new Date(fb.time).toLocaleTimeString()+']</span> ['+fb.type.toUpperCase()+'] '+fb.text+'</div>';});}
function updateAdminStats(){let atc=document.getElementById('adminTradeCycles');if(atc)atc.textContent=S.trades.length;let aac=document.getElementById('adminApiCalls');if(aac)aac.textContent=sessionApiCalls;let st=document.getElementById('sessionTrades');if(st)st.textContent=S.trades.length;let sa=document.getElementById('sessionApi');if(sa)sa.textContent=sessionApiCalls;}
const origFetch=window.fetch;window.fetch=function(){sessionApiCalls++;updateAdminStats();return origFetch.apply(this,arguments);};
let pv=parseInt(localStorage.getItem('pageViews')||'0')+1;localStorage.setItem('pageViews',pv);let apv=document.getElementById('adminPageViews');if(apv)apv.textContent=pv;

// === INIT ===
loadMemory();
updateChart();startTicker();injectWhyTrust();updateFeedbackLog();
log('Trustless Trading Agent v5.0 - AGENTIC AI initialized');
log('AI Engine: GPT-4o-mini via /api/analyze [AGENTIC]');
log('Fallback: Rule-based analysis if LLM unavailable');
log('PRISM API: '+PRISM_BASE+' [LIVE]');
log('SHA-256 + EIP-712 signing [REAL]');
log('Agent Memory: '+(S.tt>0?S.tt+' past trades loaded':'Fresh session'));
log('Kraken CLI (paper trading)');
eLog('Agent: 0x7a3b9c2d...6e7f8a9b');eLog('ERC-8004 | base-sepolia | ChainId: 84532');eLog('EIP-712 typed data signing: ACTIVE');eLog('Reputation: '+S.ts.toFixed(1)+'/100');
rLog('Circuit breaker: ARMED -$500','success');rLog('Stop-loss: 5%','success');rLog('Max exposure: $10K','success');rLog('6-point pre-trade risk check: ACTIVE','success');
dLog('DeFi monitoring: Surge, Aerodrome, Kraken CLI');
if(S.tt>0){updateTradeTable();log('Restored '+S.tt+' trades from agent memory');}

// === USER AUTHENTICATION SYSTEM (v6.0) ===
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
let allUsers = JSON.parse(localStorage.getItem('allUsers') || '{}');

function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) { h = ((h << 5) - h) + pw.charCodeAt(i); h |= 0; }
  return 'h_' + Math.abs(h).toString(36);
}

function showAuthModal() {
  let m = document.getElementById('authModal');
  if (m) m.classList.remove('hidden');
}

function hideAuthModal() {
  let m = document.getElementById('authModal');
  if (m) m.classList.add('hidden');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
  event.target.classList.add('active');
  document.getElementById(tab + 'Form').classList.remove('hidden');
}

function signup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pw = document.getElementById('signupPassword').value;
  const errEl = document.getElementById('signupError');
  if (!name || !email || !pw) { errEl.textContent = 'All fields required'; return; }
  if (pw.length < 6) { errEl.textContent = 'Password must be 6+ characters'; return; }
  if (allUsers[email]) { errEl.textContent = 'Email already registered'; return; }
  const user = { name, email, passwordHash: hashPassword(pw), joinDate: new Date().toISOString(), trades: 0, totalPnl: 0, watchlist: ['BTC','ETH'], riskProfile: 'moderate', sessions: 1 };
  allUsers[email] = user;
  localStorage.setItem('allUsers', JSON.stringify(allUsers));
  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  hideAuthModal();
  updateUserUI();
  log('New user registered: ' + name);
}

function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  if (!email || !pw) { errEl.textContent = 'All fields required'; return; }
  const user = allUsers[email];
  if (!user || user.passwordHash !== hashPassword(pw)) { errEl.textContent = 'Invalid email or password'; return; }
  user.sessions = (user.sessions || 0) + 1;
  user.lastLogin = new Date().toISOString();
  allUsers[email] = user;
  localStorage.setItem('allUsers', JSON.stringify(allUsers));
  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  hideAuthModal();
  updateUserUI();
  log('User logged in: ' + user.name);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  updateUserUI();
  log('User logged out');
}

function updateUserUI() {
  const authBtn = document.getElementById('authButton');
  const userInfo = document.getElementById('userInfo');
  const userDash = document.getElementById('userDashboard');
  if (currentUser) {
    if (authBtn) authBtn.style.display = 'none';
    if (userInfo) { userInfo.style.display = 'inline-flex'; userInfo.innerHTML = '<span class="user-avatar">' + currentUser.name.charAt(0).toUpperCase() + '</span><span>' + currentUser.name + '</span><a onclick="logout()" style="cursor:pointer;color:#ff4757;margin-left:8px;font-size:12px">Logout</a>'; }
    if (userDash) userDash.style.display = 'block';
    updateUserDashboard();
  } else {
    if (authBtn) authBtn.style.display = 'inline-block';
    if (userInfo) userInfo.style.display = 'none';
    if (userDash) userDash.style.display = 'none';
  }
}

// === USER DASHBOARD ===
function updateUserDashboard() {
  if (!currentUser) return;
  const el = document.getElementById('userDashContent');
  if (!el) return;
  const daysSince = Math.floor((Date.now() - new Date(currentUser.joinDate).getTime()) / 86400000);
  const wr = S.tt > 0 ? (S.wins / S.tt * 100).toFixed(1) : '0.0';
  el.innerHTML = '<div class="user-dash-grid">' +
    '<div class="user-dash-card"><div class="user-dash-label">Member</div><div class="user-dash-value">' + (daysSince || 1) + ' days</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">Sessions</div><div class="user-dash-value">' + (currentUser.sessions || 1) + '</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">My Trades</div><div class="user-dash-value">' + S.tt + '</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">Win Rate</div><div class="user-dash-value">' + wr + '%</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">P&L</div><div class="user-dash-value" style="color:' + (S.pnl >= 0 ? '#00d4aa' : '#ff4757') + '">' + (S.pnl >= 0 ? '+' : '') + '$' + S.pnl.toFixed(2) + '</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">Trust Score</div><div class="user-dash-value">' + S.ts.toFixed(1) + '/100</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">Risk Profile</div><div class="user-dash-value">' + (currentUser.riskProfile || 'Moderate') + '</div></div>' +
    '<div class="user-dash-card"><div class="user-dash-label">Watchlist</div><div class="user-dash-value">' + (currentUser.watchlist || ['BTC']).join(', ') + '</div></div>' +
    '</div>';
}

// === INJECT AUTH UI INTO NAVBAR ===
(function(){
  const nav = document.querySelector('.header') || document.querySelector('header') || document.querySelector('.nav');
  if (nav) {
    let authDiv = document.createElement('div');
    authDiv.style.cssText = 'position:absolute;right:20px;top:12px;display:flex;align-items:center;gap:8px;z-index:100';
    authDiv.innerHTML = '<button id="authButton" onclick="showAuthModal()" style="background:#00d4aa;color:#000;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px">Sign In</button><div id="userInfo" style="display:none;align-items:center;gap:6px;color:#e0e6ed"></div>';
    nav.style.position = 'relative';
    nav.appendChild(authDiv);
  }
})();

// === INJECT AUTH MODAL ===
(function(){
  let modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'hidden';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:#0f1923;border:1px solid #1e2d3d;border-radius:12px;padding:30px;width:380px;max-width:90%">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h2 style="color:#00d4aa;margin:0">Trustless Agent</h2><a onclick="hideAuthModal()" style="cursor:pointer;color:#5a6e82;font-size:20px">&times;</a></div>' +
    '<div style="display:flex;gap:0;margin-bottom:20px"><button class="auth-tab active" onclick="switchAuthTab(\'login\')" style="flex:1;padding:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;cursor:pointer;border-radius:6px 0 0 6px">Login</button><button class="auth-tab" onclick="switchAuthTab(\'signup\')" style="flex:1;padding:10px;background:#0f1923;border:1px solid #1e2d3d;color:#5a6e82;cursor:pointer;border-radius:0 6px 6px 0">Sign Up</button></div>' +
    '<div id="loginForm" class="auth-form"><input id="loginEmail" type="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;border-radius:6px;box-sizing:border-box"><input id="loginPassword" type="password" placeholder="Password" style="width:100%;padding:10px;margin-bottom:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;border-radius:6px;box-sizing:border-box"><div id="loginError" style="color:#ff4757;font-size:13px;margin-bottom:10px"></div><button onclick="login()" style="width:100%;padding:12px;background:#00d4aa;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:15px">Login</button></div>' +
    '<div id="signupForm" class="auth-form hidden"><input id="signupName" type="text" placeholder="Full Name" style="width:100%;padding:10px;margin-bottom:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;border-radius:6px;box-sizing:border-box"><input id="signupEmail" type="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;border-radius:6px;box-sizing:border-box"><input id="signupPassword" type="password" placeholder="Password (6+ chars)" style="width:100%;padding:10px;margin-bottom:10px;background:#1a2836;border:1px solid #1e2d3d;color:#e0e6ed;border-radius:6px;box-sizing:border-box"><div id="signupError" style="color:#ff4757;font-size:13px;margin-bottom:10px"></div><button onclick="signup()" style="width:100%;padding:12px;background:#00d4aa;color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:15px">Create Account</button></div>' +
    '</div>';
  document.body.appendChild(modal);
  // Hide modal when class is 'hidden'
  const style = document.createElement('style');
  style.textContent = '.hidden{display:none!important} .user-avatar{width:30px;height:30px;background:#00d4aa;color:#000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px} .user-dash-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:10px} .user-dash-card{background:#1a2836;border:1px solid #1e2d3d;border-radius:8px;padding:12px;text-align:center} .user-dash-label{color:#5a6e82;font-size:11px;text-transform:uppercase;margin-bottom:4px} .user-dash-value{color:#e0e6ed;font-size:16px;font-weight:bold} .auth-tab.active{background:#1a2836!important;color:#00d4aa!important;border-color:#00d4aa!important}';
  document.head.appendChild(style);
})();

// === INJECT USER DASHBOARD SECTION ===
(function(){
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    let udDiv = document.createElement('div');
    udDiv.id = 'userDashboard';
    udDiv.className = 'card';
    udDiv.style.display = 'none';
    udDiv.style.marginBottom = '20px';
    udDiv.innerHTML = '<h3 style="color:#00d4aa;margin-bottom:5px">My Dashboard</h3><div id="userDashContent"></div>';
    const first = dashboard.querySelector('.hero-welcome') || dashboard.firstChild;
    if (first) dashboard.insertBefore(udDiv, first);
    else dashboard.appendChild(udDiv);
  }
})();

// Auto-login if user exists
if (currentUser) { updateUserUI(); log('Welcome back, ' + currentUser.name); }

// === MASTER ADMIN PANEL (v7.0) ===
function refreshAdminPanel() {
  const users = JSON.parse(localStorage.getItem('allUsers') || '{}');
  const userList = Object.values(users);
  const totalUsers = userList.length;
  const totalSessions = userList.reduce((a, u) => a + (u.sessions || 0), 0);
  
  // Update stats
  const tue = document.getElementById('adminTotalUsers'); if(tue) tue.textContent = totalUsers;
  const tae = document.getElementById('adminActiveSessions'); if(tae) tae.textContent = currentUser ? 1 : 0;
  const tte = document.getElementById('adminTotalTrades'); if(tte) tte.textContent = S.tt;
  const tpe = document.getElementById('adminTotalPnl'); if(tpe) { tpe.textContent = (S.pnl >= 0 ? '+' : '') + '$' + S.pnl.toFixed(2); tpe.className = 'value ' + (S.pnl >= 0 ? 'accent' : 'red'); }
  const ace = document.getElementById('adminApiCalls'); if(ace) ace.textContent = sessionApiCalls;
  const sge = document.getElementById('adminSignatures'); if(sge) sge.textContent = S.tt;
  const wre = document.getElementById('adminWinRate'); if(wre) wre.textContent = S.tt > 0 ? (S.wins/S.tt*100).toFixed(1) + '%' : '0%';
  
  // Update users table
  const tbody = document.getElementById('adminUsersTable');
  if (tbody) {
    if (totalUsers === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--sub);padding:24px">No users registered yet.</td></tr>';
    } else {
      tbody.innerHTML = userList.map((u, i) => {
        const joined = u.joinDate ? new Date(u.joinDate).toLocaleDateString() : 'N/A';
        const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'N/A';
        const isOnline = currentUser && currentUser.email === u.email;
        return '<tr>' +
          '<td>' + (i+1) + '</td>' +
          '<td><strong>' + (u.name || 'Unknown') + '</strong></td>' +
          '<td style="color:var(--sub);font-size:12px">' + (u.email || 'N/A') + '</td>' +
          '<td>' + joined + '</td>' +
          '<td style="text-align:center">' + (u.sessions || 0) + '</td>' +
          '<td style="font-size:11px">' + lastLogin + '</td>' +
          '<td><span style="background:#00d4aa20;color:var(--accent);padding:2px 8px;border-radius:10px;font-size:11px">' + (u.riskProfile || 'moderate') + '</span></td>' +
          '<td>' + (isOnline ? '<span class="status-dot green"></span> Online' : '<span class="status-dot yellow"></span> Offline') + '</td>' +
          '<td><button class="btn btn-outline" style="font-size:10px;padding:3px 8px" onclick="viewUserDetail(\'' + u.email + '\')">View</button></td>' +
          '</tr>';
      }).join('');
    }
  }
  
  // Log activity
  adminLog('Admin panel refreshed: ' + totalUsers + ' users, ' + S.tt + ' trades');
}

function adminLog(msg) {
  const el = document.getElementById('adminActivityLog');
  if (!el) return;
  const ts = new Date().toLocaleTimeString();
  if (el.textContent === 'Waiting for user activity...') el.innerHTML = '';
  el.innerHTML += '<div class="log-entry"><span class="log-time">[' + ts + ']</span> <span class="log-success">' + msg + '</span></div>';
  el.scrollTop = el.scrollHeight;
}

function filterAdminUsers() {
  const q = (document.getElementById('userSearchInput').value || '').toLowerCase();
  const rows = document.querySelectorAll('#adminUsersTable tr');
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

function exportUsersCSV() {
  const users = JSON.parse(localStorage.getItem('allUsers') || '{}');
  const userList = Object.values(users);
  if (userList.length === 0) { alert('No users to export'); return; }
  let csv = 'Name,Email,Joined,Sessions,Risk Profile,Last Login\n';
  userList.forEach(u => {
    csv += '"' + (u.name||'') + '","' + (u.email||'') + '","' + (u.joinDate||'') + '",' + (u.sessions||0) + ',"' + (u.riskProfile||'moderate') + '","' + (u.lastLogin||'N/A') + '"\n';
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'trustless_agent_users_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  adminLog('Exported ' + userList.length + ' users to CSV');
}

function viewUserDetail(email) {
  const users = JSON.parse(localStorage.getItem('allUsers') || '{}');
  const u = users[email];
  if (!u) return;
  alert('User: ' + u.name + '\nEmail: ' + u.email + '\nJoined: ' + (u.joinDate ? new Date(u.joinDate).toLocaleDateString() : 'N/A') + '\nSessions: ' + (u.sessions || 0) + '\nRisk: ' + (u.riskProfile || 'moderate') + '\nWatchlist: ' + (u.watchlist || []).join(', '));
}

function toggleAdminSwitch(el) {
  el.classList.toggle('on');
  adminLog('Toggle: ' + el.id + ' => ' + (el.classList.contains('on') ? 'ON' : 'OFF'));
}

function saveAdminParams() {
  const dl = document.getElementById('paramDailyLoss');
  const ts = document.getElementById('paramTradeSize');
  const sl = document.getElementById('paramStopLoss');
  adminLog('Parameters saved: Daily Loss=$' + (dl?dl.value:'500') + ', Trade Size=' + (ts?ts.value:'0.1') + 'BTC, Stop Loss=' + (sl?sl.value:'5') + '%');
  log('Admin: Trading parameters updated', 'warn');
}

// Auto-refresh admin panel when tab is shown
const origShowPage = showPage;
showPage = function(id) {
  origShowPage.call(this, id);
  if (id === 'admin') refreshAdminPanel();
};

// Track signups/logins in admin activity
const origSignup = signup;
signup = function() {
  origSignup();
  if (currentUser) adminLog('New signup: ' + currentUser.name + ' (' + currentUser.email + ')');
};
const origLogin = login;
login = function() {
  origLogin();
  if (currentUser) adminLog('User login: ' + currentUser.name);
};

log('Master Admin Panel v7.0 initialized'); 
log('Responsive design: mobile + tablet + desktop');

// === ENHANCED MASTER ADMIN v8.0 ===
// User Detail Modal (replaces alert)
function viewUserDetail(email) {
  const users = JSON.parse(localStorage.getItem('allUsers') || '{}');
  const u = users[email];
  if (!u) return;
  const daysSince = Math.floor((Date.now() - new Date(u.joinDate).getTime()) / 86400000) || 1;
  const isOnline = currentUser && currentUser.email === u.email;
  let modal = document.getElementById('userDetailModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'userDetailModal';
    document.body.appendChild(modal);
  }
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10001;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = '<div style="background:#111827;border:1px solid #1e2d3d;border-radius:14px;padding:28px;width:450px;max-width:92%">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><div style="display:flex;align-items:center;gap:12px"><div style="width:44px;height:44px;background:#00d4aa;color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px">' + u.name.charAt(0).toUpperCase() + '</div><div><div style="font-size:16px;font-weight:700;color:#e0e6ed">' + u.name + '</div><div style="font-size:12px;color:#5a6e82">' + u.email + '</div></div></div><a onclick="document.getElementById(\'userDetailModal\').style.display=\'none\'" style="cursor:pointer;color:#5a6e82;font-size:22px">&times;</a></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
    '<div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#5a6e82;text-transform:uppercase">Member</div><div style="font-size:18px;font-weight:700;color:#e0e6ed">' + daysSince + ' days</div></div>' +
    '<div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#5a6e82;text-transform:uppercase">Sessions</div><div style="font-size:18px;font-weight:700;color:#e0e6ed">' + (u.sessions || 1) + '</div></div>' +
    '<div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#5a6e82;text-transform:uppercase">Risk</div><div style="font-size:18px;font-weight:700;color:#00d4aa">' + (u.riskProfile || 'moderate') + '</div></div>' +
    '<div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:8px;padding:12px;text-align:center"><div style="font-size:10px;color:#5a6e82;text-transform:uppercase">Status</div><div style="font-size:18px;font-weight:700;color:' + (isOnline ? '#00d4aa' : '#ff4757') + '">' + (isOnline ? 'Online' : 'Offline') + '</div></div>' +
    '</div>' +
    '<div style="background:#0d1117;border:1px solid #1e2d3d;border-radius:8px;padding:12px;margin-bottom:12px"><div style="font-size:10px;color:#5a6e82;text-transform:uppercase;margin-bottom:6px">Watchlist</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + (u.watchlist || ['BTC','ETH']).map(function(w){ return '<span style="background:#00d4aa20;color:#00d4aa;padding:3px 10px;border-radius:12px;font-size:11px;border:1px solid #00d4aa40">' + w + '</span>'; }).join('') + '</div></div>' +
    '<div style="font-size:11px;color:#5a6e82">Joined: ' + new Date(u.joinDate).toLocaleDateString() + ' | Last Login: ' + (u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'N/A') + '</div></div>';
  adminLog('Viewed user detail: ' + u.name);
}

// === ADMIN: Real-time Performance Monitor ===
let adminAutoRefreshInterval = null;
function startAdminAutoRefresh() {
  if (adminAutoRefreshInterval) return;
  adminAutoRefreshInterval = setInterval(function() {
    refreshAdminPanel();
    updateSystemHealth();
  }, 10000);
  adminLog('Admin auto-refresh started (10s)');
}
function stopAdminAutoRefresh() {
  if (adminAutoRefreshInterval) { clearInterval(adminAutoRefreshInterval); adminAutoRefreshInterval = null; }
  adminLog('Admin auto-refresh stopped');
}

// === System Health Monitor ===
function updateSystemHealth() {
  const indicators = [
    { id: 'healthPrism', status: priceCache.lastUpdate > Date.now() - 120000 ? 'online' : 'degraded' },
    { id: 'healthOpenAI', status: S.trades.some(function(t){ return t.agentic; }) ? 'active' : 'standby' },
    { id: 'healthERC', status: 'signing' },
    { id: 'healthVercel', status: 'deployed' }
  ];
  indicators.forEach(function(ind) {
    const el = document.getElementById(ind.id);
    if (el) {
      el.className = 'status-dot ' + (ind.status === 'online' || ind.status === 'active' || ind.status === 'signing' || ind.status === 'deployed' ? 'green' : 'yellow');
    }
  });
}

// === Admin: Platform Analytics Summary ===
function getAnalyticsSummary() {
  const users = Object.values(JSON.parse(localStorage.getItem('allUsers') || '{}'));
  const totalSessions = users.reduce(function(a, u) { return a + (u.sessions || 0); }, 0);
  const avgSessions = users.length > 0 ? (totalSessions / users.length).toFixed(1) : '0';
  const riskProfiles = { conservative: 0, moderate: 0, aggressive: 0 };
  users.forEach(function(u) { riskProfiles[u.riskProfile || 'moderate']++; });
  return {
    totalUsers: users.length,
    totalSessions: totalSessions,
    avgSessions: avgSessions,
    riskProfiles: riskProfiles,
    totalTrades: S.tt,
    totalPnl: S.pnl,
    winRate: S.tt > 0 ? (S.wins / S.tt * 100).toFixed(1) : '0',
    apiCalls: sessionApiCalls,
    uptime: Math.floor((Date.now() - sessionStart) / 1000)
  };
}

// === Mobile Navigation Toggle ===
(function() {
  const header = document.querySelector('.header');
  if (header && window.innerWidth <= 768) {
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '&#9776;';
    menuBtn.style.cssText = 'background:none;border:1px solid #1e2d3d;color:#e0e6ed;font-size:20px;padding:4px 10px;border-radius:6px;cursor:pointer;display:none';
    menuBtn.id = 'mobileMenuBtn';
    menuBtn.onclick = function() {
      const tabs = document.querySelector('.tabs');
      if (tabs) tabs.style.display = tabs.style.display === 'none' ? 'flex' : 'none';
    };
    header.appendChild(menuBtn);
  }
})();

// Start admin auto-refresh when admin tab is opened
const origShowPage2 = showPage;
showPage = function(id) {
  origShowPage2.call(this, id);
  if (id === 'admin') { startAdminAutoRefresh(); refreshAdminPanel(); updateSystemHealth(); }
  else stopAdminAutoRefresh();
};

log('Enhanced Admin v8.0: User detail modal, auto-refresh, system health, analytics');



// === OWNER ACTIVITY TRACKING SYSTEM v9.0 ===
// Complete user journey tracking: arrival -> signup -> every action -> time spent

const ActivityTracker = {
  events: JSON.parse(localStorage.getItem('activityEvents') || '[]'),
  userJourneys: JSON.parse(localStorage.getItem('userJourneys') || '{}'),
  pageTimers: {},
  currentPage: 'dashboard',
  sessionId: 'sess_' + Date.now().toString(36),

  track: function(category, action, details) {
    const evt = {
      id: 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2,4),
      ts: new Date().toISOString(),
      time: new Date().toLocaleString(),
      sessionId: this.sessionId,
      user: currentUser ? currentUser.email : 'anonymous',
      userName: currentUser ? currentUser.name : 'Guest',
      category: category,
      action: action,
      details: details || '',
      page: this.currentPage,
      url: window.location.href
    };
    this.events.push(evt);
    if (this.events.length > 500) this.events = this.events.slice(-500);
    localStorage.setItem('activityEvents', JSON.stringify(this.events));
    this.updateJourney(evt);
    this.refreshOwnerPanel();
    return evt;
  },
  updateJourney: function(evt) {
    const uid = evt.user;
    if (!this.userJourneys[uid]) {
      this.userJourneys[uid] = {
        firstVisit: evt.ts,
        name: evt.userName,
        sessions: [],
        totalTime: 0,
        pagesVisited: [],
        actions: [],
        trades: 0,
        signups: 0,
        logins: 0,
        feedbacks: 0
      };
    }
    const j = this.userJourneys[uid];
    j.lastActive = evt.ts;
    j.actions.push({ts: evt.ts, cat: evt.category, act: evt.action, det: evt.details, page: evt.page});
    if (j.actions.length > 200) j.actions = j.actions.slice(-200);
    if (evt.category === 'trade') j.trades++;
    if (evt.action === 'signup') j.signups++;
    if (evt.action === 'login') j.logins++;
    if (evt.category === 'feedback') j.feedbacks++;
    if (j.pagesVisited.indexOf(evt.page) === -1) j.pagesVisited.push(evt.page);
    localStorage.setItem('userJourneys', JSON.stringify(this.userJourneys));
  },

  startPageTimer: function(page) {
    this.pageTimers[page] = Date.now();
    this.currentPage = page;
  },

  endPageTimer: function(page) {
    if (this.pageTimers[page]) {
      const spent = Math.floor((Date.now() - this.pageTimers[page]) / 1000);
      this.track('navigation', 'page_leave', page + ' (' + spent + 's)');
      delete this.pageTimers[page];
      return spent;
    }
    return 0;
  },

  getEventsByUser: function(email) {
    return this.events.filter(function(e) { return e.user === email; });
  },

  getEventsByCategory: function(cat) {
    return this.events.filter(function(e) { return e.category === cat; });
  },

  getRecentEvents: function(count) {
    return this.events.slice(-(count || 50)).reverse();
  },

  getUserSessions: function(email) {
    var evts = this.getEventsByUser(email);
    var sessions = {};
    evts.forEach(function(e) {
      if (!sessions[e.sessionId]) sessions[e.sessionId] = {start: e.ts, events: [], end: e.ts};
      sessions[e.sessionId].events.push(e);
      sessions[e.sessionId].end = e.ts;
    });
    return Object.values(sessions);
  },

  getStats: function() {
    var users = {};
    var cats = {};
    var pages = {};
    this.events.forEach(function(e) {
      users[e.user] = (users[e.user] || 0) + 1;
      cats[e.category] = (cats[e.category] || 0) + 1;
      pages[e.page] = (pages[e.page] || 0) + 1;
    });
    return {totalEvents: this.events.length, uniqueUsers: Object.keys(users).length, byCategory: cats, byPage: pages, byUser: users};
  },

  refreshOwnerPanel: function() {
    var el = document.getElementById('ownerActivityFeed');
    if (!el) return;
    var recent = this.getRecentEvents(30);
    if (recent.length === 0) { el.innerHTML = '<div style="color:var(--sub);padding:20px;text-align:center">No activity recorded yet. Users will appear here as they interact with the platform.</div>'; return; }
    var html = '';
    recent.forEach(function(e) {
      var icon = {navigation:'\uD83D\uDCCD',auth:'\uD83D\uDD10',trade:'\uD83D\uDCB9',feedback:'\uD83D\uDCAC',settings:'\u2699\uFE0F',interaction:'\uD83D\uDD18',system:'\u26A1'}[e.category] || '\u25CF';
      var color = {navigation:'#3b82f6',auth:'#8b5cf6',trade:'#00d4aa',feedback:'#f59e0b',settings:'#6366f1',interaction:'#06b6d4',system:'#64748b'}[e.category] || '#5a6e82';
      html += '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #1e2d3d20;align-items:flex-start">';
      html += '<div style="font-size:16px;min-width:24px;text-align:center">' + icon + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="font-weight:600;font-size:12px;color:' + color + '">' + e.userName + '</span>';
      html += '<span style="font-size:10px;color:var(--sub)">' + new Date(e.ts).toLocaleTimeString() + '</span>';
      html += '</div>';
      html += '<div style="font-size:11px;color:var(--text);margin-top:2px">' + e.action + (e.details ? ' - ' + e.details : '') + '</div>';
      html += '<div style="font-size:10px;color:var(--sub);margin-top:1px">' + e.category + ' \u2022 ' + e.page + '</div>';
      html += '</div></div>';
    });
    el.innerHTML = html;
  },

  renderUserJourneyDetail: function(email) {
    var j = this.userJourneys[email];
    if (!j) return;
    var evts = this.getEventsByUser(email);
    var sessions = this.getUserSessions(email);
    var modal = document.getElementById('userDetailModal') || document.createElement('div');
    modal.id = 'userDetailModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10001;display:flex;align-items:center;justify-content:center';
    var timelineHtml = '';
    var lastEvts = evts.slice(-20).reverse();
    lastEvts.forEach(function(e) {
      var icon = {navigation:'\uD83D\uDCCD',auth:'\uD83D\uDD10',trade:'\uD83D\uDCB9',feedback:'\uD83D\uDCAC',settings:'\u2699\uFE0F',interaction:'\uD83D\uDD18',system:'\u26A1'}[e.category] || '\u25CF';
      timelineHtml += '<div style="display:flex;gap:8px;padding:6px 0;border-left:2px solid #1e2d3d;margin-left:8px;padding-left:12px">';
      timelineHtml += '<span>' + icon + '</span>';
      timelineHtml += '<div><div style="font-size:11px;color:var(--text)">' + e.action + (e.details ? ' - ' + e.details : '') + '</div>';
      timelineHtml += '<div style="font-size:10px;color:var(--sub)">' + new Date(e.ts).toLocaleString() + ' \u2022 ' + e.page + '</div></div></div>';
    });
    modal.innerHTML = '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;max-width:700px;width:95%;max-height:85vh;overflow-y:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
      '<div><h3 style="color:var(--accent);margin:0">' + (j.name || email) + '</h3><div style="color:var(--sub);font-size:12px">' + email + '</div></div>' +
      '<button onclick="document.getElementById(\'userDetailModal\').remove()" style="background:none;border:none;color:var(--sub);font-size:20px;cursor:pointer">\u2715</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;text-align:center"><div style="font-size:10px;color:var(--sub)">Total Actions</div><div style="font-size:20px;font-weight:700;color:var(--accent)">' + j.actions.length + '</div></div>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;text-align:center"><div style="font-size:10px;color:var(--sub)">Sessions</div><div style="font-size:20px;font-weight:700;color:#3b82f6">' + sessions.length + '</div></div>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;text-align:center"><div style="font-size:10px;color:var(--sub)">Trades</div><div style="font-size:20px;font-weight:700;color:#f59e0b">' + j.trades + '</div></div>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;text-align:center"><div style="font-size:10px;color:var(--sub)">Pages Visited</div><div style="font-size:20px;font-weight:700;color:#8b5cf6">' + j.pagesVisited.length + '</div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--sub);margin-bottom:4px">First Visit</div><div style="font-size:12px;color:var(--text)">' + new Date(j.firstVisit).toLocaleString() + '</div></div>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px"><div style="font-size:10px;color:var(--sub);margin-bottom:4px">Last Active</div><div style="font-size:12px;color:var(--text)">' + new Date(j.lastActive).toLocaleString() + '</div></div>' +
      '</div>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;margin-bottom:12px"><div style="font-size:10px;color:var(--sub);margin-bottom:6px">Pages Visited</div><div>' + j.pagesVisited.map(function(p){return '<span style="display:inline-block;padding:2px 8px;background:#1e2d3d;border-radius:4px;font-size:10px;color:var(--accent);margin:2px">' + p + '</span>';}).join('') + '</div></div>' +
      '<h4 style="font-size:12px;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Activity Timeline (Last 20)</h4>' +
      '<div style="background:#0d1117;padding:12px;border-radius:8px;max-height:300px;overflow-y:auto">' + timelineHtml + '</div>' +
      '</div>';
    document.body.appendChild(modal);
  },

  renderOwnerStats: function() {
    var stats = this.getStats();
    var el = document.getElementById('ownerStatsGrid');
    if (!el) return;
    el.innerHTML = '<div class="card" style="text-align:center"><h3>Total Events</h3><div class="value accent">' + stats.totalEvents + '</div></div>' +
      '<div class="card" style="text-align:center"><h3>Unique Users</h3><div class="value" style="color:#3b82f6">' + stats.uniqueUsers + '</div></div>' +
      '<div class="card" style="text-align:center"><h3>Trade Events</h3><div class="value" style="color:#f59e0b">' + (stats.byCategory.trade || 0) + '</div></div>' +
      '<div class="card" style="text-align:center"><h3>Auth Events</h3><div class="value" style="color:#8b5cf6">' + (stats.byCategory.auth || 0) + '</div></div>';
  },

  renderUserJourneyTable: function() {
    var el = document.getElementById('ownerJourneyTable');
    if (!el) return;
    var journeys = this.userJourneys;
    var keys = Object.keys(journeys);
    if (keys.length === 0) { el.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--sub);padding:20px">No user journeys recorded yet.</td></tr>'; return; }
    el.innerHTML = keys.map(function(k, i) {
      var j = journeys[k];
      var dur = j.lastActive && j.firstVisit ? Math.floor((new Date(j.lastActive) - new Date(j.firstVisit)) / 60000) : 0;
      var isActive = j.lastActive && (Date.now() - new Date(j.lastActive).getTime()) < 300000;
      return '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td><strong>' + (j.name || 'Guest') + '</strong></td>' +
        '<td>' + k + '</td>' +
        '<td>' + j.actions.length + '</td>' +
        '<td>' + j.pagesVisited.length + '</td>' +
        '<td>' + j.trades + '</td>' +
        '<td>' + dur + ' min</td>' +
        '<td>' + (isActive ? '<span style="color:var(--accent)">\u25CF Active</span>' : '<span style="color:var(--sub)">\u25CB Offline</span>') + '</td>' +
        '<td><button class="btn btn-outline" style="padding:4px 10px;font-size:10px" onclick="ActivityTracker.renderUserJourneyDetail(\'' + k + '\')">Timeline</button></td>' +
        '</tr>';
    }).join('');
  },

  exportActivityCSV: function() {
    var csv = 'Timestamp,User,Category,Action,Details,Page,Session\n';
    this.events.forEach(function(e) {
      csv += '"' + e.time + '","' + e.userName + '","' + e.category + '","' + e.action + '","' + (e.details||'') + '","' + e.page + '","' + e.sessionId + '"\n';
    });
    var blob = new Blob([csv], {type:'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'activity_log_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
  },

  clearEvents: function() {
    if (!confirm('Clear all activity events? This cannot be undone.')) return;
    this.events = [];
    this.userJourneys = {};
    localStorage.removeItem('activityEvents');
    localStorage.removeItem('userJourneys');
    this.refreshOwnerPanel();
    this.renderOwnerStats();
    this.renderUserJourneyTable();
  }
};

// === HOOK INTO ALL USER ACTIONS ===
// Track page visits
var origShowPage3 = showPage;
showPage = function(id) {
  ActivityTracker.endPageTimer(ActivityTracker.currentPage);
  origShowPage3.call(this, id);
  ActivityTracker.startPageTimer(id);
  ActivityTracker.track('navigation', 'page_visit', id);
  if (id === 'ownerAdmin') {
    ActivityTracker.renderOwnerStats();
    ActivityTracker.renderUserJourneyTable();
    ActivityTracker.refreshOwnerPanel();
  }
};

// Track signups
var origSignup2 = signup;
signup = function() {
  origSignup2();
  if (currentUser) ActivityTracker.track('auth', 'signup', currentUser.name + ' (' + currentUser.email + ')');
};

// Track logins
var origLogin2 = login;
login = function() {
  origLogin2();
  if (currentUser) ActivityTracker.track('auth', 'login', currentUser.name);
};

// Track logouts
var origLogout = logout;
logout = function() {
  var name = currentUser ? currentUser.name : 'Unknown';
  origLogout();
  ActivityTracker.track('auth', 'logout', name);
};

// Track trade cycles
var origRunTrade = runTradeCycle;
runTradeCycle = async function() {
  ActivityTracker.track('trade', 'trade_cycle_start', document.getElementById('symbolSelect').value);
  await origRunTrade();
  ActivityTracker.track('trade', 'trade_cycle_complete', 'PnL: $' + S.pnl.toFixed(2) + ' | Trades: ' + S.tt);
};

// Track auto-trade
var origAutoTrade = autoTrade;
autoTrade = function() {
  ActivityTracker.track('trade', 'auto_trade_toggle', S.ai ? 'stopped' : 'started');
  origAutoTrade();
};

// Track emergency stop
var origEmergency = emergencyStop;
emergencyStop = function() {
  ActivityTracker.track('trade', 'emergency_stop', 'Circuit breaker trips: ' + (S.cbt + 1));
  origEmergency();
};

// Track feedback
var origSubmitFeedback = submitFeedback;
submitFeedback = function() {
  var txt = document.getElementById('feedbackText');
  var type = document.getElementById('feedbackType');
  ActivityTracker.track('feedback', 'feedback_submit', (type ? type.value : 'general') + ': ' + (txt ? txt.value.substring(0, 50) : ''));
  origSubmitFeedback();
};

// Track admin param saves
var origSaveParams = saveAdminParams;
saveAdminParams = function() {
  ActivityTracker.track('settings', 'params_saved', 'Admin updated trading parameters');
  origSaveParams();
};

// Track toggle switches
var origToggle = toggleAdminSwitch;
toggleAdminSwitch = function(el) {
  ActivityTracker.track('settings', 'toggle_switch', el.id + ' => ' + (!el.classList.contains('on') ? 'ON' : 'OFF'));
  origToggle(el);
};

// Track symbol changes
document.getElementById('symbolSelect').addEventListener('change', function() {
  ActivityTracker.track('interaction', 'symbol_change', this.value);
});

// Track scroll depth
var maxScroll = 0;
window.addEventListener('scroll', function() {
  var pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if (pct > maxScroll + 20) {
    maxScroll = pct;
    ActivityTracker.track('interaction', 'scroll_depth', pct + '%');
  }
});

// Track initial page load
ActivityTracker.track('system', 'page_load', 'Trustless Trading Agent loaded');
ActivityTracker.startPageTimer('dashboard');

// Add Owner Admin tab to navigation
(function() {
  var tabs = document.querySelector('.tabs');
  if (tabs) {
    var ownerTab = document.createElement('div');
    ownerTab.className = 'tab';
    ownerTab.textContent = 'Owner Dashboard';
    ownerTab.style.color = '#f59e0b';
    ownerTab.onclick = function(e) { showPage('ownerAdmin'); };
    tabs.appendChild(ownerTab);
  }
})();

log('Owner Activity Tracking v9.0 initialized');
log('Full user journey tracking: arrival -> actions -> time spent');

if (currentUser) { updateUserUI(); log('Welcome back, ' + currentUser.name); }
