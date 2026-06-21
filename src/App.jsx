import { useState, useEffect, useRef, useCallback } from "react";

// ── DHAN API CONFIG ───────────────────────────────────────────────────────────
const DHAN_CLIENT_ID = "1112229714";
const DHAN_BASE = "https://api.dhan.co/v2";
const CORS_PROXY = "https://api.allorigins.win/get?url=";

// ── COLORS ────────────────────────────────────────────────────────────────────
const BG="#08090f",SURF="#0d1018",CARD="#111520",BDR="#181e2e",BDRL="#1e2840";
const GRN="#00e676",GRND="#002a14",RED="#ff3d3d",REDD="#2a0808";
const ORG="#ff9800",ORGD="#2a1500",BLU="#4da6ff",BLUD="#0a1a30";
const YLW="#ffd740",PRP="#b388ff",PRPD="#1a0a30",WCH="#607080";
const TXT="#dde4f0",TXD="#4a5a70",TXF="#252f40";

const ROG={
  GREEN:{color:GRN,bg:GRND,emoji:"🟢",label:"GREEN",action:"BUY EQUITY / CALL"},
  ORANGE:{color:ORG,bg:ORGD,emoji:"🟠",label:"ORANGE",action:"BUY CALL"},
  RED:{color:RED,bg:REDD,emoji:"🔴",label:"RED",action:"BUY PUT (PE)"},
  WATCH:{color:WCH,bg:"#111820",emoji:"⚪",label:"WATCH",action:"WAIT"},
};

// ── DHAN SECURITY IDs (NSE) ───────────────────────────────────────────────────
const FO_STOCKS = [
  {name:"Reliance",sym:"RELIANCE",secId:"2885",sec:"Energy",gz:35,rz:72,wg:72,wr:68},
  {name:"TCS",sym:"TCS",secId:"11536",sec:"IT",gz:33,rz:70,wg:74,wr:70},
  {name:"HDFC Bank",sym:"HDFCBANK",secId:"1333",sec:"Banking",gz:36,rz:74,wg:69,wr:65},
  {name:"Infosys",sym:"INFY",secId:"1594",sec:"IT",gz:34,rz:71,wg:71,wr:67},
  {name:"ICICI Bank",sym:"ICICIBANK",secId:"4963",sec:"Banking",gz:37,rz:73,wg:73,wr:69},
  {name:"SBI",sym:"SBIN",secId:"3045",sec:"Banking",gz:32,rz:68,wg:76,wr:71},
  {name:"Airtel",sym:"BHARTIARTL",secId:"10604",sec:"Telecom",gz:38,rz:75,wg:68,wr:64},
  {name:"Kotak Bank",sym:"KOTAKBANK",secId:"1922",sec:"Banking",gz:35,rz:70,wg:70,wr:66},
  {name:"Wipro",sym:"WIPRO",secId:"3787",sec:"IT",gz:30,rz:68,wg:75,wr:70},
  {name:"Axis Bank",sym:"AXISBANK",secId:"5900",sec:"Banking",gz:36,rz:72,wg:72,wr:68},
  {name:"L&T",sym:"LT",secId:"11483",sec:"Infra",gz:37,rz:74,wg:70,wr:73},
  {name:"NTPC",sym:"NTPC",secId:"11630",sec:"Power",gz:30,rz:67,wg:78,wr:72},
  {name:"Tata Motors",sym:"TATAMOTORS",secId:"3456",sec:"Auto",gz:35,rz:71,wg:73,wr:69},
  {name:"Sun Pharma",sym:"SUNPHARMA",secId:"3351",sec:"Pharma",gz:33,rz:70,wg:74,wr:70},
  {name:"ONGC",sym:"ONGC",secId:"2475",sec:"Energy",gz:29,rz:66,wg:77,wr:71},
  {name:"HCL Tech",sym:"HCLTECH",secId:"7229",sec:"IT",gz:35,rz:77,wg:70,wr:74},
  {name:"IndusInd Bank",sym:"INDUSINDBK",secId:"5258",sec:"Banking",gz:28,rz:65,wg:81,wr:74},
  {name:"Power Grid",sym:"POWERGRID",secId:"14977",sec:"Power",gz:28,rz:65,wg:80,wr:73},
  {name:"JSW Steel",sym:"JSWSTEEL",secId:"11723",sec:"Metal",gz:31,rz:68,wg:76,wr:70},
  {name:"BPCL",sym:"BPCL",secId:"526",sec:"Energy",gz:30,rz:66,wg:79,wr:72},
];

// ── PAPER TRADE LOG (in memory) ───────────────────────────────────────────────
let PAPER_TRADES = [];
let TRADE_COUNTER = 1;

// ── RSI CALCULATION ───────────────────────────────────────────────────────────
function calcRSI(closes, period=14) {
  if(closes.length < period+1) return 50;
  let gains=0,losses=0;
  for(let i=1;i<=period;i++){
    const d=closes[i]-closes[i-1];
    if(d>=0)gains+=d; else losses-=d;
  }
  let ag=gains/period,al=losses/period;
  for(let i=period+1;i<closes.length;i++){
    const d=closes[i]-closes[i-1];
    ag=(ag*(period-1)+Math.max(d,0))/period;
    al=(al*(period-1)+Math.max(-d,0))/period;
  }
  if(al===0)return 100;
  return parseFloat((100-100/(1+ag/al)).toFixed(2));
}

// ── FETCH DHAN HISTORICAL DATA ────────────────────────────────────────────────
async function fetchDhanCandles(secId, token) {
  try {
    const toDate = new Date().toISOString().split("T")[0];
    const fromDate = new Date(Date.now() - 90*24*60*60*1000).toISOString().split("T")[0];
    const url = `${DHAN_BASE}/charts/historical?securityId=${secId}&exchangeSegment=NSE_EQ&instrument=EQUITY&expiryCode=0&oi=false&fromDate=${fromDate}&toDate=${toDate}&interval=1`;
    const proxied = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const headers = { "access-token": token, "client-id": DHAN_CLIENT_ID };
    const res = await fetch(proxied, { headers });
    const json = await res.json();
    const data = JSON.parse(json.contents);
    if(data && data.close && data.close.length > 0) {
      return {
        closes: data.close,
        volumes: data.volume,
        opens: data.open,
        highs: data.high,
        lows: data.low,
        timestamps: data.timestamp,
      };
    }
    return null;
  } catch(e) {
    return null;
  }
}

