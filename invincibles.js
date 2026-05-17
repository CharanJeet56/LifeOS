// ═══════════════════════════════════════════════════════════════
// INVINCIBLES
// ═══════════════════════════════════════════════════════════════
function addDebt(){
  const label=$('#debt-label').value.trim();const total=parseFloat($('#debt-total').value);
  const emi=parseFloat($('#debt-emi').value);const paid=parseFloat($('#debt-paid').value)||0;
  if(!label||!total||!emi){toast('Fill all fields','bad');return;}
  DB.debts.push({id:uid(),label,total,emi,paid});saveDB();renderDebts();
  $('#debt-label').value='';$('#debt-total').value='';$('#debt-emi').value='';$('#debt-paid').value='0';
  toast('Invincible added: '+label,'good');
}
function renderDebts(){
  const list=$('#debt-list');list.innerHTML='';
  const conqueredList=$('#conquered-list');if(conqueredList)conqueredList.innerHTML='';
  let gt=0,gm=0,gp=0;
  const active=DB.debts.filter(d=>d.paid<d.total);
  const conquered=DB.debts.filter(d=>d.paid>=d.total);
  active.forEach(d=>{
    const rem=d.total-d.paid;const p=Math.round(d.paid/d.total*100);
    gt+=rem;gm+=d.emi;gp+=d.paid;
    const lastPaid=(d.emiLog&&d.emiLog.length)?d.emiLog[d.emiLog.length-1].date:'—';
    list.innerHTML+=`<div class="goal-item"><div class="flex justify-between items-center mb8"><div class="goal-name">${d.label}</div><button class="del-btn" onclick="delDebt('${d.id}')">✕</button></div>
      <div class="flex justify-between text-sm text-dim mb8"><span>Left: <span class="text-red text-mono">${fmt(rem)}</span></span><span>EMI: <span class="text-amber text-mono">${fmt(d.emi)}/mo</span></span></div>
      <div class="prog-wrap"><div class="prog-fill green" style="width:${p}%"></div></div>
      <div class="flex justify-between mt8 text-sm"><span class="text-dim">${p}% cleared · Last paid: ${lastPaid}</span><button class="btn btn-outline btn-sm" onclick="payDebt('${d.id}')">Log EMI</button></div>
    </div>`;
  });
  if(!active.length)list.innerHTML='<div class="text-dim text-sm" style="padding:12px 0">No active invincibles. You\'re free! 🎉</div>';
  // Conquered section
  const sec=$('#conquered-section');
  if(sec)sec.style.display=conquered.length?'block':'none';
  conquered.forEach(d=>{
    const startDate=d.emiLog&&d.emiLog.length?d.emiLog[0].date:'—';
    const endDate=d.completedDate||'—';
    let months=0;
    if(startDate!=='—'&&endDate!=='—'){
      const s=new Date(startDate),e=new Date(endDate);
      months=Math.round((e-s)/(1000*60*60*24*30));
    }
    if(conqueredList)conqueredList.innerHTML+=`<div class="goal-item" style="border-left:3px solid var(--green)">
      <div class="flex justify-between items-center mb8">
        <div class="goal-name" style="color:var(--green)">${d.label} ✓</div>
        <button class="del-btn" onclick="delDebt('${d.id}')">✕</button>
      </div>
      <div class="flex gap12 flex-wrap text-sm text-dim">
        <span>Total: <span class="text-mono text-amber">${fmt(d.total)}</span></span>
        <span>Started: <span class="text-mono">${startDate}</span></span>
        <span>Conquered: <span class="text-mono text-green">${endDate}</span></span>
        ${months?'<span>Duration: <span class="text-mono text-amber">'+months+' months</span></span>':''}
      </div>
    </div>`;
  });
  $('#inv-total').textContent=fmt(gt);$('#inv-monthly').textContent=fmt(gm);
  $('#inv-months').textContent=gm?Math.ceil(gt/gm)+' mo':'—';$('#inv-paid').textContent=fmt(gp);
}
function delDebt(id){DB.debts=DB.debts.filter(d=>d.id!==id);saveDB();renderDebts();}
function payDebt(id){
  const d=DB.debts.find(x=>x.id===id);if(!d)return;
  const amt=parseFloat(prompt('Payment amount (₹)?'));if(!amt||amt<=0)return;
  d.paid=Math.min(d.total,d.paid+amt);
  if(!d.emiLog)d.emiLog=[];
  d.emiLog.push({date:today(),amount:amt});
  if(d.paid>=d.total){d.completedDate=today();toast('🎉 '+d.label+' CONQUERED! Freedom!','good');}
  else toast('EMI logged: '+fmt(amt),'good');
  saveDB();renderDebts();renderDashboard();
}
function calcPlanner(){
  const extra=parseFloat($('#planner-extra').value)||0;
  const rem=DB.debts.reduce((a,d)=>a+(d.total-d.paid),0);const m=DB.debts.reduce((a,d)=>a+d.emi,0);
  if(!rem||!m){$('#planner-result').textContent='No active invincibles.';return;}
  const mo=Math.ceil(rem/(m+extra));
  $('#planner-result').innerHTML=`<div class="insight good">💡 Paying <strong>${fmt(extra)}</strong> extra/month → Freedom in <strong class="text-amber">${mo} months</strong>!</div>`;
}
