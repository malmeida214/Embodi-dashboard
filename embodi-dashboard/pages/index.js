import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, Line,
} from 'recharts';

const C = {
  orange:'#E8631A', amber:'#F59E0B', green:'#10B981', red:'#EF4444',
  blue:'#60A5FA', purple:'#A78BFA', dark:'#0F172A', card:'#1E293B',
  border:'#334155', text:'#F1F5F9', muted:'#94A3B8', dark2:'#111827',
};

const HISTORICAL = [
  {year:'2023',revenue:207794,expenses:126760,net:81034,margin:39.0,ebitda:84415,ebitdaMargin:40.6,mrr:17316},
  {year:'2024',revenue:329647,expenses:198757,net:130890,margin:39.7,ebitda:134271,ebitdaMargin:40.7,mrr:27471},
  {year:'2025',revenue:346612,expenses:226470,net:120143,margin:34.7,ebitda:133988,ebitdaMargin:38.7,mrr:28884},
];

const M23=[
  {p:'Jan',rev:9341,exp:3258,net:6083},{p:'Feb',rev:10024,exp:3404,net:6620},
  {p:'Mar',rev:9790,exp:3696,net:6094},{p:'Apr',rev:19550,exp:9438,net:10112},
  {p:'May',rev:18015,exp:12966,net:5049},{p:'Jun',rev:17298,exp:13581,net:3717},
  {p:'Jul',rev:19177,exp:12671,net:6506},{p:'Aug',rev:17889,exp:13162,net:4727},
  {p:'Sep',rev:18963,exp:13277,net:5686},{p:'Oct',rev:18482,exp:12946,net:5536},
  {p:'Nov',rev:23302,exp:12113,net:11189},{p:'Dec',rev:25963,exp:16248,net:9715},
];
const M24=[
  {p:'Jan',rev:25576,exp:14955,net:10622},{p:'Feb',rev:23934,exp:14551,net:9383},
  {p:'Mar',rev:26042,exp:13974,net:12069},{p:'Apr',rev:29297,exp:16904,net:12393},
  {p:'May',rev:31922,exp:18593,net:13329},{p:'Jun',rev:23972,exp:14977,net:8995},
  {p:'Jul',rev:26746,exp:15836,net:10910},{p:'Aug',rev:25208,exp:15626,net:9582},
  {p:'Sep',rev:25174,exp:15449,net:9725},{p:'Oct',rev:27777,exp:15242,net:12535},
  {p:'Nov',rev:31368,exp:17704,net:13664},{p:'Dec',rev:32631,exp:24946,net:7685},
];
const M25=[
  {p:'Jan',rev:36945,exp:18106,net:18839},{p:'Feb',rev:41936,exp:21063,net:20873},
  {p:'Mar',rev:28056,exp:27708,net:348},{p:'Apr',rev:29386,exp:16654,net:12732},
  {p:'May',rev:27740,exp:15857,net:11883},{p:'Jun',rev:27756,exp:15941,net:11815},
  {p:'Jul',rev:26488,exp:17983,net:8505},{p:'Aug',rev:28936,exp:22191,net:6745},
  {p:'Sep',rev:26043,exp:18679,net:7364},{p:'Oct',rev:28801,exp:16708,net:12093},
  {p:'Nov',rev:22415,exp:16703,net:5712},{p:'Dec',rev:22110,exp:18872,net:3238},
];

const CLIENT_PIE=[
  {name:'Qualified Leads',value:322,color:'#475569'},
  {name:'Inactive Members',value:135,color:'#64748B'},
  {name:'Semi-Private',value:33,color:C.orange},
  {name:'Private Members',value:15,color:C.amber},
  {name:'Inactive Clients',value:33,color:'#334155'},
];
const TOP_CLIENTS=[
  {name:'Taliah Roach',rev:45836},{name:'Morgan Torres',rev:33245},
  {name:'Jennifer Stagg',rev:23633},{name:'Tim Hemesath',rev:22858},
  {name:'Chris Rohde',rev:21769},{name:'Atanas Kaykov',rev:21751},
  {name:'Andres Rodriguez',rev:21366},{name:'A. Porcello',rev:19905},
  {name:'Rakesh Bomatra',rev:15401},{name:'Beth Hyland',rev:14470},
];

const fmt = v => `$${Number(v||0).toLocaleString()}`;