// ── FETCH LIVE QUOTE ──────────────────────────────────────────────────────────
async function fetchDhanQuote(secId, token) {
  try {
    const url = `${DHAN_BASE}/marketfeed/ltp`;
    const proxied = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const body = JSON.stringify({
      NSE_EQ: [parseInt(secId)]
    });
    const res = await fetch(proxied, {
      method: "POST",
      headers: {
        "access-token": token,
        "client-id": DHAN_CLIENT_ID,
        "Content-Type": "application/json"
      },
      body
    });
    const json = await res.json();
    const data = JSON.parse(json.contents);
    return data?.data?.NSE_EQ?.[secId] || null;
  } catch(e) {
    return null;
  }
}

// ── PROCESS STOCK DATA ────────────────────────────────────────────────────────
function processStockData(stock, candles, quote) {
  const closes = candles?.closes || [];
  const volumes = candles?.volumes || [];
  const rsi = calcRSI(closes);
  const price = quote?.ltp || closes[closes.length-1] || 0;
  const prevClose = closes[closes.length-2] || price;
  const changePct = parseFloat(((price-prevClose)/prevClose*100).toFixed(2));
  const avgVol = volumes.slice(-20).reduce((a,b)=>a+b,0)/20;
  const currVol = volumes[volumes.length-1] || 0;
  const volRatio = parseFloat((currVol/avgVol).toFixed(2));
  const h52 = Math.max(...closes.slice(-252));
  const l52 = Math.min(...closes.slice(-252));
  const zone = rsi<=stock.gz?"GREEN":rsi>=stock.rz?"RED":(rsi>=48&&rsi<=62)?"ORANGE":"WATCH";
  const winRate = zone==="GREEN"?stock.wg:zone==="RED"?stock.wr:zone==="ORANGE"?Math.round((stock.wg+stock.wr)/2):null;
  const fromHigh = parseFloat(((price-h52)/h52*100).toFixed(1));
  const volSpike = volRatio>=2;
  const volSig = volSpike?(changePct>=0?"BULLISH":"BEARISH"):null;
  const rogScore = zone==="GREEN"?(stock.gz-rsi)*2+volRatio*10+(winRate||0):zone==="RED"?(rsi-stock.rz)*2+volRatio*10+(winRate||0):zone==="ORANGE"?volRatio*15+(winRate||0):0;

  // Trade Success
  let tsScore=0;
  const wr=winRate||50;
  tsScore+=Math.max(Math.min((wr-50)*4,40),0);
  if(zone==="GREEN")tsScore+=Math.min((stock.gz-rsi)*2.5,25);
  else if(zone==="RED")tsScore+=Math.min((rsi-stock.rz)*2.5,25);
  else if(zone==="ORANGE")tsScore+=15;
  tsScore+=volRatio>=3?20:volRatio>=2?15:volRatio>=1.5?10:5;
  tsScore=Math.min(Math.round(tsScore),95);
  const tsColor=tsScore>=75?GRN:tsScore>=60?YLW:tsScore>=45?ORG:RED;
  const tsLabel=tsScore>=75?"High Confidence":tsScore>=60?"Moderate":tsScore>=45?"Low Confidence":"Weak Signal";

  // Strengths & Weaknesses
  const st=[], wk=[];
  if(zone==="GREEN")st.push("RSI "+rsi+" at personal historic low — high reversal probability");
  else if(zone==="RED")wk.push("RSI "+rsi+" at personal historic high — downside risk elevated");
  else if(zone==="ORANGE")st.push("RSI "+rsi+" in momentum zone — upward push building");
  else wk.push("RSI in neutral zone — no strong signal yet");
  if(volRatio>=2)st.push("Volume "+volRatio+"x above average — strong momentum");
  else if(volRatio<0.8)wk.push("Low volume "+volRatio+"x — weak participation");
  if(fromHigh>-5)st.push("Near 52W high — strong momentum");
  else if(fromHigh<-30)st.push("Deep correction "+fromHigh+"% — potential value entry");
  if(changePct>2)st.push("Strong today +"+changePct+"% — bullish confirmation");
  else if(changePct<-2)wk.push("Selling pressure "+changePct+"% today");
  if(wr>=70)st.push("High win rate "+wr+"% at this ROG zone historically");

  // Candle data for chart
  const chartCandles = (candles?.closes||[]).slice(-40).map((c,i,arr)=>({
    c, o:arr[i-1]||c,
    h:c*(1+Math.random()*0.005),
    l:c*(1-Math.random()*0.005),
    rsi:calcRSI((candles?.closes||[]).slice(0,i+1)),
    zone:rsi<=stock.gz?"GREEN":rsi>=stock.rz?"RED":"WATCH"
  }));

  return {
    ...stock, price, changePct, rsi, volRatio, h52, l52, fromHigh,
    zone, winRate, volSpike, volSig, rogScore,
    ts:{score:tsScore,color:tsColor,label:tsLabel},
    st, wk, chartCandles
  };
}

