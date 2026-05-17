// ═══════════════════════════════════════════════════════════════

const HS_GRADES = [
  { min:90, grade:'S', label:'ELITE',    color:'#2ecc71', rgb:'46,204,113' },
  { min:75, grade:'A', label:'STRONG',   color:'#22d3ee', rgb:'34,211,238' },
  { min:60, grade:'B', label:'GOOD',     color:'#f0a500', rgb:'240,165,0'  },
  { min:45, grade:'C', label:'AVERAGE',  color:'#ff8c00', rgb:'255,140,0'  },
  { min:30, grade:'D', label:'WEAK',     color:'#e03b3b', rgb:'224,59,59'  },
  { min:0,  grade:'F', label:'CRITICAL', color:'#9b1c1c', rgb:'155,28,28'  },
];

function getGrade(score){
  return HS_GRADES.find(g=>score>=g.min) || HS_GRADES[HS_GRADES.length-1];
}

function computeHealthScore(){
  const now=new Date();
  const m=now.getMonth(); const y=now.getFullYear();
  // Month prefix for fast string-based date filtering (timezone-safe)
  const mPfx=y+'-'+String(m+1).padStart(2,'0');

  // ── Pillar 1: Savings Rate (0-15) ──────────────────────────
  const monthInc = DB.income
    .filter(i=>i.date&&i.date.startsWith(mPfx))
    .reduce((a,i)=>a+i.amount, 0);
  const monthExp = DB.expenses
    .filter(e=>e.date&&e.date.startsWith(mPfx))
    .reduce((a,e)=>a+e.amount, 0);
  const savingsRate = monthInc > 0 ? Math.max(0,(monthInc-monthExp)/monthInc) : 0;
  const p1 = Math.min(15, Math.round(savingsRate/0.25*15));
  const p1pct = Math.round(savingsRate*100);

  // ── Pillar 2: Waste Control (0-15) ─────────────────────────
  const wasteAmt = DB.expenses
    .filter(e=>e.date&&e.date.startsWith(mPfx)&&e.tag==='Waste')
    .reduce((a,e)=>a+e.amount, 0);
  const wasteRate = monthExp>0 ? wasteAmt/monthExp : 0;
  const p2 = Math.max(0, Math.round((1-wasteRate/0.40)*15));
  const p2pct = Math.round(wasteRate*100);

  // ── Pillar 3: Invincibles — EMI paid this month (0-15) ─────
  const activeDebts = DB.debts.filter(d=>d.paid<d.total);
  let p3, p3pct;
  if(activeDebts.length===0){
    p3=15; p3pct=100;
  } else {
    const paidThisMonth = activeDebts.filter(d=>{
      return (d.emiLog||[]).some(e=>e.date&&e.date.startsWith(mPfx));
    }).length;
    p3pct = Math.round(paidThisMonth/activeDebts.length*100);
    p3 = Math.round(paidThisMonth/activeDebts.length*15);
  }

  // ── Pillar 4: Side Income vs Goal (0-10) ───────────────────
  const sideInc = DB.income
    .filter(i=>i.date&&i.date.startsWith(mPfx)&&i.type!=='salary')
    .reduce((a,i)=>a+i.amount, 0);
  const sideGoal = DB.settings.sideGoal||10000;
  const p4 = Math.min(10, Math.round(sideInc/sideGoal*10));
  const p4pct = Math.round(sideInc/sideGoal*100);

  // ── Pillar 5: Study Discipline (0-15) ──────────────────────
  const wa=daysAgo(7);
  // Use local date string for timezone-safe comparison
  const waStr=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');
  const studyHrs = DB.studyLog.filter(s=>s.date&&s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  const p5 = Math.min(15, Math.round(studyHrs/15*15));
  const p5pct = Math.round(studyHrs/15*100);

  // ── Pillar 6: Office Attendance — 3 WFO days/week (0-15) ──
  const dow_=now.getDay();
  const weekStart=new Date(now);
  weekStart.setDate(now.getDate()-(dow_===0?6:dow_-1));
  weekStart.setHours(0,0,0,0);
  const weekEnd=new Date(weekStart);
  weekEnd.setDate(weekStart.getDate()+6);
  weekEnd.setHours(23,59,59,999);
  // Use local date strings for comparison (timezone-safe)
  const wsStr=weekStart.getFullYear()+'-'+String(weekStart.getMonth()+1).padStart(2,'0')+'-'+String(weekStart.getDate()).padStart(2,'0');
  const weStr=weekEnd.getFullYear()+'-'+String(weekEnd.getMonth()+1).padStart(2,'0')+'-'+String(weekEnd.getDate()).padStart(2,'0');
  const wfoDaysThisWeek=Object.entries(DB.corpAttendance).filter(([d,v])=>{
    return d>=wsStr&&d<=weStr&&(v.type||v)==='wfo';
  }).length;
  const p6=Math.min(15,Math.round(wfoDaysThisWeek/3*15));
  const p6pct=Math.min(100,Math.round(wfoDaysThisWeek/3*100));
  const wfoDays=Object.entries(DB.corpAttendance).filter(([d,v])=>{
    return d.startsWith(mPfx)&&(v.type||v)==='wfo';
  }).length;

  // ── Pillar 7: Task Completion (0-15) ───────────────────────
  const monthTasks = DB.tasks.filter(t=>(t.date||today()).startsWith(mPfx));
  const doneTasks = monthTasks.filter(t=>t.done).length;
  const taskRate = monthTasks.length>0 ? doneTasks/monthTasks.length : 0.5;
  const p7 = Math.min(15, Math.round(taskRate*15));
  const p7pct = Math.round(taskRate*100);

  const total = p1+p2+p3+p4+p5+p6+p7;

  return {
    score: total,
    pillars: [
      { key:'savings',    label:'Savings Rate',    pts:p1, max:15, pct:p1pct, detail:p1pct+'% savings rate',              color:'#2ecc71' },
      { key:'waste',      label:'Waste Control',   pts:p2, max:15, pct:p2pct, detail:p2pct+'% of spend is waste',          color:p2pct>30?'#e03b3b':'#f0a500' },
      { key:'invincible', label:'Invincibles',     pts:p3, max:15, pct:p3pct, detail:p3pct+'% EMIs paid this month',      color:p3pct===100?'#2ecc71':'#f0a500' },
      { key:'side',       label:'Side Income',     pts:p4, max:10, pct:p4pct, detail:fmt(sideInc)+' of '+fmt(sideGoal),   color:'#3b82f6' },
      { key:'study',      label:'Study Hours',     pts:p5, max:15, pct:p5pct, detail:studyHrs.toFixed(1)+'h this week',   color:'#a855f7' },
      { key:'attendance', label:'Office Attend.',  pts:p6, max:15, pct:p6pct, detail:wfoDaysThisWeek+'/3 WFO days this week',               color:wfoDaysThisWeek>=3?'#2ecc71':'#22d3ee' },
      { key:'tasks',      label:'Tasks Done',      pts:p7, max:15, pct:p7pct, detail:doneTasks+'/'+monthTasks.length+' tasks completed', color:'#f0a500' },
    ],
    monthInc, monthExp, wasteAmt, sideInc, studyHrs,
  };
}

function saveHealthScoreHistory(score){
  const m = new Date().getMonth();
  const y = new Date().getFullYear();
  const key = y + '-' + String(m+1).padStart(2,'0');
  if(!DB.settings.hsHistory) DB.settings.hsHistory = {};
  DB.settings.hsHistory[key] = score;
  // Keep only last 12 months
  const keys = Object.keys(DB.settings.hsHistory).sort();
  if(keys.length > 12) delete DB.settings.hsHistory[keys[0]];
}

function renderHealthScore(){
  const { score, pillars } = computeHealthScore();
  const grade = getGrade(score);

  // Save to history (once per render — lightweight)
  saveHealthScoreHistory(score);

  // ── Apply grade color as CSS variable ──────────────────────
  const card = document.getElementById('health-score-card');
  if(!card) return;
  card.style.setProperty('--score-color', grade.color);
  card.style.setProperty('--score-rgb', grade.rgb);

  // ── Animate arc meter ──────────────────────────────────────
  // Arc: half-circle, path length ~251.2 (π * 80)
  const arcLen = 251.2;
  const offset = arcLen - (score / 100) * arcLen;
  const arcFill = document.getElementById('hs-arc-fill');
  if(arcFill){
    arcFill.style.stroke = grade.color;
    // Disable transition, jump to start, then re-enable and animate to target
    arcFill.style.transition = 'none';
    arcFill.style.strokeDashoffset = String(arcLen);
    arcFill.getBoundingClientRect(); // force reflow
    arcFill.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1), stroke .5s';
    requestAnimationFrame(()=>{
      arcFill.style.strokeDashoffset = String(offset);
    });
  }

  // ── Score number (count-up animation) ─────────────────────
  const numEl = document.getElementById('hs-score-num');
  if(numEl){
    numEl.style.color = grade.color;
    let current = 0;
    const step = Math.ceil(score / 40); // ~40 frames
    const timer = setInterval(()=>{
      current = Math.min(current + step, score);
      numEl.textContent = current;
      if(current >= score) clearInterval(timer);
    }, 25);
  }

  // ── Grade label + badge ────────────────────────────────────
  const gradeEl = document.getElementById('hs-grade-label');
  if(gradeEl) gradeEl.textContent = grade.label;

  const badgeEl = document.getElementById('hs-badge');
  if(badgeEl){
    badgeEl.textContent = 'GRADE ' + grade.grade;
    badgeEl.style.color = grade.color;
    badgeEl.style.borderColor = grade.color;
    badgeEl.style.background = `rgba(${grade.rgb},.12)`;
  }

  // ── Component bars ─────────────────────────────────────────
  const compEl = document.getElementById('hs-components');
  if(compEl){
    compEl.innerHTML = pillars.map(p => {
      const barWidth = Math.min(100, Math.round(p.pts / p.max * 100));
      return `<div class="hs-comp" title="${p.detail}">
        <div class="hs-comp-label">${p.label}</div>
        <div class="hs-comp-bar-wrap">
          <div class="hs-comp-bar" style="width:0%;background:${p.color}" data-target="${barWidth}"></div>
        </div>
        <div class="hs-comp-pts" style="color:${p.color}">${p.pts}/${p.max}</div>
      </div>`;
    }).join('');
    // Animate bars in with slight delay
    setTimeout(()=>{
      compEl.querySelectorAll('.hs-comp-bar').forEach((bar, i)=>{
        setTimeout(()=>{ bar.style.width = bar.dataset.target + '%'; }, i * 80);
      });
    }, 200);
  }

  // ── Verdict ────────────────────────────────────────────────
  const verdictEl = document.getElementById('hs-verdict');
  if(verdictEl) verdictEl.textContent = buildVerdict(score, pillars);

  // ── History mini-bars ──────────────────────────────────────
  renderHsHistory(grade.color);
}

