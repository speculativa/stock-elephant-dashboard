import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#0a0e1a", panel:"#0f1629", border:"#1e2d4a", text:"#e2e8f0", muted:"#64748b",
  accent:"#3b82f6", green:"#22c55e", amber:"#f59e0b", red:"#ef4444",
  orange:"#f97316", purple:"#8b5cf6", teal:"#14b8a6", gold:"#fbbf24",
};

const YRS = [0,1,2,3,4,5,6,7,8,9,10];

// All data from toymodel_sfc_clean.xlsx -- toy model entities only
const GAUGE = {
  DCR:  {vals:[0.400,0.461,0.541,0.601,0.635,0.641,0.615,0.534,0.503,0.492,0.508], dir:"up",  warn:0.55,crit:0.65, color:"#14b8a6", label:"DCR",  desc:"Stable funding behind repo"},
  CLC:  {vals:[1.692,1.731,1.762,1.783,1.724,1.791,1.852,1.894,1.938,1.957,1.198], dir:"down",warn:1.40,crit:1.20, color:"#22c55e", label:"CLC",  desc:"CommodityCo buffer"},
  CV:   {vals:[1.33,1.43,1.54,1.67,2.00,2.22,3.33,3.57,4.00,4.17,4.17],           dir:"up",  warn:2.50,crit:3.50, color:"#f97316", label:"CV",   desc:"Collateral reuse"},
  TVR:  {vals:[0.750,0.700,0.650,0.600,0.500,0.450,0.300,0.275,0.250,0.237,0.237], dir:"down",warn:0.45,crit:0.30, color:"#8b5cf6", label:"TVR",  desc:"Chain visible to TIC"},
  BTAR: {vals:[0.311,0.373,0.447,0.532,0.727,0.727,0.752,0.762,0.792,0.821,0.881], dir:"up",  warn:0.60,crit:0.80, color:"#ef4444", label:"BTAR", desc:"FedCo capacity consumed"},
  kappa:{vals:[1.071,1.080,1.107,1.132,1.150,1.150,1.189,1.214,1.250,1.308,1.333], dir:"up",  warn:1.15,crit:1.25, color:"#fbbf24", label:"κ",    desc:"Claims vs productive base"},
};

// Stock panel -- toy model entities only. No real world names.
// JapCBCo official FX reserves: flat (sterilization cost constraint binding)
const JAPCBCO_RESERVES = [650,651,652,653,655,656,658,661,663,665,668];
// JapanCo deposit at GlobalBankCo: routing gap building year by year
const JAPANC0_GBC_DEP  = [40,59,91,127,168,214,288,344,399,470,547];
// HedgeCo gross basis trade exposure: stock expressed as leverage
const HEDGECO_GROSS    = [230,289,387,508,615,763,1080,1408,1839,2253,2488];

const RATCHET = [
  {id:"S1",label:"Price Shock",   abs:1601, pre:89.7, post:155.2, resid:118.7, color:"#ef4444"},
  {id:"S2",label:"Funding Shock", abs:398,  pre:118.7,post:133.9, resid:124.8, color:"#f97316"},
  {id:"S3",label:"Infra Shock",   abs:712,  pre:124.8,post:211.5, resid:168.1, color:"#dc2626"},
];

function slvl(key, v) {
  const g = GAUGE[key];
  return g.dir==="up" ? (v>=g.crit?"crit":v>=g.warn?"warn":"ok") : (v<=g.crit?"crit":v<=g.warn?"warn":"ok");
}
function scolor(lvl) { return lvl==="crit"?C.red:lvl==="warn"?C.amber:C.green; }

function Spark({ vals, color, yr, W=148, H=28 }) {
  const mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||1;
  const px=i=>(i/10)*W, py=v=>H-((v-mn)/rng)*(H-5)-2;
  const all=vals.map((v,i)=>`${px(i)},${py(v)}`).join(" ");
  const partial=vals.slice(0,yr+1).map((v,i)=>`${px(i)},${py(v)}`).join(" ");
  return (
    <svg width={W} height={H} style={{overflow:"visible",display:"block"}}>
      <polyline points={all} fill="none" stroke={color} strokeWidth="1" opacity="0.18"/>
      {yr>=1 ? <polyline points={partial} fill="none" stroke={color} strokeWidth="2"/> : <circle cx={px(0)} cy={py(vals[0])} r="3" fill={color}/>}
      <circle cx={px(yr)} cy={py(vals[yr])} r="4" fill={color}/>
    </svg>
  );
}

