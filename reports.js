// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
function renderReportStats(){
  const now_=new Date();const m=now_.getMonth();const y=now_.getFullYear();
  const mPfx_=y+'-'+String(m+1).padStart(2,'0');
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx_)).reduce((a,i)=>a+i.amount,0);
  const me=DB.expenses.filter(e=>e.date&&e.date.startsWith(mPfx_));
  const total=me.reduce((a,e)=>a+e.amount,0);const waste=me.filter(e=>e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const wa=daysAgo(7);const waStr_=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr_).reduce((a,s)=>a+s.hrs,0);
  $('#rep-income').textContent=fmt(mi);$('#rep-spent').textContent=fmt(total);$('#rep-waste').textContent=fmt(waste);$('#rep-study').textContent=sh.toFixed(1)+'h';
  let invHtml='';DB.debts.forEach(d=>{const rem=d.total-d.paid;const pct=Math.round(d.paid/d.total*100);invHtml+=`<div>⚔️ <strong>${d.label}</strong> — ${fmt(rem)} left (${pct}% cleared)</div>`;});
  if(!invHtml)invHtml='<div class="text-green">🎉 No Invincibles! You are FREE!</div>';
  $('#rep-invincibles').innerHTML=invHtml;
  let review=[];
  if(sh>=15)review.push('🔥 Crushed study target: '+sh.toFixed(1)+'h this week!');
  else if(sh<5)review.push('⚠️ Only '+sh.toFixed(1)+'h studied. Target: 15h/week.');
  else review.push('📈 '+sh.toFixed(1)+'h studied. Aim for 15h+.');
  const wp=total?Math.round(waste/total*100):0;
  if(wp>30)review.push('💸 '+wp+'% waste rate. Cut food & entertainment.');
  else review.push('✅ Waste at '+wp+'%. Decent control.');
  const it=DB.debts.reduce((a,d)=>a+(d.total-d.paid),0);
  if(it>0)review.push('⚔️ '+fmt(it)+' in Invincibles. Stay focused.');
  else review.push('🏆 Invincible-free! Invest that money.');
  if(mi>0&&total<mi)review.push('💰 Saved '+fmt(mi-total)+' this month. Consider investing.');
  $('#rep-ai-review').innerHTML=review.join('<br><br>');
}

function buildReportText(type,module){
  const now=new Date();const m=now.getMonth();const y=now.getFullYear();
  const mPfx_=y+'-'+String(m+1).padStart(2,'0');
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx_)).reduce((a,i)=>a+i.amount,0);
  const me=DB.expenses.filter(e=>e.date&&e.date.startsWith(mPfx_));
  const total=me.reduce((a,e)=>a+e.amount,0);const waste=me.filter(e=>e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const wa=daysAgo(7);const waStr_=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr_).reduce((a,s)=>a+s.hrs,0);
  const it=DB.debts.reduce((a,d)=>a+(d.total-d.paid),0);
  const period=type==='daily'?'DAILY':type==='weekly'?'WEEKLY':'MONTHLY';
  let lines=[`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,`LIFEOS ${period} REPORT`,`Generated: ${now.toLocaleString('en-IN')}`,`Module: ${module.toUpperCase()}`,`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,''];
  if(module==='all'||module==='finance'){
    lines.push('[ FINANCE ]');lines.push('Income:  '+fmt(mi));lines.push('Spent:   '+fmt(total));lines.push('Waste:   '+fmt(waste)+' ('+( total?Math.round(waste/total*100):0)+'%)');lines.push('Savings: '+fmt(Math.max(0,mi-total)));lines.push('');
  }
  if(module==='all'||module==='learning'){
    lines.push('[ LEARNING ]');lines.push('Study Hours (week): '+sh.toFixed(1)+'h / 15h target');
    DB.skills.forEach(s=>{const p=s.total?Math.round(s.comp/s.total*100):0;lines.push('  '+s.name+': '+s.comp+'/'+s.total+' ('+p+'%)');});lines.push('');
  }
  if(module==='all'||module==='invincibles'){
    lines.push('[ INVINCIBLES ]');
    if(DB.debts.length===0){lines.push('  No invincibles! Debt-free!');}
    else{DB.debts.forEach(d=>{const rem=d.total-d.paid;lines.push('  '+d.label+': '+fmt(rem)+' left');});}
    lines.push('  Total: '+fmt(it));lines.push('');
  }
  if(module==='all'||module==='corporate'){
    lines.push('[ CORPORATE ]');const mAtt=Object.entries(DB.corpAttendance).filter(([d])=>d.startsWith(mPfx_));
    const wfoDays=mAtt.filter(([,v])=>(v.type||v)==='wfo').length;const wfhDays=mAtt.filter(([,v])=>(v.type||v)==='wfh').length;
    lines.push('  WFO: '+wfoDays+' days | WFH: '+wfhDays+' days');
    const done=DB.corpLogs.filter(l=>l.status==='completed').length;const pend=DB.corpLogs.filter(l=>l.status==='pending').length;
    lines.push('  Completed: '+done+' | Pending: '+pend);lines.push('');
  }
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');lines.push('// LifeOS — Command Your Life');
  return lines.join('\n');
}

