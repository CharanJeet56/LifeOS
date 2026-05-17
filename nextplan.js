// ═══════════════════════════════════════════════════════════════
// NEXT MONTH PLANNER
// ═══════════════════════════════════════════════════════════════
function getNextMonthLabel(){
  const d=new Date();d.setMonth(d.getMonth()+1);
  return d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}
function getNextMonthKey(){
  const d=new Date();d.setMonth(d.getMonth()+1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}

function renderNextPlan(){
  const p=DB.nextMonthPlan;
  if(!p.month)p.month=getNextMonthKey();
  if($('#plan-month-header'))$('#plan-month-header').textContent='Plan for '+getNextMonthLabel();

  // Expenses list
  const el=$('#plan-exp-list');
  if(el){
    if(!p.expenses.length){el.innerHTML='<div class="text-dim text-xs">No planned expenses yet.</div>';}
    else{
      el.innerHTML='<table class="tbl"><thead><tr><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>'+
        p.expenses.map(e=>`<tr>
          <td>${e.desc}</td><td>${e.cat}</td>
          <td><span class="badge" style="background:var(--bg3);color:var(--text2)">${e.type}</span></td>
          <td class="text-amber font-mono">${fmt(e.amount)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="delPlanItem('exp','${e.id}')">✕</button></td>
        </tr>`).join('')+'</tbody></table>';
    }
  }

  // Income list
  const il=$('#plan-inc-list');
  if(il){
    if(!p.income.length){il.innerHTML='<div class="text-dim text-xs">No planned income yet.</div>';}
    else{
      il.innerHTML='<table class="tbl"><thead><tr><th>Source</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>'+
        p.income.map(i=>`<tr>
          <td>${i.source}</td>
          <td><span class="badge" style="background:var(--bg3);color:var(--text2)">${i.type}</span></td>
          <td class="text-green font-mono">${fmt(i.amount)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="delPlanItem('inc','${i.id}')">✕</button></td>
        </tr>`).join('')+'</tbody></table>';
    }
  }

  // Summary
  const totalInc=p.income.reduce((a,i)=>a+i.amount,0);
  const totalExp=p.expenses.reduce((a,e)=>a+e.amount,0);
  const savings=totalInc-totalExp;
  const pct=totalInc>0?Math.round(savings/totalInc*100):0;
  if($('#plan-total-inc'))$('#plan-total-inc').textContent=fmt(totalInc);
  if($('#plan-total-exp'))$('#plan-total-exp').textContent=fmt(totalExp);
  if($('#plan-savings'))$('#plan-savings').textContent=fmt(savings);
  if($('#plan-savings-pct'))$('#plan-savings-pct').textContent=pct+'%';
}

function addPlanExpense(){
  const desc=$('#plan-exp-desc')?.value.trim();
  const amount=parseFloat($('#plan-exp-amount')?.value);
  const type=$('#plan-exp-type')?.value;
  const cat=$('#plan-exp-cat')?.value;
  if(!desc||!amount){toast('Enter description and amount','bad');return;}
  DB.nextMonthPlan.expenses.push({id:uid(),desc,amount,type,cat});
  $('#plan-exp-desc').value='';$('#plan-exp-amount').value='';
  saveDB();renderNextPlan();toast('Planned expense added','good');
}

function addPlanIncome(){
  const source=$('#plan-inc-source')?.value.trim();
  const amount=parseFloat($('#plan-inc-amount')?.value);
  const type=$('#plan-inc-type')?.value;
  if(!source||!amount){toast('Enter source and amount','bad');return;}
  DB.nextMonthPlan.income.push({id:uid(),source,amount,type});
  $('#plan-inc-source').value='';$('#plan-inc-amount').value='';
  saveDB();renderNextPlan();toast('Planned income added','good');
}

function delPlanItem(kind,id){
  if(kind==='exp')DB.nextMonthPlan.expenses=DB.nextMonthPlan.expenses.filter(e=>e.id!==id);
  else DB.nextMonthPlan.income=DB.nextMonthPlan.income.filter(i=>i.id!==id);
  saveDB();renderNextPlan();
}

function applyPlanToFinance(){
  const p=DB.nextMonthPlan;
  if(!p.expenses.length&&!p.income.length){toast('Nothing in plan to apply','bad');return;}
  if(!confirm('Apply all planned items to Finance Engine for '+getNextMonthLabel()+'?\n\nThis will bulk-insert planned expenses and income with tag "planned".'))return;
  const nm=getNextMonthKey();
  const firstDay=nm+'-01';
  p.expenses.forEach(e=>{
    DB.expenses.push({id:uid(),date:firstDay,desc:e.desc,amount:e.amount,tag:'Need',cat:e.cat,note:'planned:'+e.type});
  });
  p.income.forEach(i=>{
    DB.income.push({id:uid(),date:firstDay,source:i.source,amount:i.amount,type:i.type,tag:'planned'});
  });
  // Clear plan after apply
  DB.nextMonthPlan={month:'',expenses:[],income:[]};
  saveDB();renderNextPlan();
  toast('✅ Plan applied to Finance Engine!','good');
}

function checkAndPromptPlanApply(){
  const p=DB.nextMonthPlan;
  if(!p||(!p.expenses.length&&!p.income.length))return;
  const d=new Date();
  if(d.getDate()!==1)return;
  const thisMonth=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  if(p.month&&p.month===thisMonth){
    setTimeout(()=>{
      if(confirm('📋 Your plan for '+d.toLocaleDateString('en-IN',{month:'long',year:'numeric'})+' is ready!\n\nApply planned expenses & income to Finance Engine?')){
        applyPlanToFinance();
      }
    },2000);
  }
}
