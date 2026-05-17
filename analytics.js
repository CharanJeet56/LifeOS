// ═══════════════════════════════════════════════════════════════
// ANALYTICS — Chart.js powered
// ═══════════════════════════════════════════════════════════════
const CHART_DEFAULTS={responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:'#7a9ab8',font:{size:11}}},tooltip:{backgroundColor:'#0e1318',borderColor:'#2a3f55',borderWidth:1,titleColor:'#f0a500',bodyColor:'#c8d8e8'}},scales:{x:{ticks:{color:'#3d5a73',font:{size:10}},grid:{color:'rgba(30,45,61,.5)'}},y:{ticks:{color:'#3d5a73',font:{size:10}},grid:{color:'rgba(30,45,61,.5)'}}}};
const PIE_OPTS={...CHART_DEFAULTS,scales:{}};
const activeCharts={};
function destroyChart(id){if(activeCharts[id]){activeCharts[id].destroy();delete activeCharts[id];}}
function mkChart(id,type,data,opts){
  destroyChart(id);const el=$(('#'+id));if(!el)return;
  activeCharts[id]=new Chart(el,{type,data,options:{...CHART_DEFAULTS,...opts}});
  return activeCharts[id];
}
const COLORS=['#f0a500','#3b82f6','#2ecc71','#e03b3b','#a855f7','#22d3ee','#ff7f50','#ffc93c','#64748b','#ec4899'];

// ── Timezone-safe date helpers ────────────────────────────────
function lDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function mPfxOf(y,m){return y+'-'+String(m+1).padStart(2,'0');}

function switchAnalyticsTab(btn,tabId){
  const pane=document.getElementById('page-analytics');
  pane.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  pane.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
  const renderMap={
    'an-finance':renderFinAnalytics,'an-corp':renderCorpAnalytics,
    'an-learn':renderLearnAnalytics,'an-tasks':renderTasksAnalytics,
    'an-invincibles':renderInvAnalytics,'an-income':renderIncomeAnalytics,
    'an-goals':renderGoalsAnalytics,'an-overall':renderOverallAnalytics,
  };
  if(renderMap[tabId])renderMap[tabId]();
}

function renderAnalytics(){populateMonthSelectors();renderFinAnalytics();}

// ── Finance ──────────────────────────────────────────────────
function populateMonthSelectors(){
  const opts=[];
  for(let i=0;i<18;i++){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const val=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const label=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    opts.push({val,label,selected:i===0});
  }
  const sel=$('#an-month-select');const cmp=$('#an-compare-month');
  if(sel&&!sel.options.length){
    opts.forEach(o=>{
      sel.add(new Option(o.label,o.val,o.selected,o.selected));
      cmp.add(new Option(o.label,o.val));
    });
  }
}

function getMonthData(val){
  const pfx=val; // already 'YYYY-MM'
  const me=DB.expenses.filter(e=>e.date&&e.date.startsWith(pfx));
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(pfx)).reduce((a,i)=>a+i.amount,0);
  const total=me.reduce((a,e)=>a+e.amount,0);
  const waste=me.filter(e=>e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const savings=Math.max(0,mi-total);
  const [y,m]=val.split('-').map(Number);
  return{mi,total,waste,savings,me,y,m:m-1};
}

function fmtDiff(cur,prev){
  if(!prev)return'';
  const diff=cur-prev;const pct=prev?Math.round(Math.abs(diff)/prev*100):0;
  const sign=diff>=0?'+':'';const col=diff>0?'var(--green)':'var(--red)';
  return`<span style="font-size:10px;color:${col};font-family:var(--mono)">${sign}${fmt(diff)} (${pct}%)</span>`;
}

