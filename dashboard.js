function renderDashboard(){
  const t=today();
  const te=DB.expenses.filter(e=>e.date===t);
  const spent=te.reduce((a,e)=>a+e.amount,0);
  const db=getDailyBudget();
  $('#d-spent').textContent=fmt(spent);
  $('#d-budget-rem').textContent='Daily: '+fmt(db)+' | Left: '+fmt(Math.max(0,db-spent));
  const wa=daysAgo(7);const waStr_=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');
  const we=DB.expenses.filter(e=>e.date&&e.date>=waStr_);
  const wamt=we.filter(e=>e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const tamt=we.reduce((a,e)=>a+e.amount,0);
  $('#d-waste').textContent=fmt(wamt);
  $('#d-waste-pct').textContent=(tamt?Math.round(wamt/tamt*100):0)+'% of weekly spending';
  const total=DB.skills.reduce((a,s)=>a+s.total,0);const done=DB.skills.reduce((a,s)=>a+s.comp,0);
  const pct=total?Math.round(done/total*100):0;
  $('#d-learn-pct').textContent=pct+'%';$('#d-learn-bar').style.width=pct+'%';
  $('#d-learn-sub').textContent=done+'/'+total+' sub-topics';
  const now_=new Date();
  const mPfx_=now_.getFullYear()+'-'+String(now_.getMonth()+1).padStart(2,'0');
  const sideInc=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx_)&&i.type!=='salary').reduce((a,i)=>a+i.amount,0);
  const sideGoal=DB.settings.sideGoal||10000;
  if($('#d-side-inc'))$('#d-side-inc').textContent=fmt(sideInc);
  if($('#d-side-goal'))$('#d-side-goal').textContent='of '+fmt(sideGoal)+' goal';
  // Tasks
  const tl=$('#d-tasks-list');tl.innerHTML='';
  const pt=DB.tasks.filter(t=>!t.done);
  if(!pt.length){tl.innerHTML='<div class="text-dim text-sm" style="padding:8px">No pending tasks!</div>';}
  pt.slice(0,8).forEach(t=>{
    const r=document.createElement('div');r.className='habit-row';r.style.padding='5px 0';
    r.innerHTML=`<div class="flex items-center gap8"><div class="habit-check ${t.done?'done':''}" onclick="toggleTask('${t.id}')">${t.done?'✓':''}</div><span style="font-size:12px;${t.done?'text-decoration:line-through;color:var(--text3)':''}">${t.title}</span></div><span class="badge badge-warn" style="font-size:9px">${t.cat}</span>`;
    tl.appendChild(r);
  });
  // Habits
  const hr=$('#d-habits-row');hr.innerHTML='';
  DB.habits.forEach(h=>{
    const done=h.log&&h.log.includes(t);
    const el=document.createElement('div');
    el.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3);border:1px solid var(--border);cursor:pointer;';
    el.innerHTML=`<div class="habit-check ${done?'done':''}" onclick="toggleHabitToday('${h.id}')">${done?'✓':''}</div><span style="font-size:12px">${h.name}</span>`;
    hr.appendChild(el);
  });
  if(!DB.habits.length)hr.innerHTML='<div class="text-dim text-sm">Add habits in Tasks & Routine</div>';
  renderInsights();
  renderHealthScore();
  renderDashCarousel();
  renderSpentSparkline();
  checkAutoReset();
}
function renderInsights(){
  const t=today();const ins=$('#d-insights');ins.innerHTML='';
  const add=(msg,cls='')=>{const d=document.createElement('div');d.className='insight '+cls;d.innerHTML='<span>'+msg+'</span>';ins.appendChild(d);};
  const db=getDailyBudget();
  const ts=DB.expenses.filter(e=>e.date===t).reduce((a,e)=>a+e.amount,0);
  if(ts>db)add('⚠️ Overspending today: '+fmt(ts)+' / '+fmt(db),'bad');
  else if(ts===0)add('💰 No expenses logged yet today.','');
  else add('✅ On track today: '+fmt(ts)+' / '+fmt(db),'good');
  const wa=daysAgo(7);const waStr=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');
  const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  if(sh<5)add('📚 Only '+sh.toFixed(1)+'h studied this week. Target: 15h!','bad');
  else if(sh>=15)add('🔥 Crushing it! '+sh.toFixed(1)+'h studied this week!','good');
  else add('📖 '+sh.toFixed(1)+'h studied. Keep pushing!','');
  if(!DB.studyLog.find(s=>s.date===t))add("📚 You didn't study today.",'bad');
  const we=DB.expenses.filter(e=>e.tag==='Waste'&&e.date&&e.date>=waStr);
  const lw=we.filter(e=>e.desc&&e.desc.toLowerCase().includes('lunch'));
  if(lw.length>1)add('😑 Spent on lunch '+lw.length+'x this week. Cook at home?','bad');
  if(!ins.children.length)add('✅ All good! You are on track.','good');
}
// ── Spending Sparkline ─────────────────────────────────────────
function renderSpentSparkline(){
  const el=$('#d-spent-sparkline');if(!el)return;
  const bars=[];let maxAmt=0;
  for(let i=6;i>=0;i--){
    const d=daysAgo(i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const amt=DB.expenses.filter(e=>e.date===ds).reduce((a,e)=>a+e.amount,0);
    const label=d.toLocaleDateString('en-IN',{weekday:'short'}).slice(0,2);
    if(amt>maxAmt)maxAmt=amt;
    bars.push({ds,amt,label,isToday:i===0});
  }
  const maxH=24;
  el.innerHTML='<div style="display:flex;align-items:flex-end;gap:3px;height:'+(maxH+14)+'px">'+
    bars.map(b=>{
      const h=maxAmt?Math.max(2,Math.round(b.amt/maxAmt*maxH)):2;
      const col=b.isToday?'var(--amber)':'var(--bg4)';
      const outline=b.isToday?'outline:1px solid var(--amber);':'';
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;height:100%">
        <div style="width:100%;height:${h}px;background:${col};${outline};border-radius:2px 2px 0 0;transition:height .4s" title="${b.ds}: ${fmt(b.amt)}"></div>
        <div style="font-family:var(--mono);font-size:7px;color:${b.isToday?'var(--amber)':'var(--text3)'}">${b.label}</div>
      </div>`;
    }).join('')+'</div>';
}

// ── Dashboard Stats Carousel ───────────────────────────────────
let _dashCarIdx=0,_dashCarSlides=[],_dashCarTimer=null;

function renderDashCarousel(){
  const lbl=$('#dash-carousel-label');
  const body=$('#dash-carousel-body');
  const dots=$('#dash-carousel-dots');
  if(!lbl||!body||!dots)return;

  const now=new Date();
  const mPfx=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const budget=DB.settings.budget||15000;
  const dailyBudget=getDailyBudget();
  const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const daysLeft=daysInMonth-now.getDate();
  const todayStr=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');

  // Today spent
  const todaySpent=DB.expenses.filter(e=>e.date===todayStr).reduce((a,e)=>a+e.amount,0);
  const spentPct=Math.min(100,Math.round(todaySpent/dailyBudget*100));

  // Study this week
  const waStr=(()=>{const d=daysAgo(7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
  const studyHrs=DB.studyLog.filter(s=>s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  const studyPct=Math.min(100,Math.round(studyHrs/15*100));
  const lastTopic=(()=>{const l=[...DB.studyLog].reverse().find(s=>s.date>=waStr);return l?l.topic:'—';})();

  // WFO this week (Mon–Sun)
  const dow=now.getDay();
  const wkStart=new Date(now);wkStart.setDate(now.getDate()-(dow===0?6:dow-1));wkStart.setHours(0,0,0,0);
  const wsStr=wkStart.getFullYear()+'-'+String(wkStart.getMonth()+1).padStart(2,'0')+'-'+String(wkStart.getDate()).padStart(2,'0');
  const wfoCount=Object.entries(DB.corpAttendance).filter(([d,v])=>d>=wsStr&&(v.type||v)==='wfo').length;
  const wfoDots=['Mon','Tue','Wed','Thu','Fri'].map((day,i)=>{
    const dd=new Date(wkStart);dd.setDate(wkStart.getDate()+i);
    const ds=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
    const v=DB.corpAttendance[ds];const marked=(v&&(v.type||v)==='wfo');
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
      <div style="width:28px;height:28px;border-radius:50%;background:${marked?'var(--green)':'var(--bg3)'};border:1px solid ${marked?'var(--green)':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:10px">${marked?'✓':''}</div>
      <div style="font-family:var(--mono);font-size:8px;color:var(--text3)">${day}</div>
    </div>`;
  }).join('');

  // Savings
  const mInc=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx)).reduce((a,i)=>a+i.amount,0);
  const mExp=DB.expenses.filter(e=>e.date&&e.date.startsWith(mPfx)).reduce((a,e)=>a+e.amount,0);
  const savings=mInc-mExp;
  const savPct=mInc>0?Math.min(100,Math.round(savings/mInc*100)):0;

  // Invincibles
  const activeDebts=DB.debts.filter(d=>d.paid<d.total);
  const totalRem=activeDebts.reduce((a,d)=>a+(d.total-d.paid),0);
  const totalEmi=activeDebts.reduce((a,d)=>a+d.emi,0);
  const emisPaid=activeDebts.filter(d=>(d.emiLog||[]).some(e=>e.date&&e.date.startsWith(mPfx))).length;

  // Waste
  const wasteAmt=DB.expenses.filter(e=>e.date&&e.date>=waStr&&e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const totalWeekAmt=DB.expenses.filter(e=>e.date&&e.date>=waStr).reduce((a,e)=>a+e.amount,0);
  const wastePct=totalWeekAmt>0?Math.round(wasteAmt/totalWeekAmt*100):0;

  function bar(pct,col){return `<div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-top:6px"><div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .6s"></div></div>`;}
  function bigVal(val,col='var(--amber)'){return `<span style="font-family:var(--mono);font-size:22px;font-weight:700;color:${col}">${val}</span>`;}
  function sub(txt){return `<span style="font-size:11px;color:var(--text3);margin-left:6px">${txt}</span>`;}
  function row2(l,r,col='var(--text2)'){return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0"><span style="font-size:11px;color:var(--text3)">${l}</span><span style="font-family:var(--mono);font-size:12px;color:${col}">${r}</span></div>`;}

  _dashCarSlides=[
    {
      label:'TODAY\'S BUDGET',
      html:`<div>${bigVal(fmt(todaySpent),spentPct>100?'var(--red)':'var(--amber)')}<sub style="font-size:11px;color:var(--text3)"> of ${fmt(dailyBudget)}/day</sub></div>
      ${bar(spentPct,spentPct>100?'var(--red)':'var(--amber)')}
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:10px;color:var(--text3)">${spentPct}% used</span>
        <span style="font-size:10px;color:var(--text3)">${daysLeft} days left in month</span>
      </div>`
    },
    {
      label:'STUDY THIS WEEK',
      html:`<div>${bigVal(studyHrs.toFixed(1)+'h','var(--purple)')}<sub style="font-size:11px;color:var(--text3)"> of 15h goal</sub></div>
      ${bar(studyPct,'var(--purple)')}
      ${row2('Last studied',lastTopic,'var(--cyan)')}
      ${row2('Remaining',Math.max(0,15-studyHrs).toFixed(1)+'h','var(--text2)')}`
    },
    {
      label:'WFO THIS WEEK',
      html:`<div style="display:flex;gap:10px;align-items:center;justify-content:center;margin-bottom:10px">
        ${bigVal(wfoCount+'/5','var(--green)')}<sub style="font-size:11px;color:var(--text3)"> days in office</sub>
      </div>
      <div style="display:flex;gap:8px;justify-content:center">${wfoDots}</div>`
    },
    {
      label:'SAVINGS RATE',
      html:`<div>${bigVal((savings>=0?'+':'')+fmt(savings),savings>=0?'var(--green)':'var(--red)')}</div>
      ${row2('Income this month',fmt(mInc),'var(--green)')}
      ${row2('Spent this month',fmt(mExp),'var(--red)')}
      ${bar(savPct,'var(--green)')}
      <div style="font-size:10px;color:var(--text3);margin-top:4px">${savPct}% savings rate</div>`
    },
    {
      label:'WASTE CONTROL',
      html:`<div>${bigVal(fmt(wasteAmt),wastePct>30?'var(--red)':'var(--amber)')}<sub style="font-size:11px;color:var(--text3)"> wasted this week</sub></div>
      ${bar(Math.min(100,wastePct*2.5),wastePct>30?'var(--red)':'var(--amber)')}
      ${row2('% of weekly spend',wastePct+'%',wastePct>30?'var(--red)':'var(--green)')}
      ${row2('Total week spend',fmt(totalWeekAmt),'var(--text2)')}`
    }
  ];

  function showSlide(i){
    _dashCarIdx=(i+_dashCarSlides.length)%_dashCarSlides.length;
    lbl.textContent=_dashCarSlides[_dashCarIdx].label;
    body.innerHTML=_dashCarSlides[_dashCarIdx].html;
    dots.innerHTML=_dashCarSlides.map((_,j)=>`<div style="width:6px;height:6px;border-radius:50%;background:${j===_dashCarIdx?'var(--amber)':'var(--bg4)'};cursor:pointer;transition:background .3s" onclick="dashCarouselGo(${j})"></div>`).join('');
  }

  if(_dashCarTimer)clearInterval(_dashCarTimer);
  showSlide(_dashCarIdx);
  _dashCarTimer=setInterval(()=>showSlide(_dashCarIdx+1),8000);
}

function dashCarouselPrev(){if(_dashCarTimer)clearInterval(_dashCarTimer);_dashCarIdx=(_dashCarIdx-1+_dashCarSlides.length)%_dashCarSlides.length;renderDashCarousel();}
function dashCarouselNext(){if(_dashCarTimer)clearInterval(_dashCarTimer);_dashCarIdx=(_dashCarIdx+1)%_dashCarSlides.length;renderDashCarousel();}
function dashCarouselGo(i){if(_dashCarTimer)clearInterval(_dashCarTimer);_dashCarIdx=i;renderDashCarousel();}

function dashQuickTask(){
  const v=$('#d-quick-task').value.trim();if(!v)return;
  DB.tasks.push({id:uid(),title:v,cat:'personal',priority:'medium',done:false,date:today()});
  saveDB();$('#d-quick-task').value='';renderDashboard();toast('Task added!','good');
}
