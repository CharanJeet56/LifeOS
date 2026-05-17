// ═══════════════════════════════════════════════════════════════
// GOALS & FAMILY
// ═══════════════════════════════════════════════════════════════
function addGoal(){
  const name=$('#goal-name').value.trim();const target=parseFloat($('#goal-target').value);
  const saved=parseFloat($('#goal-saved').value)||0;const date=$('#goal-date').value;
  if(!name||!target){toast('Enter goal name and target','bad');return;}
  DB.goals.push({id:uid(),name,target,saved,date});saveDB();renderGoals();
  $('#goal-name').value='';$('#goal-target').value='';$('#goal-saved').value='0';toast('Goal added: '+name,'good');
}
function renderGoals(){
  const list=$('#goals-list');list.innerHTML='';
  DB.goals.forEach(g=>{
    const pct=g.target?Math.round(g.saved/g.target*100):0;const rem=g.target-g.saved;
    const dl=g.date?Math.ceil((new Date(g.date)-new Date())/(1000*60*60*24)):null;
    list.innerHTML+=`<div class="goal-item"><div class="flex justify-between items-center"><div class="goal-name">${g.name}</div><div class="flex gap8"><button class="btn btn-outline btn-sm" onclick="addGoalSavings('${g.id}')">+ Save</button><button class="del-btn" onclick="delGoal('${g.id}')">✕</button></div></div>
      <div class="flex justify-between text-sm mt8" style="flex-wrap:wrap;gap:8px"><span class="text-dim">Target: <span class="text-amber text-mono">${fmt(g.target)}</span></span><span class="text-dim">Saved: <span class="text-green text-mono">${fmt(g.saved)}</span></span><span class="text-dim">Left: <span class="text-red text-mono">${fmt(rem)}</span></span>${dl!==null?`<span class="text-dim">${dl>0?dl+'d left':'🎯 Overdue!'}</span>`:''}</div>
      <div class="prog-wrap mt8"><div class="prog-fill ${pct>=100?'green':''}" style="width:${Math.min(100,pct)}%"></div></div>
      <div class="text-dim text-sm mt8">${pct}% funded</div>
    </div>`;
  });
}
function addGoalSavings(id){
  const g=DB.goals.find(x=>x.id===id);if(!g)return;
  const amt=parseFloat(prompt('Add savings (₹)?'));if(!amt||amt<=0)return;
  g.saved=Math.min(g.target,g.saved+amt);
  if(g.saved>=g.target)toast('🎉 Goal achieved: '+g.name+'!','good');else toast(fmt(amt)+' added to '+g.name,'good');
  saveDB();renderGoals();
}
function delGoal(id){DB.goals=DB.goals.filter(g=>g.id!==id);saveDB();renderGoals();}
function addFamilySupport(){
  const name=$('#fam-name').value.trim();const amount=parseFloat($('#fam-amount').value);
  if(!name||!amount){toast('Enter name and amount','bad');return;}
  DB.familySupport.push({id:uid(),name,amount,lastPaid:null});saveDB();renderFamily();
  $('#fam-name').value='';$('#fam-amount').value='';
}
function renderFamily(){
  const tb=$('#family-tbody');tb.innerHTML='';
  DB.familySupport.forEach(f=>{tb.innerHTML+=`<tr><td>${f.name}</td><td class="text-mono">${fmt(f.amount)}/mo</td><td class="text-dim" style="font-size:11px">${f.lastPaid||'Never'}</td><td><button class="btn btn-outline btn-xs" onclick="markFamilyPaid('${f.id}')">Paid</button><button class="del-btn" onclick="delFamily('${f.id}')">✕</button></td></tr>`;});
}
function markFamilyPaid(id){const f=DB.familySupport.find(x=>x.id===id);if(f){f.lastPaid=today();saveDB();renderFamily();toast('Marked paid: '+f.name,'good');}}
function delFamily(id){DB.familySupport=DB.familySupport.filter(f=>f.id!==id);saveDB();renderFamily();}