function GaugeCard({ gkey, yr }) {
  const g=GAUGE[gkey], v=g.vals[yr], lvl=slvl(gkey,v), col=scolor(lvl);
  const disp=["TVR","BTAR"].includes(gkey)?(v*100).toFixed(1)+"%":v.toFixed(2);
  return (
    <div style={{background:C.panel,border:`1px solid ${lvl==="crit"?col+"55":C.border}`,borderRadius:8,padding:"9px 11px",display:"flex",flexDirection:"column",gap:3,transition:"border-color 0.4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,color:C.muted,fontFamily:"monospace",fontWeight:600}}>{g.label}</div>
          <div style={{fontSize:9,color:C.muted}}>{g.desc}</div>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:col,fontFamily:"monospace",transition:"color 0.4s"}}>{disp}</div>
      </div>
      <Spark vals={g.vals} color={g.color} yr={yr} W={148} H={28}/>
      <div style={{fontSize:8,color:col,textAlign:"right",fontFamily:"monospace"}}>
        {lvl==="crit"?"▲ STRESS":lvl==="warn"?"◆ WATCH":"● STABLE"}
      </div>
    </div>
  );
}

function StressBanner({ yr }) {
  const keys=Object.keys(GAUGE);
  const crit=keys.filter(k=>slvl(k,GAUGE[k].vals[yr])==="crit").length;
  const warn=keys.filter(k=>slvl(k,GAUGE[k].vals[yr])==="warn").length;
  const label=crit>=3?"SYSTEM STRESS":crit>=1?"PRESSURE BUILDING":warn>=2?"WATCH":"STABLE";
  const col=crit>=3?C.red:crit>=1?C.orange:warn>=2?C.amber:C.green;
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:col+"12",border:`1px solid ${col}35`,borderRadius:6,marginBottom:7}}>
      <span style={{fontSize:10,fontFamily:"monospace",color:col,fontWeight:700}}>{label}</span>
      <span style={{fontSize:9,color:C.muted,fontFamily:"monospace"}}>{crit} critical · {warn} warning · {6-crit-warn} stable</span>
    </div>
  );
}