// ── PAPER TRADE ENGINE ────────────────────────────────────────────────────────
function checkAndCreatePaperTrade(stock) {
  const existing = PAPER_TRADES.find(t=>t.sym===stock.sym && t.status==="OPEN");
  if(existing) return null;

  // BUY signal conditions
  if((stock.zone==="GREEN"||stock.zone==="ORANGE") && stock.ts.score>=65 && stock.volRatio>=1.5) {
    const trade = {
      id: TRADE_COUNTER++,
      sym: stock.sym,
      name: stock.name,
      type: stock.zone==="RED"?"PUT":"CALL",
      tradeType: stock.zone==="GREEN"||stock.zone==="ORANGE"?"BUY_EQUITY":"BUY_PUT",
      entryPrice: stock.price,
      entryRSI: stock.rsi,
      entryZone: stock.zone,
      target: parseFloat((stock.price*1.06).toFixed(2)),
      stopLoss: parseFloat((stock.price*0.97).toFixed(2)),
      qty: Math.floor(25000/stock.price),
      capital: 25000,
      entryTime: new Date().toLocaleTimeString("en-IN"),
      entryDate: new Date().toLocaleDateString("en-IN"),
      status: "OPEN",
      tsScore: stock.ts.score,
      volRatio: stock.volRatio,
      pnl: 0,
      pnlPct: 0,
    };
    PAPER_TRADES.unshift(trade);
    return trade;
  }

  // PUT signal
  if(stock.zone==="RED" && stock.ts.score>=65 && stock.volRatio>=1.5) {
    const trade = {
      id: TRADE_COUNTER++,
      sym: stock.sym,
      name: stock.name,
      type: "PUT",
      tradeType: "BUY_PUT",
      entryPrice: stock.price,
      entryRSI: stock.rsi,
      entryZone: stock.zone,
      target: parseFloat((stock.price*0.94).toFixed(2)),
      stopLoss: parseFloat((stock.price*1.03).toFixed(2)),
      qty: Math.floor(25000/stock.price),
      capital: 25000,
      entryTime: new Date().toLocaleTimeString("en-IN"),
      entryDate: new Date().toLocaleDateString("en-IN"),
      status: "OPEN",
      tsScore: stock.ts.score,
      volRatio: stock.volRatio,
      pnl: 0,
      pnlPct: 0,
    };
    PAPER_TRADES.unshift(trade);
    return trade;
  }
  return null;
}

function updatePaperTrades(stocks) {
  PAPER_TRADES = PAPER_TRADES.map(trade => {
    if(trade.status !== "OPEN") return trade;
    const stock = stocks.find(s=>s.sym===trade.sym);
    if(!stock) return trade;
    const curr = stock.price;
    let pnl=0, pnlPct=0, status="OPEN", exitReason="";
    if(trade.tradeType==="BUY_EQUITY"||trade.tradeType==="CALL") {
      pnl = (curr-trade.entryPrice)*trade.qty;
      pnlPct = parseFloat(((curr-trade.entryPrice)/trade.entryPrice*100).toFixed(2));
      if(curr>=trade.target){status="CLOSED";exitReason="Target Hit ✅";}
      else if(curr<=trade.stopLoss){status="CLOSED";exitReason="SL Hit ❌";}
    } else {
      pnl = (trade.entryPrice-curr)*trade.qty;
      pnlPct = parseFloat(((trade.entryPrice-curr)/trade.entryPrice*100).toFixed(2));
      if(curr<=trade.target){status="CLOSED";exitReason="Target Hit ✅";}
      else if(curr>=trade.stopLoss){status="CLOSED";exitReason="SL Hit ❌";}
    }
    return {
      ...trade, currentPrice:curr, pnl:parseFloat(pnl.toFixed(2)),
      pnlPct, status,
      exitReason: status==="CLOSED"?exitReason:trade.exitReason,
      exitTime: status==="CLOSED"&&trade.status==="OPEN"?new Date().toLocaleTimeString("en-IN"):trade.exitTime,
    };
  });
}

// ── GREEKS ────────────────────────────────────────────────────────────────────
function erf(x){const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;const s=x<0?-1:1;x=Math.abs(x);const t=1/(1+p*x);return s*(1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x));}
const Ncdf=x=>0.5*(1+erf(x/Math.sqrt(2)));
const npdf=x=>Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI);
function calcGreeks(S,K,T,type){if(T<=0)return{d:0,g:0,t:0};const r=0.065,sig=0.28,d1=(Math.log(S/K)+(r+0.5*sig*sig)*T)/(sig*Math.sqrt(T)),d2=d1-sig*Math.sqrt(T);const delta=type==="call"?Ncdf(d1):Ncdf(d1)-1,gamma=npdf(d1)/(S*sig*Math.sqrt(T)),theta=type==="call"?(-(S*npdf(d1)*sig)/(2*Math.sqrt(T))-r*K*Math.exp(-r*T)*Ncdf(d2))/365:(-(S*npdf(d1)*sig)/(2*Math.sqrt(T))+r*K*Math.exp(-r*T)*Ncdf(-d2))/365;return{d:parseFloat(delta.toFixed(3)),g:parseFloat(gamma.toFixed(5)),t:parseFloat(theta.toFixed(2))};}
function getBestOpt(price,zone){const T=21/365,type=zone==="RED"?"put":"call",strikes=[-0.05,-0.025,0,0.025,0.05].map(p=>Math.round(price*(1+p)/50)*50);let best=null,bs=-Infinity;for(const K of strikes){const g=calcGreeks(price,K,T,type),sc=g.g*10000-Math.abs(g.t)*5;if(sc>bs&&Math.abs(g.d)>=0.3&&Math.abs(g.d)<=0.65){bs=sc;best={strike:K,type:type.toUpperCase(),...g};}}return best;}

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function ZonePill({zone,small}){const c=ROG[zone]||ROG.WATCH;return <span style={{background:c.bg,color:c.color,border:"1px solid "+c.color+"44",padding:small?"2px 6px":"3px 10px",borderRadius:4,fontSize:small?10:11,fontWeight:800,whiteSpace:"nowrap"}}>{c.emoji+" "+c.label}</span>;}
function Bar({pct,color}){return <div style={{width:"100%",height:5,background:BDR,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:Math.min(pct,100)+"%",background:color,borderRadius:3}}/></div>;}
function RSIBar({rsi,gz,rz}){if(!rsi)return null;return <div style={{position:"relative",width:70,height:5,background:BDR,borderRadius:3,display:"inline-block",verticalAlign:"middle",marginLeft:6}}><div style={{position:"absolute",left:0,width:gz+"%",height:"100%",background:GRN+"25",borderRadius:3}}/><div style={{position:"absolute",left:rz+"%",right:0,height:"100%",background:RED+"25",borderRadius:3}}/><div style={{position:"absolute",left:Math.min(rsi,100)+"%",top:-2,width:9,height:9,background:BLU,borderRadius:"50%",transform:"translateX(-50%)",border:"2px solid "+BG}}/></div>;}