function renderFinAnalytics(){
  populateMonthSelectors();
  const selVal=$('#an-month-select')?.value||(new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0'));
  const cmpVal=$('#an-compare-month')?.value||'';
  const {mi,total,waste,savings,me}=getMonthData(selVal);
  const cmp=cmpVal?getMonthData(cmpVal):null;
  $('#an-income').textContent=fmt(mi);$('#an-spent').textContent=fmt(total);
  $('#an-waste').textContent=fmt(waste);
  $('#an-savings-pct').textContent=mi?Math.round(savings/mi*100)+'%':'0%';
  if(cmp){
    $('#an-income-cmp').innerHTML=fmtDiff(mi,cmp.mi)||'';
    $('#an-spent-cmp').innerHTML=fmtDiff(total,cmp.total)||'';
    $('#an-waste-cmp').innerHTML=fmtDiff(waste,cmp.waste)||'';
    $('#an-savings-cmp').innerHTML=fmtDiff(savings,cmp.savings)||'';
  } else {
    ['#an-income-cmp','#an-spent-cmp','#an-waste-cmp','#an-savings-cmp'].forEach(id=>{const el=$(id);if(el)el.innerHTML='';});
  }
  // Category pie
  const cats={};me.forEach(e=>{cats[e.cat]=(cats[e.cat]||0)+e.amount;});const ck=Object.keys(cats);
  mkChart('chart-exp-cat','doughnut',{labels:ck,datasets:[{data:ck.map(k=>cats[k]),backgroundColor:COLORS,borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);
  // 6-month income vs expenses
  const months=[];const incArr=[];const expArr=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const pfx=mPfxOf(d.getFullYear(),d.getMonth());
    months.push(d.toLocaleDateString('en-IN',{month:'short'}));
    incArr.push(DB.income.filter(x=>x.date&&x.date.startsWith(pfx)).reduce((a,x)=>a+x.amount,0));
    expArr.push(DB.expenses.filter(x=>x.date&&x.date.startsWith(pfx)).reduce((a,x)=>a+x.amount,0));
  }
  mkChart('chart-income-exp','bar',{labels:months,datasets:[{label:'Income',data:incArr,backgroundColor:'rgba(46,204,113,.7)',borderColor:'#2ecc71',borderWidth:1},{label:'Expenses',data:expArr,backgroundColor:'rgba(224,59,59,.7)',borderColor:'#e03b3b',borderWidth:1}]},{});
  // Tag split
  const need=me.filter(e=>e.tag==='Need').reduce((a,e)=>a+e.amount,0);const inv2=me.filter(e=>e.tag==='Investment').reduce((a,e)=>a+e.amount,0);
  mkChart('chart-tag-split','doughnut',{labels:['Need','Waste','Investment'],datasets:[{data:[need,waste,inv2],backgroundColor:['rgba(46,204,113,.7)','rgba(224,59,59,.7)','rgba(59,130,246,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);
  // Daily 30d
  const days30=[];const spend30=[];
  for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=lDateStr(d);days30.push(d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));spend30.push(DB.expenses.filter(e=>e.date===ds).reduce((a,e)=>a+e.amount,0));}
  mkChart('chart-daily-spend','line',{labels:days30,datasets:[{label:'Spend',data:spend30,borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.1)',fill:true,tension:.4,pointRadius:2}]},{plugins:{legend:{display:false}}});
  // Top 5 cats
  const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);
  mkChart('chart-top-cats','bar',{labels:sorted.map(x=>x[0]),datasets:[{label:'Amount',data:sorted.map(x=>x[1]),backgroundColor:COLORS,borderWidth:0}]},{plugins:{legend:{display:false}}});
  // 6-month savings trend
  const savArr=incArr.map((inc,i)=>Math.max(0,inc-expArr[i]));
  mkChart('chart-savings-trend','line',{labels:months,datasets:[{label:'Savings',data:savArr,borderColor:'#2ecc71',backgroundColor:'rgba(46,204,113,.1)',fill:true,tension:.4,pointRadius:3}]},{plugins:{legend:{display:false}}});
}

// ── Corporate ─────────────────────────────────────────────────
function renderCorpAnalytics(){
  const now=new Date();
  const mPfx=mPfxOf(now.getFullYear(),now.getMonth());
  const lmD=new Date(now);lmD.setMonth(now.getMonth()-1);
  const lmPfx=mPfxOf(lmD.getFullYear(),lmD.getMonth());

  const att=Object.entries(DB.corpAttendance).filter(([d])=>d.startsWith(mPfx));
  const wfo=att.filter(([,v])=>(v.type||v)==='wfo').length;
  const wfh=att.filter(([,v])=>(v.type||v)==='wfh').length;
  const leave=att.filter(([,v])=>(v.type||v)==='leave').length;
  const holiday=att.filter(([,v])=>(v.type||v)==='holiday').length;

  // Last month WFO for comparison
  const lastWfo=Object.entries(DB.corpAttendance).filter(([d,v])=>d.startsWith(lmPfx)&&(v.type||v)==='wfo').length;

  $('#an-wfo').textContent=wfo;$('#an-wfh').textContent=wfh;$('#an-leave').textContent=leave;
  const done=DB.corpLogs.filter(l=>l.status==='completed').length;
  $('#an-completion').textContent=DB.corpLogs.length?Math.round(done/DB.corpLogs.length*100)+'%':'0%';

  // WFO trend (6 months)
  const corpMonths=[];const wfoTrend=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const pfx=mPfxOf(d.getFullYear(),d.getMonth());
    corpMonths.push(d.toLocaleDateString('en-IN',{month:'short'}));
    wfoTrend.push(Object.entries(DB.corpAttendance).filter(([dd,v])=>dd.startsWith(pfx)&&(v.type||v)==='wfo').length);
  }

  mkChart('chart-attendance','doughnut',{labels:['WFO','WFH','Leave','Holiday'],datasets:[{data:[wfo,wfh,leave,holiday],backgroundColor:['rgba(46,204,113,.7)','rgba(59,130,246,.7)','rgba(120,120,120,.7)','rgba(168,85,247,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  const byMap={};DB.corpLogs.forEach(l=>{byMap[l.by]=(byMap[l.by]||0)+1;});const bk=Object.keys(byMap);
  mkChart('chart-assignee','bar',{labels:bk,datasets:[{label:'Tasks',data:bk.map(k=>byMap[k]),backgroundColor:COLORS,borderWidth:0}]},{plugins:{legend:{display:false}}});

  const pend=DB.corpLogs.filter(l=>l.status==='pending').length;const notd=DB.corpLogs.filter(l=>l.status==='not-completed').length;const inprog=DB.corpLogs.filter(l=>l.status==='in-progress').length;
  mkChart('chart-task-status','doughnut',{labels:['Completed','In Progress','Pending','Not Done'],datasets:[{data:[done,inprog,pend,notd],backgroundColor:['rgba(46,204,113,.7)','rgba(34,211,238,.7)','rgba(240,165,0,.7)','rgba(224,59,59,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  // WFO hours histogram using mins field
  const wfoMins=att.filter(([,v])=>(v.type||v)==='wfo').map(([,v])=>v.mins!=null?v.mins:(v.hrs||0)*60);
  const h1=wfoMins.filter(m=>m<180).length;const h2=wfoMins.filter(m=>m>=180&&m<360).length;const h3=wfoMins.filter(m=>m>=360).length;
  mkChart('chart-wfo-hrs','doughnut',{labels:['<3h (Low)','3-6h (Mid)','6+h (Full)'],datasets:[{data:[h1,h2,h3],backgroundColor:['rgba(224,59,59,.7)','rgba(255,165,0,.7)','rgba(46,204,113,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  // WFO 6-month trend
  mkChart('chart-work-priority','line',{labels:corpMonths,datasets:[{label:'WFO Days',data:wfoTrend,borderColor:'#2ecc71',backgroundColor:'rgba(46,204,113,.15)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#2ecc71'}]},{plugins:{legend:{display:false}}});
}

// ── Learning ──────────────────────────────────────────────────
function renderLearnAnalytics(){
  const waStr=(()=>{const d=daysAgo(7);return lDateStr(d);})();
  const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  const total=DB.studyLog.reduce((a,s)=>a+s.hrs,0);
  const done=DB.skills.reduce((a,s)=>a+s.comp,0);
  const daysStudied=new Set(DB.studyLog.map(s=>s.date)).size;
  const avgPerSession=(total/Math.max(1,DB.studyLog.length));

  $('#an-study-total').textContent=total.toFixed(1)+'h';
  $('#an-study-week').textContent=sh.toFixed(1)+'h';
  $('#an-topics-done').textContent=done;
  $('#an-study-avg').textContent=avgPerSession.toFixed(1)+'h';

  // Study hours per topic
  const tMap={};DB.studyLog.forEach(s=>{tMap[s.topic]=(tMap[s.topic]||0)+s.hrs;});const tk=Object.keys(tMap);
  mkChart('chart-topic-hrs','bar',{labels:tk,datasets:[{label:'Hours',data:tk.map(k=>tMap[k]),backgroundColor:COLORS,borderWidth:0}]},{plugins:{legend:{display:false}}});

  // Topic completion %
  const tNames=DB.skills.map(s=>s.name);const tPcts=DB.skills.map(s=>s.total?Math.round(s.comp/s.total*100):0);
  mkChart('chart-topic-pct','bar',{labels:tNames,datasets:[{label:'Completion %',data:tPcts,backgroundColor:tPcts.map(p=>p>=80?'rgba(46,204,113,.7)':p>=50?'rgba(240,165,0,.7)':'rgba(224,59,59,.7)'),borderWidth:0}]},{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}});

  // 8-week trend
  const wLabels=[];const wData=[];
  for(let i=7;i>=0;i--){
    const s=daysAgo(i*7);const e=daysAgo((i-1)*7);
    const sStr=lDateStr(s);const eStr=lDateStr(e);
    const hrs=DB.studyLog.filter(x=>x.date&&x.date>=sStr&&x.date<eStr).reduce((a,x)=>a+x.hrs,0);
    wLabels.push(s.toLocaleDateString('en-IN',{month:'short',day:'2-digit'}));wData.push(Math.round(hrs*10)/10);
  }
  mkChart('chart-study-trend','line',{labels:wLabels,datasets:[{label:'Hours/Week',data:wData,borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,.1)',fill:true,tension:.4,pointRadius:3}]},{plugins:{legend:{display:false}}});

  // Daily last 14 days
  const d14=[];const dh14=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=lDateStr(d);d14.push(d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));dh14.push(DB.studyLog.filter(s=>s.date===ds).reduce((a,s)=>a+s.hrs,0));}
  mkChart('chart-daily-study','bar',{labels:d14,datasets:[{label:'Hours',data:dh14,backgroundColor:dh14.map((_,i)=>i===13?'rgba(240,165,0,.8)':'rgba(34,211,238,.6)'),borderWidth:0}]},{plugins:{legend:{display:false}}});
}

// ── Tasks & Habits ────────────────────────────────────────────
function renderTasksAnalytics(){
  const total=DB.tasks.length;const done=DB.tasks.filter(t=>t.done).length;const pending=total-done;
  const mPfx=mPfxOf(new Date().getFullYear(),new Date().getMonth());
  const overdue=DB.tasks.filter(t=>!t.done&&t.date&&t.date<lDateStr(new Date())).length;
  $('#an-tasks-total').textContent=total;$('#an-tasks-done').textContent=done;$('#an-tasks-pending').textContent=pending;
  const avgStreak=DB.habits.length?Math.round(DB.habits.reduce((a,h)=>a+calcStreak(h.log),0)/DB.habits.length):0;
  $('#an-habit-avg').textContent=avgStreak+'🔥';

  const catMap={};DB.tasks.forEach(t=>{catMap[t.cat]=(catMap[t.cat]||0)+1;});const ck=Object.keys(catMap);
  mkChart('chart-task-cat','doughnut',{labels:ck,datasets:[{data:ck.map(k=>catMap[k]),backgroundColor:COLORS,borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  const priMap2={high:0,medium:0,low:0};DB.tasks.forEach(t=>{if(priMap2[t.priority]!==undefined)priMap2[t.priority]++;});
  mkChart('chart-task-pri','doughnut',{labels:['High','Medium','Low'],datasets:[{data:[priMap2.high,priMap2.medium,priMap2.low],backgroundColor:['rgba(224,59,59,.7)','rgba(240,165,0,.7)','rgba(46,204,113,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  // Habit last 7 days
  const dayLabels=[];const habScores=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);const ds=lDateStr(d);
    const done2=DB.habits.filter(h=>h.log?.includes(ds)).length;
    habScores.push(DB.habits.length?Math.round(done2/DB.habits.length*100):0);
    dayLabels.push(d.toLocaleDateString('en-IN',{weekday:'short'}));
  }
  mkChart('chart-habit-7d','bar',{labels:dayLabels,datasets:[{label:'Habit %',data:habScores,backgroundColor:habScores.map(s=>s>=80?'rgba(46,204,113,.7)':s>=50?'rgba(240,165,0,.7)':'rgba(224,59,59,.7)'),borderWidth:0}]},{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}});

  // Task completion trend (last 8 weeks)
  const wkLabels=[];const wkDone=[];const wkTotal=[];
  for(let i=7;i>=0;i--){
    const s=lDateStr(daysAgo(i*7+6));const e=lDateStr(daysAgo(i*7));
    const wt=DB.tasks.filter(t=>t.date&&t.date>=s&&t.date<=e);
    wkLabels.push(daysAgo(i*7).toLocaleDateString('en-IN',{month:'short',day:'2-digit'}));
    wkTotal.push(wt.length);wkDone.push(wt.filter(t=>t.done).length);
  }
  mkChart('chart-habit-streaks','bar',{labels:wkLabels,datasets:[{label:'Done',data:wkDone,backgroundColor:'rgba(46,204,113,.7)',borderWidth:0},{label:'Total',data:wkTotal,backgroundColor:'rgba(240,165,0,.3)',borderWidth:0}]},{});
}

// ── Invincibles ───────────────────────────────────────────────
function renderInvAnalytics(){
  const debts=DB.debts;const active=debts.filter(d=>d.paid<d.total);const conquered=debts.filter(d=>d.paid>=d.total);
  const totRem=active.reduce((a,d)=>a+(d.total-d.paid),0);
  const totPaid=debts.reduce((a,d)=>a+d.paid,0);
  const totOriginal=debts.reduce((a,d)=>a+d.total,0);
  const monthly=active.reduce((a,d)=>a+d.emi,0);
  const pct=totOriginal?Math.round(totPaid/totOriginal*100):100;
  const mPfx=mPfxOf(new Date().getFullYear(),new Date().getMonth());
  const emisThisMonth=active.filter(d=>(d.emiLog||[]).some(e=>e.date&&e.date.startsWith(mPfx))).length;

  $('#an-inv-total').textContent=fmt(totRem);$('#an-inv-paid-total').textContent=fmt(totPaid);
  $('#an-inv-monthly').textContent=fmt(monthly);$('#an-inv-pct').textContent=pct+'%';
  $('#an-inv-bar').style.width=pct+'%';

  mkChart('chart-inv-breakdown','bar',{labels:debts.map(d=>d.label),datasets:[{label:'Paid',data:debts.map(d=>d.paid),backgroundColor:'rgba(46,204,113,.7)',borderWidth:0},{label:'Remaining',data:debts.map(d=>Math.max(0,d.total-d.paid)),backgroundColor:'rgba(224,59,59,.7)',borderWidth:0}]},{scales:{x:{stacked:true},y:{stacked:true}}});

  mkChart('chart-inv-emi','doughnut',{labels:active.map(d=>d.label),datasets:[{data:active.map(d=>d.emi),backgroundColor:COLORS,borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  const list=$('#an-inv-list');list.innerHTML='';list.className='analytics-card-grid';
  debts.forEach(d=>{
    const p=Math.round(d.paid/d.total*100);const rem=Math.max(0,d.total-d.paid);
    const isConq=d.paid>=d.total;
    list.innerHTML+=`<div class="card" style="${isConq?'border-color:var(--green)':''}">
      <div class="card-title" style="${isConq?'color:var(--green)':''}">${d.label}${isConq?' ✓':''}</div>
      <div class="flex justify-between text-sm mb8"><span class="${isConq?'text-green':'text-red'} text-mono">${isConq?'Conquered':fmt(rem)+' left'}</span><span class="text-amber">${p}%</span></div>
      <div class="prog-wrap" style="height:8px"><div class="prog-fill green" style="width:${p}%"></div></div>
      <div class="text-dim text-xs mt8">EMI: ${fmt(d.emi)}/mo${rem&&d.emi?' · ~'+Math.ceil(rem/d.emi)+' months':''}</div>
    </div>`;
  });
}

// ── Income & Teaching ─────────────────────────────────────────
function renderIncomeAnalytics(){
  const now=new Date();const y=now.getFullYear();
  const mPfx=mPfxOf(y,now.getMonth());
  const yPfx=String(y)+'-';

  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx));
  const total=mi.reduce((a,i)=>a+i.amount,0);
  const salary=mi.filter(i=>i.type==='salary').reduce((a,i)=>a+i.amount,0);
  const side=mi.filter(i=>i.type!=='salary'&&i.type!=='split'&&i.type!=='borrowed').reduce((a,i)=>a+i.amount,0);
  const sideGoal=DB.settings.sideGoal||10000;
  const splitsOut=(DB.splits||[]).filter(s=>!s.received).reduce((a,s)=>a+s.amount,0);
  const ytd=DB.income.filter(i=>i.date&&i.date.startsWith(yPfx)).reduce((a,i)=>a+i.amount,0);

  // 6-month arrays
  const months6=[],inc6=[],exp6=[],sal6=[],side6=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const pfx=mPfxOf(d.getFullYear(),d.getMonth());
    months6.push(d.toLocaleDateString('en-IN',{month:'short'}));
    const mInc=DB.income.filter(x=>x.date&&x.date.startsWith(pfx));
    inc6.push(mInc.reduce((a,x)=>a+x.amount,0));
    sal6.push(mInc.filter(x=>x.type==='salary').reduce((a,x)=>a+x.amount,0));
    side6.push(mInc.filter(x=>x.type!=='salary'&&x.type!=='split'&&x.type!=='borrowed').reduce((a,x)=>a+x.amount,0));
    exp6.push(DB.expenses.filter(x=>x.date&&x.date.startsWith(pfx)).reduce((a,x)=>a+x.amount,0));
  }
  const avg6=Math.round(inc6.reduce((a,v)=>a+v,0)/6);

  if($('#an-inc-total'))$('#an-inc-total').textContent=fmt(total);
  if($('#an-inc-salary'))$('#an-inc-salary').textContent=fmt(salary);
  if($('#an-inc-side'))$('#an-inc-side').textContent=fmt(side);
  if($('#an-students-count'))$('#an-students-count').textContent=DB.students.length;
  const sideBar=$('#an-inc-side-bar');if(sideBar)sideBar.style.width=Math.min(100,Math.round(side/sideGoal*100))+'%';
  if($('#an-inc-splits'))$('#an-inc-splits').textContent=fmt(splitsOut);
  if($('#an-inc-ytd'))$('#an-inc-ytd').textContent=fmt(ytd);
  if($('#an-inc-avg'))$('#an-inc-avg').textContent=fmt(avg6);
  if($('#an-inc-goal'))$('#an-inc-goal').textContent=fmt(sideGoal)+'/mo';

  // Income by source pie
  const srcMap={};mi.forEach(i=>{srcMap[i.type]=(srcMap[i.type]||0)+i.amount;});
  const sk=Object.keys(srcMap);
  if(sk.length){
    mkChart('chart-inc-source','doughnut',{labels:sk,datasets:[{data:sk.map(k=>srcMap[k]),backgroundColor:COLORS,borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);
  }
  // 6-month income trend with salary vs side stacked
  mkChart('chart-inc-trend','bar',{labels:months6,datasets:[
    {label:'Salary',data:sal6,backgroundColor:'rgba(59,130,246,.7)',borderWidth:0,stack:'inc'},
    {label:'Side',data:side6,backgroundColor:'rgba(240,165,0,.7)',borderWidth:0,stack:'inc'},
  ]},{scales:{x:{stacked:true},y:{stacked:true}}});

  // Salary vs side doughnut
  mkChart('chart-inc-split','doughnut',{labels:['Salary','Side Income'],datasets:[{data:[salary,side],backgroundColor:['rgba(59,130,246,.7)','rgba(240,165,0,.7)'],borderColor:'#0e1318',borderWidth:2}]},PIE_OPTS);

  // Income vs Expenses grouped bar
  mkChart('chart-inc-vs-exp','bar',{labels:months6,datasets:[
    {label:'Income',data:inc6,backgroundColor:'rgba(46,204,113,.7)',borderWidth:0},
    {label:'Expenses',data:exp6,backgroundColor:'rgba(224,59,59,.7)',borderWidth:0},
  ]},{plugins:{legend:{position:'bottom',labels:{color:'#7a9ab8',font:{size:9}}}}});
}

// ── Goals ─────────────────────────────────────────────────────
function renderGoalsAnalytics(){
  const goals=DB.goals;
  const tTarget=goals.reduce((a,g)=>a+g.target,0);
  const tSaved=goals.reduce((a,g)=>a+g.saved,0);
  const avgPct=goals.length?Math.round(goals.reduce((a,g)=>a+(g.target?g.saved/g.target*100:0),0)/goals.length):0;
  $('#an-goals-count').textContent=goals.length;$('#an-goals-target').textContent=fmt(tTarget);
  $('#an-goals-saved').textContent=fmt(tSaved);$('#an-goals-avg-pct').textContent=avgPct+'%';

  mkChart('chart-goals-pct','bar',{labels:goals.map(g=>g.name),datasets:[{label:'% Funded',data:goals.map(g=>g.target?Math.round(g.saved/g.target*100):0),backgroundColor:goals.map(g=>{const p=g.target?g.saved/g.target*100:0;return p>=100?'rgba(46,204,113,.7)':p>=50?'rgba(240,165,0,.7)':'rgba(224,59,59,.7)';}),borderWidth:0}]},{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}});

  mkChart('chart-goals-vs','bar',{labels:goals.map(g=>g.name),datasets:[{label:'Target',data:goals.map(g=>g.target),backgroundColor:'rgba(59,130,246,.5)',borderWidth:0},{label:'Saved',data:goals.map(g=>g.saved),backgroundColor:'rgba(46,204,113,.7)',borderWidth:0}]},{});

  const list=$('#an-goals-list');list.innerHTML='';list.className='analytics-card-grid';
  goals.forEach(g=>{
    const p=g.target?Math.round(g.saved/g.target*100):0;const rem=g.target-g.saved;
    const dl=g.date?Math.ceil((new Date(g.date)-new Date())/86400000):null;
    const monthlyNeeded=dl&&dl>0&&rem>0?fmt(Math.ceil(rem/(dl/30))):null;
    list.innerHTML+=`<div class="card">
      <div class="card-title">${g.name}</div>
      <div class="flex justify-between text-sm mb8"><span class="text-green text-mono">${fmt(g.saved)}</span><span class="text-amber">${p}%</span></div>
      <div class="prog-wrap" style="height:8px"><div class="prog-fill ${p>=100?'green':''}" style="width:${Math.min(100,p)}%"></div></div>
      <div class="text-dim text-xs mt8">${fmt(rem)} left${dl!==null?' · '+(dl>0?dl+'d remaining':'⚠️ Overdue!'):''}${monthlyNeeded?'<br>Need '+monthlyNeeded+'/mo':''}</div>
    </div>`;
  });
}

// ── Overall ───────────────────────────────────────────────────
function renderOverallAnalytics(){
  const now=new Date();const mPfx=mPfxOf(now.getFullYear(),now.getMonth());
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx)).reduce((a,i)=>a+i.amount,0);
  const me=DB.expenses.filter(e=>e.date&&e.date.startsWith(mPfx)).reduce((a,e)=>a+e.amount,0);
  const inv=DB.investments.reduce((a,i)=>a+i.amount,0);
  const nw=mi-me+inv;$('#an-networth').textContent=fmt(Math.max(0,nw));

  const habits=DB.habits;
  const hScore=habits.length?Math.round(habits.reduce((a,h)=>{
    let score=0;
    for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);if(h.log?.includes(lDateStr(d)))score++;}
    return a+score/7;
  },0)/habits.length*100):0;
  $('#an-habit-score').textContent=hScore+'%';

  const waStr=lDateStr(daysAgo(7));
  const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  const sp=Math.min(100,Math.round(sh/15*100));
  $('#an-study-vs').textContent=sp+'%';$('#an-study-bar').style.width=sp+'%';

  const finScore=mi?Math.min(100,Math.max(0,Math.round((mi-me)/mi*100))):0;
  const corpScore=DB.corpLogs.length?Math.round(DB.corpLogs.filter(l=>l.status==='completed').length/DB.corpLogs.length*100):50;
  const itotal=DB.debts.reduce((a,d)=>a+d.total,0);const ipaid=DB.debts.reduce((a,d)=>a+d.paid,0);
  const ipct=itotal?Math.round(ipaid/itotal*100):100;
  const goalPct=DB.goals.length?Math.round(DB.goals.reduce((a,g)=>a+(g.target?g.saved/g.target*100:0),0)/DB.goals.length):50;
  const lifeScore=Math.round((finScore+sp+hScore+corpScore+ipct+goalPct)/6);
  $('#an-life-score').textContent=lifeScore;

  mkChart('chart-overall','radar',{labels:['Finance','Study','Habits','Corporate','Invincibles','Goals'],datasets:[{label:'Score',data:[finScore,sp,hScore,corpScore,ipct,goalPct],borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.2)',pointBackgroundColor:'#f0a500'}]},{plugins:{legend:{display:false}},scales:{r:{ticks:{color:'#3d5a73',font:{size:9}},grid:{color:'rgba(30,45,61,.8)'},pointLabels:{color:'#7a9ab8',font:{size:10}},min:0,max:100}}});

  // 6-month net worth trend
  const months6=[];const nw6=[];const sav6=[];
  for(let i=5;i>=0;i--){
    const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);
    const pfx=mPfxOf(d.getFullYear(),d.getMonth());
    months6.push(d.toLocaleDateString('en-IN',{month:'short'}));
    const mInc=DB.income.filter(x=>x.date&&x.date.startsWith(pfx)).reduce((a,x)=>a+x.amount,0);
    const mExp=DB.expenses.filter(x=>x.date&&x.date.startsWith(pfx)).reduce((a,x)=>a+x.amount,0);
    nw6.push(Math.max(0,mInc-mExp+inv));sav6.push(Math.max(0,mInc-mExp));
  }
  mkChart('chart-networth-trend','line',{labels:months6,datasets:[
    {label:'Net Worth',data:nw6,borderColor:'#2ecc71',backgroundColor:'rgba(46,204,113,.1)',fill:true,tension:.4,pointRadius:3},
    {label:'Savings',data:sav6,borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.05)',fill:true,tension:.4,pointRadius:3},
  ]},{});

  mkChart('chart-module-health','bar',{labels:['Finance','Study','Habits','Corporate','Invincibles','Goals'],datasets:[{label:'Health %',data:[finScore,sp,hScore,corpScore,ipct,goalPct],backgroundColor:[finScore>=70?'rgba(46,204,113,.7)':'rgba(224,59,59,.7)',sp>=70?'rgba(46,204,113,.7)':'rgba(240,165,0,.7)',hScore>=70?'rgba(46,204,113,.7)':'rgba(240,165,0,.7)',corpScore>=70?'rgba(46,204,113,.7)':'rgba(59,130,246,.7)',ipct>=70?'rgba(46,204,113,.7)':'rgba(224,59,59,.7)',goalPct>=70?'rgba(46,204,113,.7)':'rgba(240,165,0,.7)'],borderWidth:0}]},{plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}});
}