const TTip = ({active,payload,label}) => {
  if (!active||!payload||!payload.length) return null;
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px'}}>
      <p style={{color:C.muted,marginBottom:4,fontSize:12}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color||C.text,margin:'2px 0',fontSize:13}}>
          {p.name}: {typeof p.value==='number'&&p.value>100?fmt(p.value):p.value}
        </p>
      ))}
    </div>
  );
};

const KPI = ({label,value,sub,color=C.orange,delta=null,flag=null}) => (
  <div style={{background:C.card,border:`1px solid ${flag?flag+'60':C.border}`,borderLeft:flag?`3px solid ${flag}`:undefined,borderRadius:12,padding:'18px 20px'}}>
    <p style={{color:C.muted,fontSize:10,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>{label}</p>
    <p style={{color,fontSize:24,fontWeight:700,marginBottom:3}}>{value}</p>
    {sub&&<p style={{color:C.muted,fontSize:11}}>{sub}</p>}
    {delta!==null&&<p style={{color:delta>=0?C.green:C.red,fontSize:11,marginTop:3,fontWeight:600}}>{delta>=0?'▲':'▼'} {Math.abs(delta)}% YOY</p>}
  </div>
);

const Card = ({children,style={}}) => (
  <div style={{background:C.card,borderRadius:12,padding:22,border:`1px solid ${C.border}`,...style}}>{children}</div>
);

const ST = ({children,sub}) => (
  <div style={{marginBottom:16}}>
    <h3 style={{color:C.text,fontSize:14,fontWeight:600,margin:0}}>{children}</h3>
    {sub&&<p style={{color:C.muted,fontSize:11,marginTop:3}}>{sub}</p>}
  </div>
);

export default function Dashboard() {
  const [tab,setTab]       = useState('overview');
  const [yr,setYr]         = useState('live');
  const [liveData,setLive] = useState(null);
  const [loading,setLoad]  = useState(true);
  const [error,setError]   = useState(null);
  const [lastUpdated,setLU]= useState(null);

  const fetchLive = useCallback(async () => {
    setLoad(true); setError(null);
    try {
      const res  = await fetch('/api/data');
      
      // 1. Check if the response is actually JSON before parsing
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
         const text = await res.text(); // Grab the HTML/Text error
         console.error("Vercel crashed. Raw HTML response:", text);
         throw new Error(`Server crashed (Status ${res.status}). Check Vercel logs.`);
      }

      // 2. Safely parse JSON
      const json = await res.json();
      if (json.error) throw new Error(json.message);
      
      setLive(json);
      setLU(new Date(json.lastUpdated));
    } catch(e) { 
      setError(e.message); 
    } finally { 
      setLoad(false); 
    }
  },[]);

  useEffect(()=>{ fetchLive(); },[fetchLive]);

  const TABS=[
    {id:'overview',label:'Overview'},{id:'revenue',label:'Revenue'},
    {id:'expenses',label:'Expenses'},{id:'clients',label:'Clients'},
    {id:'insights',label:'🎯 Insights'},
  ];

  const curYear = liveData?.currentYear||new Date().getFullYear();
  const liveRow = {
    year:`${curYear} YTD`,
    revenue:liveData?.thisYear?.revenue||0, expenses:liveData?.thisYear?.expenses||0,
    net:liveData?.thisYear?.netIncome||0, margin:liveData?.thisYear?.netMargin||0,
    ebitda:liveData?.thisYear?.ebitda||0, ebitdaMargin:liveData?.thisYear?.ebitdaMargin||0,
    mrr:liveData?.thisYear?.mrr||0,
  };

  const annualRows = yr==='live' ? [...HISTORICAL,liveRow] : HISTORICAL;
  const yoy = liveData?.yoyRevGrowth;

  const monthlyMap = {'2023':M23,'2024':M24,'2025':M25,'live':(liveData?.monthly||[]).map(m=>({p:m.month?.slice(0,3)||'?',rev:Math.round(m.revenue||0),exp:Math.round(m.expenses||0),net:Math.round(m.net||0)}))};
  const monthly = monthlyMap[yr]||M25;

  const expCats = (yr==='live'&&liveData?.expenseCategories) ? liveData.expenseCategories : {Rent:81700,Labor:41537,Marketing:17781,Processing:19651,'Dues/Subs':16061,Other:49740};
  const expTotal = Object.values(expCats).reduce((s,v)=>s+v,0);
  const expDetail = Object.entries(expCats).map(([label,val])=>({
    label,val,pct:expTotal>0?+(val/expTotal*100).toFixed(1):0,
    color:{Rent:C.border,Labor:C.red,Marketing:C.blue,Processing:C.purple,'Dues/Subs':C.amber,Other:'#6B7280'}[label]||C.muted,
  })).sort((a,b)=>b.val-a.val);

  const bal  = liveData?.balance||{};
  const kpis = liveData?.kpis||{};
  const yrRow = yr==='live' ? liveRow : HISTORICAL.find(h=>h.year===yr);

  if (!yrRow) return null;

  return (
    <div style={{background:C.dark,minHeight:'100vh',color:C.text,fontFamily:'system-ui,sans-serif'}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* HEADER */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:'16px 26px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:C.orange,borderRadius:8,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:17,color:'white'}}>E</div>
          <div>
            <p style={{fontSize:16,fontWeight:700}}>EMBODI Health &amp; Fitness</p>
            <p style={{color:C.muted,fontSize:11,marginTop:1}}>
              Live Business Intelligence
              {lastUpdated&&<span style={{marginLeft:8,color:C.green}}>● {lastUpdated.toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <div style={{display:'flex',gap:16,alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <p style={{color:C.muted,fontSize:10}}>LIFETIME REVENUE</p>
            <p style={{color:C.orange,fontSize:20,fontWeight:700}}>$965,679+</p>
          </div>
          <button onClick={fetchLive} disabled={loading} style={{background:C.orange,border:'none',color:'white',borderRadius:8,padding:'8px 18px',cursor:'pointer',fontSize:13,fontWeight:600,opacity:loading?0.6:1}}>
            {loading?'Loading...':'↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {error&&(
        <div style={{margin:'16px 24px',background:'#1a0a0a',border:`1px solid ${C.red}40`,borderLeft:`4px solid ${C.red}`,borderRadius:10,padding:'12px 16px'}}>
          <p style={{color:C.red,fontWeight:600,marginBottom:4}}>⚠️ QuickBooks Connection Error — showing historical data</p>
          <p style={{color:C.muted,fontSize:12}}>{error}</p>
        </div>
      )}

      {/* TABS */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:'0 26px',display:'flex',gap:2,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',color:tab===t.id?C.orange:C.muted,borderBottom:tab===t.id?`2px solid ${C.orange}`:'2px solid transparent',padding:'12px 14px',cursor:'pointer',fontSize:12,fontWeight:tab===t.id?600:400,whiteSpace:'nowrap'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* YEAR SELECTOR */}
      <div style={{background:C.dark2,borderBottom:`1px solid ${C.border}`,padding:'10px 26px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <span style={{color:C.muted,fontSize:11}}>Viewing:</span>
        {['live','2023','2024','2025'].map(v=>(
          <button key={v} onClick={()=>setYr(v)} style={{background:yr===v?C.orange:C.card,border:`1px solid ${yr===v?C.orange:C.border}`,color:yr===v?'white':C.muted,borderRadius:7,padding:'6px 15px',cursor:'pointer',fontSize:12,fontWeight:yr===v?600:400}}>
            {v==='live'?`🔴 Live ${curYear}`:v}
          </button>
        ))}
        {yr==='live'&&liveData&&<span style={{color:C.green,fontSize:11}}>Live {curYear} YTD from QuickBooks</span>}
      </div>

      {/* CONTENT */}
      <div style={{padding:24,maxWidth:1400,margin:'0 auto'}}>

        {/* OVERVIEW */}
        {tab==='overview'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              <KPI label="Revenue" value={fmt(yrRow.revenue)} sub={yr==='live'?`${curYear} YTD`:'Full year'} delta={yr==='live'&&yoy!==null?yoy:null}/>
              <KPI label="EBITDA" value={fmt(yrRow.ebitda)} sub={`${yrRow.ebitdaMargin}% margin`} color={C.green}/>
              <KPI label="Net Income" value={fmt(yrRow.net)} sub={`${yrRow.margin}% net margin`} color={C.amber}/>
              <KPI label="MRR" value={fmt(yrRow.mrr||Math.round(yrRow.revenue/12))} sub={`ARR: ${fmt((yrRow.mrr||Math.round(yrRow.revenue/12))*12)}`} color={C.blue}/>
            </div>

            <div style={{marginBottom:20}}>
              <p style={{color:C.muted,fontSize:10,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>5 Numbers That Matter Most</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
                {[
                  {l:'Annual Churn',v:'~85%',sub:'Target: <30%',c:C.red,f:C.red},
                  {l:'EBITDA Margin',v:`${yrRow.ebitdaMargin}%`,sub:'Excellent',c:C.green,f:C.green},
                  {l:'LTV : CAC',v:'19.7x',sub:'Benchmark: >5x',c:C.amber,f:C.green},
                  {l:'Current Ratio',v:bal.currentRatio?`${bal.currentRatio}x`:'0.98x',sub:'Target: >1.5x',c:C.amber,f:C.amber},
                  {l:'Processing Rate',v:kpis.processingRate?`${kpis.processingRate}%`:'5.7%',sub:'Target: <3.5%',c:C.red,f:C.amber},
                ].map((s,i)=>(
                  <div key={i} style={{background:C.card,borderRadius:10,padding:'14px 16px',border:`1px solid ${s.f}40`,borderTop:`3px solid ${s.f}`}}>
                    <p style={{color:C.muted,fontSize:10,marginBottom:5,textTransform:'uppercase',letterSpacing:1}}>{s.l}</p>
                    <p style={{color:s.c,fontSize:21,fontWeight:700}}>{s.v}</p>
                    <p style={{color:C.muted,fontSize:10,marginTop:4}}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:20,marginBottom:20}}>
              <Card>
                <ST>{yr==='live'?`${curYear} YTD vs Historical P&L`:'Year-Over-Year P&L'}</ST>
                <ResponsiveContainer width="100%" height={255}>
                  <BarChart data={annualRows} barGap={3} barCategoryGap="22%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="year" tick={{fill:C.muted,fontSize:11}}/>
                    <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} tick={{fill:C.muted,fontSize:10}}/>
                    <Tooltip content={<TTip/>}/>
                    <Legend wrapperStyle={{color:C.muted,fontSize:11}}/>
                    <Bar dataKey="revenue" name="Revenue" fill={C.orange} radius={[3,3,0,0]}/>
                    <Bar dataKey="ebitda"  name="EBITDA"  fill={C.green}  radius={[3,3,0,0]}/>
                    <Bar dataKey="net"     name="Net Income" fill={C.blue} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <ST>Margin Snapshot</ST>
                <div style={{textAlign:'center',padding:'20px 0 10px'}}>
                  <p style={{color:C.muted,fontSize:12}}>EBITDA Margin</p>
                  <p style={{fontSize:54,fontWeight:800,color:yrRow.ebitdaMargin>=40?C.green:yrRow.ebitdaMargin>=35?C.orange:C.amber}}>{yrRow.ebitdaMargin}%</p>
                  <p style={{color:C.muted,fontSize:12,marginTop:4}}>Net Margin: {yrRow.margin}%</p>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:8}}>
                  {[{l:'EBITDA %',v:`${yrRow.ebitdaMargin}%`,c:C.green},{l:'Net %',v:`${yrRow.margin}%`,c:C.amber},{l:'Industry',v:'~32%',c:C.muted}].map((m,i)=>(
                    <div key={i} style={{background:C.dark2,borderRadius:8,padding:'10px',textAlign:'center'}}>
                      <p style={{color:C.muted,fontSize:10}}>{m.l}</p>
                      <p style={{color:m.c,fontSize:15,fontWeight:700,marginTop:3}}>{m.v}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                {l:'LTV : CAC',v:'19.7x',n:'World-class (>5x benchmark)'},
                {l:'CAC Payback',v:'8 days',n:'vs. 12 month industry benchmark'},
                {l:'Blended CAC',v:'$154',n:'vs. $483 Google peak 2024'},
                {l:'Monthly Break-Even',v:'$9,921',n:`$${Math.round((yrRow.mrr||27000)-9921).toLocaleString()} monthly safety margin`},
              ].map((s,i)=>(
                <div key={i} style={{background:C.card,borderRadius:10,padding:'16px 18px',border:`1px solid ${C.border}`,textAlign:'center'}}>
                  <p style={{color:C.muted,fontSize:10,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>{s.l}</p>
                  <p style={{color:C.text,fontSize:20,fontWeight:700}}>{s.v}</p>
                  <p style={{color:C.muted,fontSize:11,marginTop:5}}>{s.n}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVENUE */}
        {tab==='revenue'&&(
          <div>
            <Card style={{marginBottom:20}}>
              <ST>{yr==='live'?`Monthly Revenue — ${curYear} YTD (Live)`:`Monthly Revenue — ${yr}`}</ST>
              {monthly.length===0
                ? <div style={{textAlign:'center',padding:40,color:C.muted}}>No monthly data yet for this period.</div>
                : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                      <XAxis dataKey="p" tick={{fill:C.muted,fontSize:10}}/>
                      <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} tick={{fill:C.muted,fontSize:10}}/>
                      <Tooltip content={<TTip/>}/>
                      <Legend wrapperStyle={{color:C.muted,fontSize:11}}/>
                      <Bar dataKey="rev" name="Revenue" fill={C.orange} opacity={0.85} radius={[2,2,0,0]}/>
                      <Line dataKey="net" name="Net Income" stroke={C.green} strokeWidth={2} dot={false}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <Card>
                <ST>YOY Revenue Comparison</ST>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={annualRows} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="year" tick={{fill:C.muted,fontSize:11}}/>
                    <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} tick={{fill:C.muted,fontSize:10}}/>
                    <Tooltip content={<TTip/>}/>
                    <Bar dataKey="revenue" name="Revenue" radius={[3,3,0,0]}>
                      {annualRows.map((_,i)=><Cell key={i} fill={i===annualRows.length-1?C.orange:'#E8631A88'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <ST>Revenue Milestones</ST>
                {[
                  {yr:'2023',rev:'$207,794',note:'Baseline year',g:null,c:C.muted},
                  {yr:'2024',rev:'$329,647',note:'+58.6% breakout year',g:'+58.6%',c:C.orange},
                  {yr:'2025',rev:'$346,612',note:'+5.1% growth stalled',g:'+5.1%',c:C.amber},
                  {yr:`${curYear} YTD`,rev:fmt(liveData?.thisYear?.revenue||0),note:yoy!==null?`${yoy>0?'+':''}${yoy}% YOY pace`:'Live data',g:yoy!==null?`${yoy>0?'+':''}${yoy}%`:null,c:C.green},
                ].map((r,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<3?`1px solid ${C.border}`:'none'}}>
                    <div>
                      <p style={{color:C.text,fontWeight:600,fontSize:13}}>{r.yr}</p>
                      <p style={{color:C.muted,fontSize:11,marginTop:2}}>{r.note}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{color:r.c,fontSize:18,fontWeight:700}}>{r.rev}</p>
                      {r.g&&<p style={{color:C.green,fontSize:11}}>{r.g} YOY</p>}
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* EXPENSES */}
        {tab==='expenses'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              <KPI label="Total Expenses" value={fmt(yrRow.expenses||expTotal)} sub={yrRow.revenue?`${+(yrRow.expenses/yrRow.revenue*100).toFixed(1)}% of revenue`:''} color={C.amber}/>
              <KPI label="Rent" value={fmt(expCats.Rent)} sub={`${expDetail.find(e=>e.label==='Rent')?.pct||0}% of expenses`} color={C.muted}/>
              <KPI label="Labor Cost" value={fmt(expCats.Labor)} sub={`${expDetail.find(e=>e.label==='Labor')?.pct||0}% of expenses`} color={C.red} flag={expCats.Labor>35000?C.red:null}/>
              <KPI label="Processing Fees" value={fmt(expCats.Processing)} sub={kpis.processingRate?`${kpis.processingRate}% of revenue`:'Target: <3.5%'} color={C.purple} flag={C.amber}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
              <Card>
                <ST>Expense Categories</ST>
                <ResponsiveContainer width="100%" height={255}>
                  <BarChart data={[{year:yr==='live'?`${curYear} YTD`:yr,...expCats}]} barCategoryGap="50%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis dataKey="year" tick={{fill:C.muted,fontSize:12}}/>
                    <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} tick={{fill:C.muted,fontSize:10}}/>
                    <Tooltip content={<TTip/>}/>
                    <Legend wrapperStyle={{color:C.muted,fontSize:10}}/>
                    <Bar dataKey="Rent" fill={C.border} stackId="a"/>
                    <Bar dataKey="Labor" fill={C.red} stackId="a"/>
                    <Bar dataKey="Marketing" fill={C.blue} stackId="a"/>
                    <Bar dataKey="Processing" fill={C.purple} stackId="a"/>
                    <Bar dataKey="Dues/Subs" fill={C.amber} stackId="a"/>
                    <Bar dataKey="Other" fill="#6B7280" stackId="a" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <ST>Expense Mix</ST>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {expDetail.map((e,i)=>(
                    <div key={i} style={{background:C.dark2,borderRadius:7,padding:'10px 12px',display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:32,borderRadius:2,background:e.color,flexShrink:0}}/>
                      <div style={{flex:1,overflow:'hidden'}}>
                        <p style={{color:C.muted,fontSize:10,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.label}</p>
                        <p style={{color:C.text,fontSize:13,fontWeight:700}}>{fmt(e.val)}</p>
                      </div>
                      <p style={{color:e.color,fontSize:12,fontWeight:700,flexShrink:0}}>{e.pct}%</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <Card>
              <ST sub="Outside Services (contractors, trainers, coaches) grew 12x from 2023 to 2025">⚠️ Labor Cost Trajectory</ST>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                {[{yr:'2023',v:3415,note:'Minimal',hot:false},{yr:'2024',v:29574,note:'Kate + contractors',hot:true},{yr:'2025',v:41537,note:'12x from 2023',hot:true},{yr:`${curYear} YTD`,v:expCats.Labor,note:liveData?'Live QB':'Estimate',hot:expCats.Labor>15000}].map((d,i)=>(
                  <div key={i} style={{background:C.dark2,borderRadius:10,padding:16,textAlign:'center'}}>
                    <p style={{color:C.muted,fontSize:11,marginBottom:8}}>{d.yr}</p>
                    <p style={{color:d.hot?C.red:C.muted,fontSize:22,fontWeight:700}}>{fmt(d.v)}</p>
                    <p style={{color:C.muted,fontSize:11,marginTop:8}}>{d.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* CLIENTS */}
        {tab==='clients'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
              <KPI label="Total in CRM" value="542" sub="All contacts" color={C.blue}/>
              <KPI label="Active Members" value={kpis.activeMembers||48} sub="33 Semi-Private · 15 Private" color={C.orange}/>
              <KPI label="Unconverted Leads" value={kpis.unconvLeads||322} sub="Qualified — not yet members" color={C.amber}/>
              <KPI label="Win-Back Pool" value={kpis.winBackPool||168} sub="Inactive members + clients" color={C.purple}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20,marginBottom:20}}>
              <Card>
                <ST>Top 10 Clients by Lifetime Revenue</ST>
                <ResponsiveContainer width="100%" height={290}>
                  <BarChart data={TOP_CLIENTS} layout="vertical" barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                    <XAxis type="number" tickFormatter={v=>`$${(v/1000).toFixed(0)}K`} tick={{fill:C.muted,fontSize:10}}/>
                    <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:10}} width={115}/>
                    <Tooltip content={<TTip/>}/>
                    <Bar dataKey="rev" name="Lifetime Revenue" radius={[0,3,3,0]}>
                      {TOP_CLIENTS.map((_,i)=><Cell key={i} fill={i===0?C.amber:i<3?C.orange:'#E8631A88'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <ST>CRM Status (542 Total)</ST>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={CLIENT_PIE} cx="50%" cy="50%" outerRadius={75} innerRadius={38} dataKey="value" paddingAngle={2}>
                      {CLIENT_PIE.map((e,i)=><Cell key={i} fill={e.color}/>)}
                    </Pie>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginTop:8}}>
                  {CLIENT_PIE.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:7}}>
                      <div style={{width:8,height:8,borderRadius:2,background:c.color}}/>
                      <span style={{color:C.muted,fontSize:10}}>{c.name}: <strong style={{color:C.text}}>{c.value}</strong></span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <Card>
                <ST>Gender Split</ST>
                <div style={{display:'flex',gap:12}}>
                  {[{label:'Female',val:147,pct:'55.9%',color:C.orange},{label:'Male',val:116,pct:'44.1%',color:C.blue}].map((g,i)=>(
                    <div key={i} style={{flex:1,background:C.dark2,borderRadius:8,padding:16,textAlign:'center'}}>
                      <p style={{color:g.color,fontSize:26,fontWeight:700}}>{g.pct}</p>
                      <p style={{color:C.text,fontWeight:600,marginTop:5,fontSize:13}}>{g.label}</p>
                      <p style={{color:C.muted,fontSize:11,marginTop:3}}>{g.val} clients</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <ST>Top Referrers</ST>
                {[['Michael Almeida',58,C.orange],['Diego Poma',19,C.blue],['Geovanna Peralta',4,C.muted],['Kate Santana',3,C.muted]].map(([name,count,color],i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:i<3?`1px solid ${C.border}`:'none'}}>
                    <p style={{color:C.muted,fontSize:12}}>{name}</p>
                    <p style={{color,fontWeight:700,fontSize:13}}>{count} referrals</p>
                  </div>
                ))}
                <div style={{background:`${C.orange}15`,borderRadius:7,padding:10,marginTop:10}}>
                  <p style={{color:C.orange,fontSize:11,fontWeight:600}}>Referral CAC = $0 · LTV:CAC = infinite</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {tab==='insights'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div>
              <h3 style={{color:C.text,fontSize:14,fontWeight:600,marginBottom:14}}>⚠️ Warnings &amp; Risks</h3>
              {[
                {t:'~85% Annual Churn Rate',b:'Industry target is under 30%. Roughly 85% of members leave within 12 months. Dropping churn to 40% would transform every other metric automatically.',c:C.red},
                {t:'Revenue Growth Stalled',b:'After +58.6% in 2024, growth slowed to +5.1% in 2025. The constraint is conversion and retention, not awareness.',c:C.red},
                {t:'Processing Fees at 5.7%',b:'Industry standard is 2.5-3.5%. Switching processors or enabling ACH for recurring members saves ~$9K per year in pure net income.',c:C.amber},
                {t:'Current Ratio Below 1.0x',b:'Current assets barely cover current liabilities. Build a $15-20K operating reserve before increasing distributions.',c:C.amber},
                {t:'Labor Growing Faster Than Revenue',b:'Outside Services grew 12x from 2023 to 2025. Revenue grew 66%. Every new contractor must be tied to measurable revenue output.',c:C.amber},
              ].map((ins,i)=>(
                <div key={i} style={{background:C.card,borderLeft:`4px solid ${ins.c}`,borderRadius:12,padding:'14px 18px',marginBottom:10,border:`1px solid ${ins.c}30`}}>
                  <p style={{color:ins.c,fontWeight:700,marginBottom:5,fontSize:13}}>{ins.t}</p>
                  <p style={{color:C.muted,fontSize:12,lineHeight:1.65}}>{ins.b}</p>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{color:C.text,fontSize:14,fontWeight:600,marginBottom:14}}>🎯 Opportunities</h3>
              {[
                {t:'322 Qualified Leads Unconverted',b:'At $3,027 avg LTV, converting 10% = $96,928 in lifetime revenue. Personal text outreach + trial offer + 7-day deadline. Zero ad spend required.',c:C.green},
                {t:'168 Win-Back Opportunities',b:'Former members convert at 2-3x the rate of cold leads. Personal outreach asking what happened + specific re-engagement offer. 15% win-back = 25 members.',c:C.green},
                {t:'LTV:CAC of 19.7x — Underinvesting in Marketing',b:'For every $1 spent you earn $19.70 back. You are almost certainly underspending. Doubling the marketing budget is one of the highest-certainty investments available.',c:C.green},
                {t:'Referral Program at $0 CAC',b:'Michael referred 58 clients at $0 cost. A 1-free-month-per-referral program costs ~$555 per member — 5x better than Google Ads peak CPL of $483.',c:C.green},
                {t:'Processing Fee Arbitrage — $9K/yr',b:'Switching from 5.7% to 3% processing saves $9,362/yr in net income with zero revenue impact. Easiest high-certainty improvement available right now.',c:C.blue},
              ].map((ins,i)=>(
                <div key={i} style={{background:C.card,borderLeft:`4px solid ${ins.c}`,borderRadius:12,padding:'14px 18px',marginBottom:10,border:`1px solid ${ins.c}30`}}>
                  <p style={{color:ins.c,fontWeight:700,marginBottom:5,fontSize:13}}>{ins.t}</p>
                  <p style={{color:C.muted,fontSize:12,lineHeight:1.65}}>{ins.b}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{textAlign:'center',padding:16,color:C.muted,fontSize:10,borderTop:`1px solid ${C.border}`}}>
        Live data via QuickBooks API · EMBODI Health &amp; Fitness
        {lastUpdated&&<span style={{marginLeft:12}}>Last synced: {lastUpdated.toLocaleString()}</span>}
      </div>
    </div>
  );
}