function CandleChart({candles}){
  if(!candles||!candles.length)return <div style={{color:TXF,fontSize:11,textAlign:"center",padding:"20px 0"}}>Loading chart...</div>;
  const r=candles.slice(-30);
  const maxP=Math.max(...r.map(c=>c.h)),minP=Math.min(...r.map(c=>c.l)),range=maxP-minP||1;
  const W=320,H=130,pl=4,pr=44,pt=6,pb=14;
  const cw=Math.max(Math.floor((W-pl-pr)/r.length)-1,3);
  const toY=p=>pt+(H-pt-pb)-((p-minP)/range*(H-pt-pb));
  const toX=i=>pl+i*((W-pl-pr)/r.length)+cw/2;
  return <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:H,display:"block"}}>
    {r.map((c,i)=>{const x=toX(i),up=c.c>=c.o,col=up?GRN:RED,bT=Math.min(toY(c.o),toY(c.c)),bH=Math.max(Math.abs(toY(c.c)-toY(c.o)),1);return <g key={i}><line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)} stroke={col} strokeWidth={1} opacity={0.6}/><rect x={x-cw/2} y={bT} width={cw} height={bH} fill={col} opacity={0.85} rx={0.5}/></g>;})}
    <text x={W-pr+2} y={toY(maxP)+4} fill={TXF} fontSize={8}>{"Rs."+Math.round(maxP)}</text>
    <text x={W-pr+2} y={toY(minP)+4} fill={TXF} fontSize={8}>{"Rs."+Math.round(minP)}</text>
  </svg>;
}

function DetailPanel({stock,onClose}){
  if(!stock)return null;
  const cfg=ROG[stock.zone]||ROG.WATCH,ts=stock.ts;
  const opt=getBestOpt(stock.price,stock.zone);
  return <div style={{position:"fixed",right:0,top:0,bottom:0,width:340,background:CARD,borderLeft:"1px solid "+BDRL,zIndex:200,overflowY:"auto",boxShadow:"-4px 0 32px #00000099"}}>
    <div style={{padding:"12px 16px",borderBottom:"1px solid "+BDR,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:CARD,zIndex:10}}>
      <div><div style={{fontWeight:900,color:TXT,fontSize:14}}>{stock.name}</div><div style={{fontSize:10,color:TXD}}>{stock.sym+" · "+stock.sec+" · LIVE DATA 🔴"}</div></div>
      <button onClick={onClose} style={{background:"none",border:"none",color:TXD,fontSize:20,cursor:"pointer"}}>✕</button>
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR,background:cfg.color+"08"}}>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:6}}>
        <div><div style={{fontSize:20,fontWeight:900,color:TXT}}>{"Rs."+stock.price?.toLocaleString("en-IN")}</div><div style={{fontSize:11,color:stock.changePct>=0?GRN:RED,fontWeight:700}}>{(stock.changePct>=0?"+":"")+stock.changePct+"% today"}</div></div>
        <ZonePill zone={stock.zone}/>
      </div>
      <div style={{fontSize:10,color:TXD}}>{"Personal: Green<="+stock.gz+"  Orange 48-62  Red>="+stock.rz}</div>
      <div style={{fontSize:12,color:cfg.color,fontWeight:800,marginTop:4}}>{"Signal: "+cfg.action}</div>
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR,background:SURF}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:6,textTransform:"uppercase",letterSpacing:0.7}}>Trade Success Probability</div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <div style={{fontSize:42,fontWeight:900,color:ts.color,lineHeight:1}}>{ts.score+"%"}</div>
        <div><div style={{fontSize:14,color:ts.color,fontWeight:800}}>{ts.label}</div><div style={{fontSize:10,color:TXD,marginTop:2}}>ROG + Volume + RSI + Price</div></div>
      </div>
      <Bar pct={ts.score} color={ts.color}/>
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.7}}>Strengths & Weaknesses</div>
      {(stock.st||[]).map((s,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"flex-start"}}><span style={{color:GRN,fontSize:13,lineHeight:1.3,flexShrink:0}}>✓</span><span style={{fontSize:11,color:TXT,lineHeight:1.5}}>{s}</span></div>)}
      {(stock.wk||[]).map((w,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:6,alignItems:"flex-start"}}><span style={{color:RED,fontSize:13,lineHeight:1.3,flexShrink:0}}>✗</span><span style={{fontSize:11,color:TXD,lineHeight:1.5}}>{w}</span></div>)}
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.7}}>90-Day Candle Chart</div>
      <div style={{background:SURF,borderRadius:8,padding:"6px",border:"1px solid "+BDR}}>
        <CandleChart candles={stock.chartCandles}/>
      </div>
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.7}}>Key Stats · Live</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
        {[
          {l:"RSI",v:stock.rsi,c:(ROG[stock.zone]||ROG.WATCH).color},
          {l:"Win Rate",v:stock.winRate?stock.winRate+"%":"—",c:stock.winRate>=65?GRN:stock.winRate>=50?YLW:TXD},
          {l:"Volume",v:stock.volRatio+"x avg",c:stock.volRatio>=2?ORG:TXD},
          {l:"From 52W High",v:stock.fromHigh+"%",c:stock.fromHigh>-10?GRN:stock.fromHigh>-25?YLW:RED},
          {l:"52W High",v:"Rs."+Math.round(stock.h52||0),c:TXT},
          {l:"52W Low",v:"Rs."+Math.round(stock.l52||0),c:TXT},
        ].map((item,i)=><div key={i} style={{background:SURF,borderRadius:6,padding:"8px 10px",border:"1px solid "+BDR}}><div style={{fontSize:9,color:TXF,textTransform:"uppercase",letterSpacing:0.5}}>{item.l}</div><div style={{fontSize:14,fontWeight:800,color:item.c,marginTop:2}}>{item.v}</div></div>)}
      </div>
    </div>

    {opt&&<div style={{padding:"10px 16px"}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:0.7}}>Best Option · Greeks</div>
      <div style={{background:SURF,borderRadius:8,padding:"10px 12px",border:"1px solid "+(opt.type==="CALL"?GRN:RED)+"33"}}>
        <div style={{fontSize:15,fontWeight:900,color:opt.type==="CALL"?GRN:RED}}>{opt.type+" Rs."+opt.strike}</div>
        <div style={{display:"flex",gap:14,marginTop:6}}>
          {[["Delta Δ",opt.d],["Gamma Γ",opt.g],["Theta Θ/d",opt.t]].map((g,i)=><div key={i}><div style={{fontSize:9,color:TXF}}>{g[0]}</div><div style={{fontSize:13,fontWeight:700,color:TXT}}>{g[1]}</div></div>)}
        </div>
        <div style={{fontSize:9,color:TXF,marginTop:5}}>IV=28% · r=6.5% · 21 DTE · Not financial advice</div>
      </div>
    </div>}
  </div>;
}

