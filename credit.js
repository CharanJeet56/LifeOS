// ═══════════════════════════════════════════════════════════════
// CREDIT + INVEST
// ═══════════════════════════════════════════════════════════════
function updateCibil(){
  const sc=parseInt($('#cibil-input').value);if(!sc||sc<300||sc>900){toast('Enter valid score (300-900)','bad');return;}
  DB.cibilHistory.push({date:today(),score:sc});DB.settings.cibil=sc;
  saveDB();renderCibilHistory();updateCibilDisplay();toast('CIBIL score updated','good');
}
function updateCibilDisplay(){
  const sc=DB.settings.cibil||0;if(!sc)return;
  const p=Math.round((sc-300)/600*100);$('#cibil-score-val').textContent=sc;$('#cibil-bar').style.width=p+'%';
  $('#cibil-bar').style.background=sc>=750?'var(--green)':sc>=650?'var(--amber)':'var(--red)';
  const g=sc>=800?'Excellent 🟢':sc>=750?'Very Good 🟢':sc>=700?'Good 🟡':sc>=650?'Fair 🟡':'Poor 🔴';
  $('#cibil-grade').textContent=g;
  const pred=sc<650?'⚠️ Needs urgent attention. Pay all EMIs on time.':sc<750?'📈 Fair zone. Pay dues on time every month. 750+ in 4-6 months.':'✅ Strong score. Maintain by not missing payments.';
  $('#cibil-prediction').textContent=pred;
}
function renderCibilHistory(){
  updateCibilDisplay();const tb=$('#cibil-history-tbody');tb.innerHTML='';
  [...DB.cibilHistory].reverse().slice(0,8).forEach(h=>{tb.innerHTML+=`<tr><td class="text-dim" style="font-size:11px">${h.date}</td><td class="text-amber text-mono">${h.score}</td></tr>`;});
  renderCibilChart();renderInvPortfolioChart();renderCreditNetWorth();
}
function renderCibilChart(){
  if(!DB.cibilHistory.length)return;
  const sorted=[...DB.cibilHistory].sort((a,b)=>a.date.localeCompare(b.date));
  const labels=sorted.map(h=>{const d=new Date(h.date);return d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'});});
  const data=sorted.map(h=>h.score);
  const colors=data.map(s=>s>=750?'rgba(46,204,113,.8)':s>=650?'rgba(240,165,0,.8)':'rgba(224,59,59,.8)');
  mkChart('chart-cibil-trend','line',{labels,datasets:[{label:'CIBIL',data,borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.1)',fill:true,tension:.4,pointRadius:5,pointBackgroundColor:colors}]},{plugins:{legend:{display:false}},scales:{y:{min:300,max:900,ticks:{color:'#3d5a73',font:{size:9}},grid:{color:'rgba(30,45,61,.8)'}},x:{ticks:{color:'#3d5a73',font:{size:9}},grid:{display:false}}}});
}
function renderInvPortfolioChart(){
  if(!DB.investments.length)return;
  const typeMap={};DB.investments.forEach(i=>{typeMap[i.type]=(typeMap[i.type]||0)+i.amount;});
  const keys=Object.keys(typeMap);
  mkChart('chart-inv-portfolio','doughnut',{labels:keys,datasets:[{data:keys.map(k=>typeMap[k]),backgroundColor:['rgba(59,130,246,.7)','rgba(46,204,113,.7)','rgba(240,165,0,.7)','rgba(168,85,247,.7)','rgba(34,211,238,.7)','rgba(224,59,59,.7)','rgba(255,165,0,.7)'],borderColor:'#0e1318',borderWidth:2}]},{plugins:{legend:{position:'bottom',labels:{color:'#7a9ab8',font:{size:9}}}}});
}
function renderCreditNetWorth(){
  const inv=DB.investments.reduce((a,i)=>a+i.amount,0);
  const debt=DB.debts.filter(d=>d.paid<d.total).reduce((a,d)=>a+(d.total-d.paid),0);
  const nw=inv-debt;
  const el=$('#credit-networth');const sub=$('#credit-networth-sub');
  if(el)el.textContent=fmt(Math.abs(nw));
  if(el)el.style.color=nw>=0?'var(--green)':'var(--red)';
  if(sub)sub.textContent=(nw>=0?'📈 Positive':'📉 Negative')+' — '+fmt(inv)+' invested − '+fmt(debt)+' debts';
}
function calcReturns(){
  const amt=parseFloat($('#ret-amount').value)||0;
  const pct=parseFloat($('#ret-pct').value)||0;
  const yrs=parseFloat($('#ret-years').value)||0;
  if(!amt||!pct||!yrs){$('#ret-result').textContent='Fill all fields.';return;}
  const future=amt*Math.pow(1+pct/100,yrs);
  const gain=future-amt;
  $('#ret-result').innerHTML=`<div class="insight good">₹${fmt(amt)} @ ${pct}%/yr × ${yrs}yr → <strong class="text-green">₹${fmt(Math.round(future))}</strong><br><span class="text-dim">Gain: +₹${fmt(Math.round(gain))}</span></div>`;
}
function addInvestment(){
  const name=$('#inv-name').value.trim();const amount=parseFloat($('#inv-amount').value);
  const date=$('#inv-date').value||today();if(!name||!amount){toast('Enter name and amount','bad');return;}
  DB.investments.push({id:uid(),type:$('#inv-type').value,name,amount,date});
  saveDB();renderInvestments();$('#inv-name').value='';$('#inv-amount').value='';toast('Investment added: '+fmt(amount),'good');
}
function renderInvestments(){
  const tb=$('#inv-tbody');tb.innerHTML='';let total=0;
  [...DB.investments].reverse().forEach(i=>{total+=i.amount;tb.innerHTML+=`<tr><td><span class="badge badge-inv" style="font-size:9px">${i.type}</span></td><td>${i.name}</td><td class="text-mono">${fmt(i.amount)}</td><td class="text-dim" style="font-size:11px">${i.date}</td><td><button class="del-btn" onclick="delInvestment('${i.id}')">✕</button></td></tr>`;});
  $('#invest-total').textContent=fmt(total);
}
function delInvestment(id){DB.investments=DB.investments.filter(i=>i.id!==id);saveDB();renderInvestments();}
