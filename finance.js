// ═══════════════════════════════════════════════════════════════
// FINANCE
// ═══════════════════════════════════════════════════════════════
function setBalance(){
  const v=parseFloat($('#balance-input').value);if(isNaN(v)){toast('Enter valid balance','bad');return;}
  DB.settings.balance=v;saveDB();$('#fin-balance').textContent=fmt(v);toast('Balance updated','good');
}
function setBudget(){
  const v=parseInt($('#budget-input').value);if(!v||v<0){toast('Enter valid budget','bad');return;}
  DB.settings.budget=v;saveDB();$('#current-budget').textContent=fmt(v);toast('Monthly budget set: '+fmt(v),'good');
}
function setDailyBudget(){
  const v=parseInt($('#daily-budget-input').value);if(!v||v<0){toast('Enter valid daily budget','bad');return;}
  DB.settings.dailyBudget=v;saveDB();$('#current-daily-budget').textContent=fmt(v);toast('Daily budget set: '+fmt(v),'good');
}
function getDailyBudget(){
  if(DB.settings.dailyBudget>0)return DB.settings.dailyBudget;
  const budget=DB.settings.budget||0;
  if(!budget)return 0;
  const now_=new Date();return Math.round(budget/new Date(now_.getFullYear(),now_.getMonth()+1,0).getDate());
}
function toggleExpOther(){
  const v=$('#exp-cat').value;$('#exp-other-wrap').style.display=v==='Other'?'block':'none';
}
function addExpense(){
  const amount=parseFloat($('#exp-amount').value);
  if(!amount||amount<=0){toast('Enter a valid amount','bad');return;}
  const tag=$('#exp-tag').value;
  const desc=$('#exp-desc').value.trim();
  let cat=$('#exp-cat').value;
  if(cat==='Other'){cat=$('#exp-cat-other').value.trim()||'Other';}
  const expDateVal=document.getElementById('exp-date-picker')?.value||today();
  DB.expenses.push({id:uid(),date:expDateVal,amount,tag,desc,cat});
  if(DB.settings.balance>0)DB.settings.balance=Math.max(0,DB.settings.balance-amount);
  saveDB();
  $('#exp-amount').value='';$('#exp-desc').value='';
  const _dp=document.getElementById('exp-date-picker');if(_dp)_dp.value=today();
  renderExpenses();renderDashboard();
  if(tag==='Waste')toast('😑 Waste logged — Balance: '+fmt(DB.settings.balance),'bad');
  else toast('✓ Expense added: '+fmt(amount)+' — Balance: '+fmt(DB.settings.balance),'good');
}