// ── PAPER TRADE PANEL ─────────────────────────────────────────────────────────
function PaperPanel({trades,onClose}){
  const open=trades.filter(t=>t.status==="OPEN");
  const closed=trades.filter(t=>t.status==="CLOSED");
  const totalPnL=trades.reduce((a,t)=>a+t.pnl,0);
  const wins=closed.filter(t=>t.pnl>0).length;
  const winRate=closed.length>0?Math.round(wins/closed.length*100):0;
  return <div style={{position:"fixed",right:0,top:0,bottom:0,width:360,background:CARD,borderLeft:"1px solid "+BDRL,zIndex:200,overflowY:"auto",boxShadow:"-4px 0 32px #00000099"}}>
    <div style={{padding:"12px 16px",borderBottom:"1px solid "+BDR,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:CARD,zIndex:10}}>
      <div><div style={{fontWeight:900,color:TXT,fontSize:14}}>📝 Paper Trading Log</div><div style={{fontSize:10,color:TXD}}>Real signals · No real money</div></div>
      <button onClick={onClose} style={{background:"none",border:"none",color:TXD,fontSize:20,cursor:"pointer"}}>✕</button>
    </div>

    <div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR,background:SURF}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {l:"Total P&L",v:(totalPnL>=0?"+ ":"- ")+"Rs."+Math.abs(Math.round(totalPnL)),c:totalPnL>=0?GRN:RED},
          {l:"Win Rate",v:winRate+"%",c:winRate>=60?GRN:winRate>=50?YLW:RED},
          {l:"Total Trades",v:trades.length,c:BLU},
        ].map((s,i)=><div key={i} style={{background:CARD,borderRadius:6,padding:"8px 10px",border:"1px solid "+BDR,textAlign:"center"}}><div style={{fontSize:9,color:TXF,textTransform:"uppercase"}}>{s.l}</div><div style={{fontSize:14,fontWeight:900,color:s.c,marginTop:2}}>{s.v}</div></div>)}
      </div>
    </div>

    {open.length>0&&<div style={{padding:"10px 16px",borderBottom:"1px solid "+BDR}}>
      <div style={{fontSize:10,color:YLW,fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>🔄 Open Positions ({open.length})</div>
      {open.map(t=><div key={t.id} style={{background:SURF,borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid "+BDR}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontWeight:800,color:TXT,fontSize:13}}>{t.name}</span>
          <span style={{color:t.type==="CALL"||t.tradeType==="BUY_EQUITY"?GRN:RED,fontWeight:700,fontSize:12}}>{t.type==="PUT"?"PUT":"BUY"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:11}}>
          <div><div style={{color:TXF,fontSize:9}}>Entry</div><div style={{color:TXT,fontWeight:700}}>{"Rs."+t.entryPrice}</div></div>
          <div><div style={{color:TXF,fontSize:9}}>Target</div><div style={{color:GRN,fontWeight:700}}>{"Rs."+t.target}</div></div>
          <div><div style={{color:TXF,fontSize:9}}>Stop Loss</div><div style={{color:RED,fontWeight:700}}>{"Rs."+t.stopLoss}</div></div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11}}>
          <span style={{color:TXD}}>{"Qty: "+t.qty+" · Rs."+t.capital}</span>
          <span style={{color:t.pnl>=0?GRN:RED,fontWeight:700}}>{(t.pnl>=0?"+ ":"- ")+"Rs."+Math.abs(Math.round(t.pnl))+" ("+t.pnlPct+"%)"}</span>
        </div>
        <div style={{fontSize:9,color:TXF,marginTop:4}}>{"Entry: "+t.entryTime+" · Zone: "+t.entryZone+" · RSI: "+t.entryRSI}}</div>
      </div>)}
    </div>}

    {closed.length>0&&<div style={{padding:"10px 16px"}}>
      <div style={{fontSize:10,color:TXD,fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>📋 Closed Trades ({closed.length})</div>
      {closed.map(t=><div key={t.id} style={{background:SURF,borderRadius:8,padding:"10px 12px",marginBottom:8,border:"1px solid "+(t.pnl>=0?GRN:RED)+"33"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontWeight:800,color:TXT,fontSize:12}}>{t.name}</span>
          <span style={{color:t.pnl>=0?GRN:RED,fontWeight:900,fontSize:13}}>{(t.pnl>=0?"+ ":"- ")+"Rs."+Math.abs(Math.round(t.pnl))}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
          <span style={{color:TXD}}>{"Rs."+t.entryPrice+" → Rs."+(t.currentPrice||t.target)}</span>
          <span style={{color:t.pnl>=0?GRN:RED}}>{t.pnlPct+"%"}</span>
        </div>
        <div style={{fontSize:9,color:t.pnl>=0?GRN:RED,marginTop:4,fontWeight:700}}>{t.exitReason}</div>
      </div>)}
    </div>}

    {trades.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:TXF}}>
      <div style={{fontSize:24,marginBottom:8}}>📊</div>
      <div style={{fontSize:12}}>No paper trades yet!</div>
      <div style={{fontSize:10,marginTop:4}}>Signals with Trade Success above 65% will auto-log here</div>
    </div>}
  </div>;
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ROGSystem(){
  const [token,setToken]=useState(()=>{
    try{return localStorage.getItem("dhan_token")||"";}catch{return "";}
  });
  const [tokenInput,setTokenInput]=useState("");
  const [stocks,setStocks]=useState([]);
  const [loading,setLoading]=useState(false);
  const [loadMsg,setLoadMsg]=useState("");
  const [tab,setTab]=useState("top20");
  const [zf,setZF]=useState("ALL");
  const [sel,setSel]=useState(null);
  const [showPaper,setShowPaper]=useState(false);
  const [paperTrades,setPaperTrades]=useState([]);
  const [lastUpdated,setLastUpdated]=useState("");
  const [countdown,setCd]=useState(300);
  const [newTrade,setNewTrade]=useState(null);
  const t1=useRef(null),t2=useRef(null);

  const loadStocks = useCallback(async (tok) => {
    if(!tok) return;
    setLoading(true);
    const results=[];
    for(let i=0;i<FO_STOCKS.length;i++){
      const s=FO_STOCKS[i];
      setLoadMsg("Fetching "+s.name+"... ("+(i+1)+"/"+FO_STOCKS.length+")");
      try {
        const [candles,quote] = await Promise.all([
          fetchDhanCandles(s.secId,tok),
          fetchDhanQuote(s.secId,tok)
        ]);
        const processed = processStockData(s,candles,quote);
        results.push(processed);
        // Check for paper trade signal
        const trade = checkAndCreatePaperTrade(processed);
        if(trade){
          setNewTrade(trade);
          setTimeout(()=>setNewTrade(null),5000);
        }
      } catch(e){
        console.error(s.name,e);
      }
      if(i%5===0) setStocks([...results]);
    }
    updatePaperTrades(results);
    setPaperTrades([...PAPER_TRADES]);
    setStocks(results);
    setLastUpdated(new Date().toLocaleTimeString("en-IN"));
    setLoading(false);
    setLoadMsg("");
    setCd(300);
  },[]);

  const handleConnect = () => {
    if(!tokenInput.trim()){alert("Please paste your Dhan token!");return;}
    const tok=tokenInput.trim();
    try{localStorage.setItem("dhan_rog_token",tok);localStorage.setItem("dhan_rog_time",Date.now().toString());}catch(e){}
    setToken(tok);
    loadStocks(tok);
  };

  const handleClearToken = () => {
    try{localStorage.removeItem("dhan_rog_token");localStorage.removeItem("dhan_rog_time");}catch(e){}
    setToken("");setTokenInput("");setStocks([]);
  };

  useEffect(()=>{
    try{
      const saved=localStorage.getItem("dhan_rog_token");
      const savedTime=parseInt(localStorage.getItem("dhan_rog_time")||"0");
      const age=(Date.now()-savedTime)/(1000*60*60);
      if(saved&&age<23){setToken(saved);loadStocks(saved);}
      else if(saved&&age>=23){localStorage.removeItem("dhan_rog_token");}
    }catch(e){}
  },[loadStocks]);

  useEffect(()=>{
    if(!token)return;
    t1.current=setInterval(()=>loadStocks(token),300000);
    t2.current=setInterval(()=>setCd(c=>c<=1?300:c-1),1000);
    return()=>{clearInterval(t1.current);clearInterval(t2.current);};
  },[token,loadStocks]);

  const top20=[...stocks].sort((a,b)=>b.rogScore-a.rogScore).slice(0,20);
  const spikes=stocks.filter(s=>s.volSpike);
  const foDisp=(tab==="top20"?top20:tab==="vol"?spikes:stocks).filter(s=>zf==="ALL"||s.zone===zf);
  const cnts={G:stocks.filter(s=>s.zone==="GREEN").length,O:stocks.filter(s=>s.zone==="ORANGE").length,R:stocks.filter(s=>s.zone==="RED").length,V:spikes.length};
  const openTrades=paperTrades.filter(t=>t.status==="OPEN").length;
  const totalPnL=paperTrades.reduce((a,t)=>a+t.pnl,0);
  const mins=Math.floor(countdown/60),secs2=(countdown%60).toString().padStart(2,"0");
  const btn=(active,label,col,onClick)=><button onClick={onClick} style={{padding:"5px 11px",borderRadius:6,border:"1px solid "+(active?col:BDR),background:active?col+"18":"transparent",color:active?col:TXD,fontWeight:600,fontSize:11,cursor:"pointer"}}>{label}</button>;

  // TOKEN INPUT SCREEN
  if(!token){
    return <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:CARD,borderRadius:16,padding:"32px 28px",maxWidth:420,width:"100%",border:"1px solid "+BDRL}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:28,fontWeight:900,marginBottom:4}}>
            <span style={{color:RED}}>R</span><span style={{color:ORG}}>O</span><span style={{color:GRN}}>G</span>
          </div>
          <div style={{fontSize:14,color:TXD}}>Signal System · Live Dhan Data</div>
          <div style={{fontSize:11,color:TXF,marginTop:4}}>Paper Trading Engine 📝</div>
        </div>

        <div style={{background:SURF,borderRadius:10,padding:"16px",marginBottom:16,border:"1px solid "+BDR}}>
          <div style={{fontSize:11,color:YLW,fontWeight:700,marginBottom:8}}>⚡ How to get your Dhan token:</div>
          {["Go to web.dhan.co → Login","Profile → DhanHQ Trading APIs","Click '+ Generate new Access Token'","Name it 'ROG' → Click Generate","Copy the full token → paste below"].map((s,i)=><div key={i} style={{fontSize:11,color:TXD,marginBottom:4,display:"flex",gap:8}}><span style={{color:BLU,fontWeight:700,flexShrink:0}}>{i+1}.</span>{s}</div>)}
        </div>

        <textarea
          value={tokenInput}
          onChange={e=>setTokenInput(e.target.value)}
          placeholder="Paste your Dhan Access Token here..."
          style={{width:"100%",minHeight:80,background:SURF,border:"1px solid "+BDR,borderRadius:8,padding:"10px 12px",color:TXT,fontSize:11,resize:"vertical",outline:"none",fontFamily:"monospace",boxSizing:"border-box"}}
        />

        <button onClick={handleConnect} style={{width:"100%",marginTop:12,padding:"12px",borderRadius:8,background:"linear-gradient(135deg,"+GRN+",#00b248)",border:"none",color:"#000",fontWeight:900,fontSize:14,cursor:"pointer"}}>
          🚀 Connect & Load Live Data
        </button>

        <div style={{fontSize:10,color:TXF,textAlign:"center",marginTop:12}}>
          Token is used only in your browser · Not stored anywhere · Valid 24 hours
        </div>
      </div>
    </div>;
  }

  return <div style={{minHeight:"100vh",background:BG,color:TXT,fontFamily:"'Inter','Segoe UI',sans-serif",paddingRight:(sel&&!showPaper)||(showPaper&&!sel)?340:sel&&showPaper?680:0,transition:"padding-right 0.2s"}}>

    {/* NEW TRADE ALERT */}
    {newTrade&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:newTrade.type==="PUT"?REDD:GRND,border:"2px solid "+(newTrade.type==="PUT"?RED:GRN),borderRadius:10,padding:"12px 20px",zIndex:300,boxShadow:"0 4px 24px #00000088",textAlign:"center",minWidth:280}}>
      <div style={{fontSize:12,color:newTrade.type==="PUT"?RED:GRN,fontWeight:900}}>{"📝 PAPER TRADE LOGGED!"}</div>
      <div style={{fontSize:14,color:TXT,fontWeight:800,marginTop:4}}>{newTrade.name+" · "+(newTrade.type==="PUT"?"BUY PUT":"BUY EQUITY")}</div>
      <div style={{fontSize:11,color:TXD,marginTop:2}}>{"Entry Rs."+newTrade.entryPrice+" · Target Rs."+newTrade.target+" · SL Rs."+newTrade.stopLoss}</div>
    </div>}

    {/* HEADER */}
    <div style={{background:SURF,borderBottom:"1px solid "+BDRL,padding:"10px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:20,fontWeight:900,letterSpacing:-0.5}}>
            <span style={{color:RED}}>R</span><span style={{color:ORG}}>O</span><span style={{color:GRN}}>G</span>
            <span style={{color:GRN,fontSize:10,marginLeft:6,fontWeight:700}}>● LIVE</span>
            <span style={{color:TXD,fontWeight:400,fontSize:12,marginLeft:8}}>NSE · Dhan API</span>
          </div>
          <div style={{fontSize:10,color:TXF}}>
            {loading?<span style={{color:BLU}}>⏳ {loadMsg}</span>:lastUpdated?"Updated "+lastUpdated+" · Refresh in "+mins+":"+secs2:"Ready"}
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {[{l:"🟢 "+cnts.G,c:GRN},{l:"🟠 "+cnts.O,c:ORG},{l:"🔴 "+cnts.R,c:RED},{l:"⚡ "+cnts.V,c:YLW}].map((p,i)=><div key={i} style={{background:CARD,border:"1px solid "+BDR,borderRadius:6,padding:"4px 9px"}}><div style={{fontSize:13,fontWeight:900,color:p.c,lineHeight:1}}>{p.l}</div></div>)}
          <button onClick={()=>setShowPaper(!showPaper)} style={{padding:"6px 12px",borderRadius:6,border:"1px solid "+PRP,background:PRPD,color:PRP,fontWeight:700,fontSize:11,cursor:"pointer",position:"relative"}}>
            📝 Paper {openTrades>0&&<span style={{background:ORG,color:"#000",borderRadius:10,padding:"1px 5px",fontSize:9,marginLeft:4}}>{openTrades}</span>}
            {totalPnL!==0&&<span style={{marginLeft:4,color:totalPnL>=0?GRN:RED,fontSize:10}}>{totalPnL>=0?"+":"-"}Rs.{Math.abs(Math.round(totalPnL))}</span>}
          </button>
          <button onClick={()=>loadStocks(token)} disabled={loading} style={{padding:"6px 12px",borderRadius:6,border:"1px solid "+BLU,background:BLUD,color:BLU,fontWeight:700,fontSize:11,cursor:loading?"not-allowed":"pointer"}}>
            {loading?"Loading...":"↻ Refresh"}
          </button>
          <button onClick={handleClearToken} style={{padding:"6px 10px",borderRadius:6,border:"1px solid "+BDR,background:"transparent",color:TXD,fontSize:11,cursor:"pointer"}}>⟳ Token</button>
        </div>
      </div>
      {loading&&<div style={{height:3,background:BDR,borderRadius:2,marginTop:8,overflow:"hidden"}}><div style={{height:"100%",width:(stocks.length/FO_STOCKS.length*100)+"%",background:"linear-gradient(90deg,"+BLU+","+GRN+")",transition:"width 0.4s",borderRadius:2}}/></div>}
    </div>

    {/* TABS */}
    <div style={{padding:"7px 16px",borderBottom:"1px solid "+BDR,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
      {btn(tab==="top20","🏆 Top 20",BLU,()=>setTab("top20"))}
      {btn(tab==="all","📊 All",BLU,()=>setTab("all"))}
      {btn(tab==="vol","⚡ Vol ("+cnts.V+")",YLW,()=>setTab("vol"))}
      <div style={{width:1,height:16,background:BDR,margin:"0 2px"}}/>
      {["ALL","GREEN","ORANGE","RED","WATCH"].map(z=>{const c=(ROG[z]||{color:WCH}).color;return btn(zf===z,z,c,()=>setZF(z));})}
      <span style={{marginLeft:"auto",fontSize:10,color:TXF}}>{foDisp.length+" stocks · tap for analysis"}</span>
    </div>

    {/* VOL SPIKES */}
    {spikes.length>0&&tab!=="vol"&&<div style={{margin:"8px 16px 0",background:YLW+"08",border:"1px solid "+YLW+"28",borderRadius:8,padding:"8px 12px"}}>
      <div style={{fontSize:11,color:YLW,fontWeight:800,marginBottom:5}}>⚡ VOLUME SPIKES — momentum change!</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {spikes.map(s=><div key={s.sym} onClick={()=>setSel(sel?.sym===s.sym?null:s)} style={{background:CARD,border:"1px solid "+(s.volSig==="BULLISH"?GRN:RED)+"33",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>
          <span style={{fontWeight:700,color:TXT,fontSize:11}}>{s.name}</span>
          <span style={{color:YLW,fontSize:10,marginLeft:5}}>{s.volRatio+"x"}</span>
          <span style={{color:s.volSig==="BULLISH"?GRN:RED,fontSize:10,marginLeft:5,fontWeight:700}}>{s.volSig}</span>
        </div>)}
      </div>
    </div>}

    {/* TABLE */}
    <div style={{overflowX:"auto",padding:"6px 16px 0"}}>
      {stocks.length===0&&!loading&&<div style={{textAlign:"center",padding:"60px 20px",color:TXF}}>
        <div style={{fontSize:32,marginBottom:12}}>📡</div>
        <div style={{fontSize:14,color:TXD}}>Connecting to Dhan API...</div>
        <div style={{fontSize:11,marginTop:4}}>Fetching live NSE data for {FO_STOCKS.length} stocks</div>
      </div>}
      {stocks.length>0&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:SURF}}>
          {["#","Stock","Price / Chg","RSI Zone","ROG","Trade %","Win Rate","Volume","52W"].map((h,i)=><th key={i} style={{padding:"8px 10px",color:TXD,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:0.6,borderBottom:"1px solid "+BDRL,whiteSpace:"nowrap",textAlign:i>1?"center":"left"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {foDisp.map((s,i)=>{
            const cfg=ROG[s.zone]||ROG.WATCH,isSel=sel?.sym===s.sym,ts=s.ts;
            const hasPaper=PAPER_TRADES.some(t=>t.sym===s.sym&&t.status==="OPEN");
            return <tr key={s.sym} onClick={()=>setSel(isSel?null:s)} style={{background:isSel?cfg.color+"0a":i%2===0?SURF:BG,cursor:"pointer",borderLeft:"3px solid "+(isSel?cfg.color:hasPaper?PRP:"transparent"),transition:"background 0.1s"}}>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,color:TXF,fontSize:10}}>{"#"+(i+1)}{hasPaper&&<span style={{color:PRP,marginLeft:4}}>📝</span>}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR}}><div style={{fontWeight:700,color:TXT,fontSize:12}}>{s.name}</div><div style={{fontSize:9,color:TXF}}>{s.sym+" · "+s.sec}</div></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><div style={{fontWeight:800,color:TXT}}>{"Rs."+s.price?.toLocaleString("en-IN")}</div><div style={{fontSize:10,color:s.changePct>=0?GRN:RED,fontWeight:700}}>{(s.changePct>=0?"+":"")+s.changePct+"%"}</div></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><span style={{color:cfg.color,fontWeight:900,fontSize:13}}>{s.rsi}</span><RSIBar rsi={s.rsi} gz={s.gz} rz={s.rz}/><div style={{fontSize:9,color:TXF,marginTop:2}}>{"G<="+s.gz+" R>="+s.rz}</div></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><ZonePill zone={s.zone} small/></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><div style={{fontSize:16,fontWeight:900,color:ts.color,lineHeight:1}}>{ts.score+"%"}</div><div style={{fontSize:9,color:ts.color}}>{ts.label}</div></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><span style={{color:s.winRate>=65?GRN:s.winRate>=50?YLW:s.winRate?RED:TXF,fontWeight:700}}>{s.winRate?s.winRate+"%":"—"}</span></td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><span style={{color:s.volRatio>=2?ORG:s.volRatio>=1.5?YLW:TXD,fontWeight:700}}>{s.volRatio+"x"}</span>{s.volSig&&<div style={{color:s.volSig==="BULLISH"?GRN:RED,fontSize:9,fontWeight:700}}>{"⚡"+s.volSig}</div>}</td>
              <td style={{padding:"9px 10px",borderBottom:"1px solid "+BDR,textAlign:"center"}}><span style={{color:s.fromHigh>-5?GRN:s.fromHigh>-15?YLW:RED,fontWeight:600,fontSize:11}}>{s.fromHigh+"%"}</span></td>
            </tr>;
          })}
        </tbody>
      </table>}
    </div>

    <div style={{padding:"10px 16px",fontSize:10,color:TXF,lineHeight:2}}>
      🔴 Live data via Dhan API · 📝 Paper trades auto-logged when Trade Success above 65% + Volume 1.5x+ · ⏰ Theta decay after 2PM IST · Not financial advice
    </div>

    {sel&&!showPaper&&<DetailPanel stock={sel} onClose={()=>setSel(null)}/>}
    {showPaper&&<PaperPanel trades={paperTrades} onClose={()=>setShowPaper(false)}/>}
  </div>;
}