function StockChart({ yr }) {
  const W=310, H=155, pl=44, pr=12, pt=14, pb=28;
  const cw=W-pl-pr, ch=H-pt-pb;
  const maxH=2600;
  const px=i=>pl+(i/10)*cw;
  const py_h=v=>pt+ch-(v/maxH)*ch;
  const py_r=v=>pt+ch-((v-600)/120)*(ch*0.25)-ch*0.68;
  const py_d=v=>pt+ch-(v/600)*ch*0.42-ch*0.02;

  const hGhost=HEDGECO_GROSS.map((v,i)=>`${px(i)},${py_h(v)}`).join(" ");
  const hPart=HEDGECO_GROSS.slice(0,yr+1).map((v,i)=>`${px(i)},${py_h(v)}`).join(" ");
  const hArea=`M ${px(0)} ${pt+ch} `+HEDGECO_GROSS.slice(0,yr+1).map((v,i)=>`L ${px(i)} ${py_h(v)}`).join(" ")+` L ${px(yr)} ${pt+ch} Z`;
  const rPart=JAPCBCO_RESERVES.slice(0,yr+1).map((v,i)=>`${px(i)},${py_r(v)}`).join(" ");
  const dPart=JAPANC0_GBC_DEP.slice(0,yr+1).map((v,i)=>`${px(i)},${py_d(v)}`).join(" ");
  const ticks=[0,500,1000,1500,2000];

  return (
    <svg width={W} height={H} style={{overflow:"visible",display:"block"}}>
      {ticks.map(t=>(
        <g key={t}>
          <line x1={pl} x2={pl+cw} y1={py_h(t)} y2={py_h(t)} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3"/>
          <text x={pl-3} y={py_h(t)+4} fill={C.muted} fontSize="8" textAnchor="end" fontFamily="monospace">${t}B</text>
        </g>
      ))}
      {[0,2,4,6,8,10].map(i=>(
        <text key={i} x={px(i)} y={H-8} fill={C.muted} fontSize="8" textAnchor="middle" fontFamily="monospace">Y{i}</text>
      ))}
      <polyline points={hGhost} fill="none" stroke={C.accent} strokeWidth="1" opacity="0.12" strokeDasharray="4,4"/>
      <path d={hArea} fill={C.accent} opacity="0.15"/>
      {yr>=1 ? <polyline points={hPart} fill="none" stroke={C.accent} strokeWidth="2.5"/> : <circle cx={px(0)} cy={py_h(HEDGECO_GROSS[0])} r="3" fill={C.accent}/>}
      {yr>=1 ? <polyline points={rPart} fill="none" stroke={C.teal} strokeWidth="1.5" strokeDasharray="5,3"/> : <circle cx={px(0)} cy={py_r(JAPCBCO_RESERVES[0])} r="3" fill={C.teal}/>}
      {yr>=1 ? <polyline points={dPart} fill="none" stroke={C.amber} strokeWidth="2" strokeDasharray="2,2"/> : <circle cx={px(0)} cy={py_d(JAPANC0_GBC_DEP[0])} r="3" fill={C.amber}/>}
      <circle cx={px(yr)} cy={py_h(HEDGECO_GROSS[yr])} r="4" fill={C.accent}/>
      <text x={px(yr)+6} y={py_h(HEDGECO_GROSS[yr])+4} fill={C.accent} fontSize="9" fontFamily="monospace" fontWeight="700">${HEDGECO_GROSS[yr]}B</text>
      <text x={pl+6} y={pt+11} fill={C.accent} fontSize="8" fontFamily="monospace">HedgeCo gross exposure ↑</text>
      <text x={pl+6} y={pt+22} fill={C.amber} fontSize="8" fontFamily="monospace">JapanCo→GlobalBankCo deposits - -</text>
      <text x={pl+6} y={pt+33} fill={C.teal} fontSize="8" fontFamily="monospace">JapCBCo reserves (flat) ···</text>
    </svg>
  );
}

function RatchetChart({ activeEp }) {
  const W=310, H=155, pl=44, pr=12, pt=18, pb=28;
  const cw=W-pl-pr, ch=H-pt-pb;
  const maxB=220;
  const yb=v=>pt+ch-(v/maxB)*ch;
  const ticks=[0,50,100,150,200];
  const residPts=RATCHET.map((r,i)=>{
    const bw=cw/3-8;
    return `${pl+i*(cw/3)+4+bw*0.25},${yb(r.resid)}`;
  }).join(" ");

  return (
    <svg width={W} height={H} style={{overflow:"visible",display:"block"}}>
      <defs>
        <marker id="arw" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill={C.muted}/>
        </marker>
      </defs>
      {ticks.map(t=>(
        <g key={t}>
          <line x1={pl} x2={pl+cw} y1={yb(t)} y2={yb(t)} stroke={t===100?C.red+"45":C.border} strokeWidth={t===100?1:0.5} strokeDasharray="3,3"/>
          <text x={pl-3} y={yb(t)+4} fill={t===100?C.red:C.muted} fontSize="8" textAnchor="end" fontFamily="monospace">{t}%</text>
        </g>
      ))}
      <text x={pl+3} y={yb(100)-4} fill={C.red} fontSize="7" fontFamily="monospace" opacity="0.6">capacity ceiling</text>
      {RATCHET.map((r,i)=>{
        const bw=cw/3-8, x0=pl+i*(cw/3);
        const op=(activeEp===null||activeEp===i)?1:0.22;
        const yp=yb(r.pre), ypo=yb(r.post), yr2=yb(r.resid);
        return (
          <g key={r.id} opacity={op}>
            <rect x={x0+4} y={yp} width={bw*0.38} height={pt+ch-yp} fill={r.color} opacity="0.28" rx="2"/>
            <rect x={x0+4+bw*0.44} y={ypo} width={bw*0.38} height={pt+ch-ypo} fill={r.color} opacity="0.7" rx="2"/>
            <circle cx={x0+4+bw*0.23} cy={yr2} r="4" fill={r.color} stroke={C.bg} strokeWidth="1.5"/>
            <text x={x0+5} y={yp-3} fill={r.color} fontSize="7" fontFamily="monospace">{r.pre.toFixed(0)}%</text>
            <text x={x0+5+bw*0.44} y={ypo-3} fill={r.color} fontSize="7" fontFamily="monospace" fontWeight="700">{r.post.toFixed(0)}%</text>
            <text x={x0+4+bw*0.5} y={H-10} fill={r.color} fontSize="7" textAnchor="middle" fontFamily="monospace">{r.id}</text>
            <text x={x0+4+bw*0.5} y={H-2} fill={C.muted} fontSize="6" textAnchor="middle" fontFamily="monospace">{r.label}</text>
          </g>
        );
      })}
      <polyline points={residPts} fill="none" stroke={C.amber} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.75"/>
      <text x={pl+4} y={pt+9} fill={C.amber} fontSize="7" fontFamily="monospace">— residual BTAR ratchets up</text>
    </svg>
  );
}