function generateReport(){
  renderReportStats();
  const type=$('#rep-type').value;const module=$('#rep-module').value;
  const txt=buildReportText(type,module);
  $('#report-preview-content').textContent=txt;
  $('#report-preview-card').style.display='block';
}

function downloadReport(){
  const type=$('#rep-type')?$('#rep-type').value:'weekly';const module=$('#rep-module')?$('#rep-module').value:'all';
  const txt=buildReportText(type,module);
  // Build HTML version
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>LifeOS Report</title><style>body{font-family:'Courier New',monospace;background:#050810;color:#c8d8e8;padding:40px;max-width:700px;margin:0 auto;}h1{color:#f0a500;letter-spacing:4px;}pre{white-space:pre-wrap;line-height:1.8;font-size:14px;}</style></head><body><h1>LIFEOS</h1><pre>${txt}</pre></body></html>`;
  const blob=new Blob([html],{type:'text/html'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='lifeos-report-'+today()+'.html';a.click();URL.revokeObjectURL(url);
  toast('Report downloaded!','good');
}
function copyReport(){
  const type=$('#rep-type')?$('#rep-type').value:'weekly';const module=$('#rep-module')?$('#rep-module').value:'all';
  navigator.clipboard.writeText(buildReportText(type,module)).then(()=>toast('Copied to clipboard!','good')).catch(()=>toast('Copy failed','bad'));
}


// ═══════════════════════════════════════════════════════════════
// EMAIL REPORT (via Supabase Edge Function)
// ═══════════════════════════════════════════════════════════════
async function sendReport(type){
  const btnId='btn-send-'+type;const btn=$('#'+btnId);
  const statusEl=$('#email-send-status');const origText=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent=type==='test'?'TESTING…':'SENDING…';}
  if(statusEl){statusEl.style.color='var(--amber)';statusEl.textContent=type==='test'?'🔌 Testing connection…':'📤 Sending report…';}
  try{
    const res=await fetch('https://ttedkebbdxxltclumfyr.supabase.co/functions/v1/send-report',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZWRrZWJiZHh4bHRjbHVtZnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDc2NjQsImV4cCI6MjA5MDE4MzY2NH0.GOlbwgKDw1sAJtFLga7msHhX5OikKdLunPuhZqeLYJA'},
      body:JSON.stringify({type})
    });
    let result;const rawText=await res.text();
    try{result=JSON.parse(rawText);}catch(pe){throw new Error('Edge fn non-JSON: '+rawText.slice(0,120));}
    if(!res.ok)throw new Error(result.error||result.message||'HTTP '+res.status);
    if(statusEl){statusEl.style.color='var(--green)';statusEl.textContent=type==='test'?'✅ Connection working! Test email sent.':'✓ '+type+' report sent to charanjeeth56@gmail.com';}
    toast(type==='test'?'✅ Gmail works!':'📧 '+type+' report sent!','good');
  }catch(e){
    if(statusEl){statusEl.style.color='var(--red)';statusEl.textContent='✗ '+e.message;}
    toast('Failed: '+e.message,'bad');
    console.error('sendReport:',e);
  }finally{if(btn){btn.disabled=false;btn.textContent=origText;}}
}

async function sendEmailReport(type){
  // Alias for the report page buttons — same function
  await sendReport(type);
}