function dashQuickExpense(){
  const amount=parseFloat($('#d-qexp-amount').value);
  const desc=$('#d-qexp-desc').value.trim();
  const date=$('#d-qexp-date').value||today();
  const tag=$('#d-qexp-tag').value;
  const cat=$('#d-qexp-cat').value;
  if(!amount||amount<=0){toast('Enter amount','bad');return;}
  DB.expenses.push({id:uid(),date,amount,tag,desc:desc||'Quick expense',cat});
  if(DB.settings.balance>0)DB.settings.balance=Math.max(0,DB.settings.balance-amount);
  saveDB();
  $('#d-qexp-amount').value='';$('#d-qexp-desc').value='';$('#d-qexp-date').value=today();
  renderDashboard();
  // Show last 3 in the recent strip
  const recent=DB.expenses.slice(-3).reverse();
  $('#d-qexp-recent').textContent='Recent: '+recent.map(e=>e.desc+' '+fmt(e.amount)).join(' · ');
  if(tag==='Waste')toast('😑 Waste: '+fmt(amount),'bad');
  else toast('✓ Logged '+fmt(amount)+' on '+date,'good');
}
function renderExpenses(){
  const tf=$('#exp-filter-tag').value;const cf=$('#exp-filter-cat').value;
  let ex=[...DB.expenses].reverse();
  if(tf)ex=ex.filter(e=>e.tag===tf);if(cf)ex=ex.filter(e=>e.cat===cf);
  const tb=$('#exp-tbody');tb.innerHTML='';
  ex.slice(0,60).forEach(e=>{
    tb.innerHTML+=`<tr>
      <td class="text-dim" style="font-size:11px">${e.date}</td>
      <td>${e.desc||'—'}</td>
      <td class="text-dim" style="font-size:11px">${e.cat}</td>
      <td><span class="badge badge-${e.tag==='Need'?'need':e.tag==='Waste'?'waste':'inv'}">${e.tag}</span></td>
      <td class="text-mono">${fmt(e.amount)}</td>
      <td><button class="del-btn" onclick="delExpense('${e.id}')">✕</button></td>
    </tr>`;
  });
  renderFinanceSummary();
}
function delExpense(id){
  const exp=DB.expenses.find(e=>e.id===id);
  if(exp&&DB.settings.balance>=0){DB.settings.balance=DB.settings.balance+exp.amount;}
  DB.expenses=DB.expenses.filter(e=>e.id!==id);saveDB();renderExpenses();toast('Expense removed, balance restored','info');
}
function renderFinanceSummary(){
  const now_=new Date();const m=now_.getMonth();const y=now_.getFullYear();
  const mPfx_=y+'-'+String(m+1).padStart(2,'0');
  const me=DB.expenses.filter(e=>e.date&&e.date.startsWith(mPfx_));
  const total=me.reduce((a,e)=>a+e.amount,0);const waste=me.filter(e=>e.tag==='Waste').reduce((a,e)=>a+e.amount,0);
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx_)).reduce((a,i)=>a+i.amount,0);
  $('#fin-income').textContent=fmt(mi);$('#fin-spent').textContent=fmt(total);
  const wp=total?Math.round(waste/total*100):0;
  $('#fin-waste-pct2').textContent=wp+'%';$('#fin-waste-amt').textContent=fmt(waste)+' wasted';
  $('#fin-balance').textContent=fmt(DB.settings.balance||0);
  const budget=DB.settings.budget||0;
  $('#current-budget').textContent=fmt(budget);
  const dailyBudget=getDailyBudget();
  if($('#current-daily-budget'))$('#current-daily-budget').textContent=fmt(dailyBudget);
  if($('#daily-budget-input')&&DB.settings.dailyBudget>0&&!$('#daily-budget-input').value)$('#daily-budget-input').value=DB.settings.dailyBudget;
  // Budget progress bars
  const todaySpend=DB.expenses.filter(e=>e.date===today()).reduce((a,e)=>a+e.amount,0);
  const todayPct=dailyBudget?Math.min(100,Math.round(todaySpend/dailyBudget*100)):0;
  const monthPct=budget?Math.min(100,Math.round(total/budget*100)):0;
  const todayBar=$('#budget-today-bar');const monthBar=$('#budget-month-bar');
  if(todayBar){todayBar.style.width=todayPct+'%';todayBar.style.background=todayPct>100?'var(--red)':todayPct>80?'var(--amber)':'var(--green)';}
  if(monthBar){monthBar.style.width=monthPct+'%';monthBar.style.background=monthPct>100?'var(--red)':monthPct>80?'var(--amber)':'var(--green)';}
  const todayLabel=$('#budget-today-label');const monthLabel=$('#budget-month-label');
  if(todayLabel)todayLabel.textContent=fmt(todaySpend)+' / '+fmt(dailyBudget)+' daily';
  if(monthLabel)monthLabel.textContent=fmt(total)+' / '+fmt(budget);
  // Category breakdown
  const cats={};me.forEach(e=>{cats[e.cat]=(cats[e.cat]||0)+e.amount;});
  const bd=$('#spend-breakdown');bd.innerHTML='';
  Object.entries(cats).sort((a,b)=>b[1]-a[1]).forEach(([cat,amt])=>{
    const p=total?Math.round(amt/total*100):0;
    bd.innerHTML+=`<div style="margin-bottom:7px"><div class="flex justify-between text-sm" style="margin-bottom:3px"><span>${cat}</span><span class="text-mono">${fmt(amt)} <span class="text-dim">(${p}%)</span></span></div><div class="prog-wrap" style="height:3px;margin:0"><div class="prog-fill" style="width:${p}%"></div></div></div>`;
  });
  // Week chart
  const wc=$('#week-chart');wc.innerHTML='';
  const d7=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d7.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'));}
  const mx=Math.max(...d7.map(d=>DB.expenses.filter(e=>e.date===d).reduce((a,e)=>a+e.amount,0)),1);
  d7.forEach(d=>{
    const ds=DB.expenses.filter(e=>e.date===d).reduce((a,e)=>a+e.amount,0);
    const p=Math.round(ds/mx*100);const lbl=new Date(d).toLocaleDateString('en-IN',{weekday:'short'});
    wc.innerHTML+=`<div class="bar-col"><div class="bar spend" style="height:${p}px"></div><div class="blabel">${lbl}</div></div>`;
  });
}