function buildVerdict(score, pillars){
  // Find weakest pillar
  const weakest = [...pillars].sort((a,b)=>a.pts-b.pts)[0];
  const strongest = [...pillars].sort((a,b)=>b.pts-a.pts)[0];

  if(score >= 90) return `🏆 Exceptional discipline. ${strongest.label} is your superpower.`;
  if(score >= 75) return `💪 Strong performance. Push ${weakest.label} to reach elite.`;
  if(score >= 60) return `📈 Good foundation. Your biggest drag: ${weakest.label} (${weakest.pts}/20).`;
  if(score >= 45) return `⚠️ Room to grow. Fix ${weakest.label} first — it's costing you ${20-weakest.pts} points.`;
  if(score >= 30) return `🚨 Needs attention. ${weakest.label} is critically low (${weakest.pts}/20). Take action now.`;
  return `🔴 Critical state. ${weakest.label} scoring ${weakest.pts}/20. Start with the basics.`;
}

function renderHsHistory(currentColor){
  const hist = DB.settings.hsHistory || {};
  const histEl = document.getElementById('hs-history');
  if(!histEl) return;

  // Build last 6 months
  const months = [];
  for(let i=5; i>=0; i--){
    const d = new Date();
    d.setMonth(d.getMonth()-i);
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    const label = d.toLocaleDateString('en-IN',{month:'short'});
    months.push({ key, label, score: hist[key] ?? null });
  }

  histEl.innerHTML = months.map((m, i)=>{
    const s = m.score;
    const heightPct = s !== null ? Math.round(s/100*36) : 0; // max bar 36px
    const g = s !== null ? getGrade(s) : null;
    const isCurrentMonth = i === months.length - 1;
    const barColor = isCurrentMonth ? currentColor : (g ? g.color : '#1b2530');
    const opacity = isCurrentMonth ? '1' : '0.6';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div class="hs-hist-bar" style="height:36px;width:18px;background:var(--bg4);position:relative;border:1px solid var(--border)"
           title="${m.label}${s!==null?': '+s+' ('+getGrade(s).grade+')':' — no data'}">
        <div style="position:absolute;bottom:0;left:0;right:0;height:${heightPct}px;background:${barColor};opacity:${opacity};transition:height .6s ${i*0.1}s"></div>
      </div>
      <div style="font-family:var(--mono);font-size:8px;color:var(--text3)">${m.label.slice(0,3)}</div>
    </div>`;
  }).join('');
}