export default function Dashboard() {
  const [yr, setYr] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeEp, setActiveEp] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setYr(y => { if(y>=10){setPlaying(false);return 10;} return y+1; });
      }, 900);
    }
    return () => clearInterval(timer.current);
  }, [playing]);

  const stressYr = yr===10;

  return (
    <div style={{background:C.bg,color:C.text,minHeight:"100vh",display:"flex",flexDirection:"column",fontFamily:"system-ui,sans-serif",fontSize:13}}>

      {/* Header */}
      <div style={{padding:"12px 16px 8px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",letterSpacing:2}}>THE STOCK ELEPHANT · PART III · TOY MODEL</div>
          <div style={{fontSize:16,fontWeight:700,marginTop:2}}>Stock → Pressure → Response</div>
          <div style={{fontSize:9,color:C.muted,marginTop:1}}>Nine actors · Eleven SFC identities · Years 0–10+</div>
        </div>
        <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",textAlign:"right"}}>
          speculativa.substack.com<br/><span style={{color:C.accent}}>@Vinodh_Rag</span>
        </div>
      </div>

      {/* Panels */}
      <div style={{flex:1,display:"flex",minHeight:0}}>

        {/* LEFT: Gauges */}
        <div style={{width:"46%",padding:12,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:7}}>
          <div>
            <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}>Panel 1 · System Pressure</div>
            <div style={{fontSize:12,fontWeight:600,marginTop:1}}>Six gauges — all directional</div>
            <div style={{fontSize:9,color:C.muted,marginTop:1}}>No threshold crossed in baseline. Stability and buildup coincide.</div>
          </div>
          <StressBanner yr={yr}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {Object.keys(GAUGE).map(k=><GaugeCard key={k} gkey={k} yr={yr}/>)}
          </div>
          <div style={{padding:"7px 9px",background:C.panel,border:`1px solid ${C.border}`,borderRadius:6,fontSize:8,color:C.muted,fontFamily:"monospace",lineHeight:1.65}}>
            DCR↑ &nbsp;CLC↓ &nbsp;CV↑ &nbsp;TVR↓ &nbsp;BTAR↑ &nbsp;κ↑ — monotonic Y0→Y9.
            {stressYr && <span style={{color:C.red}}> Y10+ stress: CLC crosses 1.2 warning. Exogenous shock origin.</span>}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{flex:1,padding:12,display:"flex",flexDirection:"column",gap:9}}>

          {/* Panel 2: Stock */}
          <div style={{flex:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:11}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}>Panel 2 · Accumulated Stock</div>
            <div style={{fontSize:12,fontWeight:600,marginTop:1}}>HedgeCo gross exposure vs JapCBCo reserves</div>
            <div style={{fontSize:9,color:C.muted,marginTop:1,marginBottom:8}}>
              Routed surplus accumulates as leveraged GovCo bond positions. JapCBCo reserves flat — sterilization cost constraint binding.
            </div>
            <StockChart yr={yr}/>
            <div style={{display:"flex",gap:8,marginTop:7,flexWrap:"wrap"}}>
              {[
                {label:"HedgeCo gross", val:`$${HEDGECO_GROSS[yr]}B`, col:C.accent},
                {label:"JapanCo→GBC deposits", val:`$${JAPANC0_GBC_DEP[yr]}B`, col:C.amber},
                {label:"JapCBCo reserves", val:`$${JAPCBCO_RESERVES[yr]}B`, col:C.teal},
              ].map(s=>(
                <div key={s.label} style={{background:s.col+"12",border:`1px solid ${s.col}28`,borderRadius:5,padding:"3px 8px"}}>
                  <div style={{fontSize:7,color:C.muted,fontFamily:"monospace"}}>{s.label}</div>
                  <div style={{fontSize:12,fontWeight:700,color:s.col,fontFamily:"monospace"}}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{height:1,background:C.border,flexShrink:0}}/>

          {/* Panel 3: Ratchet */}
          <div style={{flex:1,background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:11}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:"monospace",letterSpacing:1,textTransform:"uppercase"}}>Panel 3 · System Response</div>
            <div style={{fontSize:12,fontWeight:600,marginTop:1}}>FedCo ratchet: each episode narrows the band</div>
            <div style={{fontSize:9,color:C.muted,marginTop:1,marginBottom:8}}>BTAR pre→post→residual. Recovery incomplete. Next episode starts higher.</div>
            <RatchetChart activeEp={activeEp}/>
            <div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap"}}>
              <button onClick={()=>setActiveEp(null)} style={{background:activeEp===null?C.muted+"35":"transparent",border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 7px",color:C.muted,fontSize:8,fontFamily:"monospace"}}>ALL</button>
              {RATCHET.map((r,i)=>(
                <button key={r.id} onClick={()=>setActiveEp(activeEp===i?null:i)} style={{background:activeEp===i?r.color+"28":"transparent",border:`1px solid ${activeEp===i?r.color:C.border}`,borderRadius:4,padding:"2px 7px",color:activeEp===i?r.color:C.muted,fontSize:8,fontFamily:"monospace"}}>
                  {r.id}: {r.label} (${r.abs}B)
                </button>
              ))}
            </div>
            <div style={{marginTop:7,padding:"5px 8px",background:C.red+"0e",border:`1px solid ${C.red}28`,borderRadius:4,fontSize:8,color:C.muted,fontFamily:"monospace"}}>
              FedCo remaining headroom Y10+: <span style={{color:C.red}}>$147B</span>. All three episodes breach capacity. Band narrows each cycle. Duffie floor bounds recovery.
            </div>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",background:C.panel,borderTop:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={()=>{if(!playing&&yr>=10)setYr(0);setPlaying(p=>!p);}} style={{background:playing?C.red+"28":C.accent+"28",border:`1px solid ${playing?C.red:C.accent}`,borderRadius:5,padding:"4px 10px",color:playing?C.red:C.accent,fontSize:10,fontFamily:"monospace",minWidth:60}}>
          {playing?"⏸ PAUSE":"▶ PLAY"}
        </button>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}>
          <input type="range" min={0} max={10} step={1} value={yr} onChange={e=>{setYr(+e.target.value);setPlaying(false);}} style={{width:"100%",accentColor:C.accent}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:C.muted,fontFamily:"monospace"}}>
            {YRS.map(y=><span key={y} style={{color:y===yr?C.accent:C.muted,fontWeight:y===yr?700:400}}>Y{y}</span>)}
          </div>
        </div>
        <div style={{background:C.accent+"18",border:`1px solid ${C.accent}38`,borderRadius:5,padding:"3px 10px",fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.accent,minWidth:44,textAlign:"center"}}>
          Y{yr}{yr===10?"+":""}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:"5px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",fontSize:8,color:C.muted,fontFamily:"monospace",flexShrink:0}}>
        <span>toymodel_sfc_clean.xlsx · SFC-consistent · 1,440 formulas · nine actors</span>
        <span>Speculativa · @Vinodh_Rag</span>
      </div>
    </div>
  );
}
