// ═══════════════════════════════════════════════════════════════
// INCOME & TEACHING
// ═══════════════════════════════════════════════════════════════
function setSideGoal(){const v=parseInt($('#inc-goal-input').value);if(!v){toast('Enter valid goal','bad');return;}DB.settings.sideGoal=v;saveDB();renderIncome();toast('Goal set: '+fmt(v),'good');}
function addIncome(){
  const amount=parseFloat($('#inc-amount').value);if(!amount||amount<=0){toast('Enter valid amount','bad');return;}
  DB.income.push({id:uid(),date:today(),type:$('#inc-type').value,amount,note:$('#inc-note').value.trim()});
  saveDB();renderIncome();$('#inc-amount').value='';$('#inc-note').value='';toast('Income logged: '+fmt(amount),'good');
}
function renderIncome(){
  const now_=new Date();const mPfx_=now_.getFullYear()+'-'+String(now_.getMonth()+1).padStart(2,'0');
  const mi=DB.income.filter(i=>i.date&&i.date.startsWith(mPfx_));
  const total=mi.reduce((a,i)=>a+i.amount,0);
  const salary=mi.filter(i=>i.type==='salary').reduce((a,i)=>a+i.amount,0);
  const side=mi.filter(i=>i.type!=='salary').reduce((a,i)=>a+i.amount,0);
  const goal=DB.settings.sideGoal||10000;const pct=Math.min(100,Math.round(side/goal*100));
  $('#inc-total').textContent=fmt(total);$('#inc-salary').textContent=fmt(salary);$('#inc-side').textContent=fmt(side);
  $('#inc-goal-val').textContent=fmt(goal)+'/mo';$('#inc-goal-bar').style.width=pct+'%';
  const tb=$('#inc-tbody');tb.innerHTML='';
  [...DB.income].reverse().slice(0,30).forEach(i=>{tb.innerHTML+=`<tr><td class="text-dim" style="font-size:11px">${i.date}</td><td><span class="badge badge-${i.type==='salary'?'need':'inv'}" style="font-size:9px">${i.type}</span></td><td style="font-size:12px">${i.note||'—'}</td><td class="text-green text-mono">${fmt(i.amount)}</td><td><button class="del-btn" onclick="delIncome('${i.id}')">✕</button></td></tr>`;});
  renderFinanceSummary();
}
function delIncome(id){DB.income=DB.income.filter(i=>i.id!==id);saveDB();renderIncome();}
function addSplit(){
  const person=$('#split-person').value.trim();const amount=parseFloat($('#split-amount').value);const reason=$('#split-reason').value.trim();
  if(!person||!amount){toast('Enter person and amount','bad');return;}
  DB.splits.push({id:uid(),person,amount,reason,date:today(),received:false});
  saveDB();renderSplits();$('#split-person').value='';$('#split-amount').value='';$('#split-reason').value='';toast('Split added: '+person+' owes '+fmt(amount),'good');
}
function renderSplits(){
  const tb=$('#splits-tbody');if(!tb)return;tb.innerHTML='';
  const outstanding=DB.splits.filter(s=>!s.received).reduce((a,s)=>a+s.amount,0);
  const tot=$('#splits-total');if(tot)tot.textContent=fmt(outstanding);
  [...DB.splits].reverse().forEach(s=>{
    tb.innerHTML+=`<tr style="${s.received?'opacity:.5':''}">
      <td><strong style="font-size:12px">${s.person}</strong></td>
      <td class="text-mono ${s.received?'text-green':'text-amber'}">${fmt(s.amount)}</td>
      <td style="font-size:12px">${s.reason||'—'}</td>
      <td class="text-dim" style="font-size:11px">${s.date}</td>
      <td>${s.received?'<span class="badge badge-done" style="font-size:9px">Received</span>':`<button class="btn btn-green btn-xs" onclick="markSplitReceived('${s.id}')">Mark Received</button>`}</td>
      <td><button class="del-btn" onclick="delSplit('${s.id}')">✕</button></td></tr>`;
  });
}
function markSplitReceived(id){
  const s=DB.splits.find(x=>x.id===id);if(!s)return;
  s.received=true;s.receivedDate=today();
  DB.income.push({id:uid(),date:today(),type:'split',amount:s.amount,note:'Received from '+s.person+': '+s.reason});
  saveDB();renderSplits();renderIncome();toast('💰 Received '+fmt(s.amount)+' from '+s.person,'good');
}
function delSplit(id){DB.splits=DB.splits.filter(s=>s.id!==id);saveDB();renderSplits();}
let pendingLessons=[];
function addLesson(){const l=$('#course-lesson').value.trim();if(!l)return;pendingLessons.push(l);$('#course-lesson').value='';toast('Lesson queued: '+l,'info');}
function createCourse(){
  const name=$('#course-name').value.trim();if(!name){toast('Enter course name','bad');return;}
  DB.courses.push({id:uid(),name,lessons:pendingLessons.slice(),date:today()});
  saveDB();pendingLessons=[];$('#course-name').value='';renderCourses();toast('Course created: '+name,'good');
}
function renderCourses(){
  const list=$('#courses-list');list.innerHTML='';
  DB.courses.forEach(c=>{list.innerHTML+=`<div style="padding:7px;background:var(--bg3);border:1px solid var(--border);margin-bottom:5px"><div class="flex justify-between"><strong style="font-size:12px">${c.name}</strong><button class="del-btn" onclick="delCourse('${c.id}')">✕</button></div><div class="text-dim text-xs">${c.lessons.length} lessons</div></div>`;});
}
function delCourse(id){DB.courses=DB.courses.filter(c=>c.id!==id);saveDB();renderCourses();}
function addStudent(){
  const name=$('#student-name').value.trim();const batch=$('#student-batch').value.trim();const fee=parseFloat($('#student-fee').value)||0;
  if(!name){toast('Enter student name','bad');return;}
  DB.students.push({id:uid(),name,batch,fee,paid:false,date:today()});saveDB();renderStudents();
  $('#student-name').value='';$('#student-batch').value='';$('#student-fee').value='';
}
function renderStudents(){
  const tb=$('#students-tbody');tb.innerHTML='';
  DB.students.forEach(s=>{tb.innerHTML+=`<tr><td>${s.name}</td><td class="text-dim">${s.batch||'—'}</td><td class="text-mono">${fmt(s.fee)}</td><td><div class="habit-check ${s.paid?'done':''}" onclick="toggleStudentPaid('${s.id}')" style="cursor:pointer">${s.paid?'✓':''}</div></td><td><button class="del-btn" onclick="delStudent('${s.id}')">✕</button></td></tr>`;});
}
function toggleStudentPaid(id){const s=DB.students.find(x=>x.id===id);if(s){s.paid=!s.paid;saveDB();renderStudents();}}
function delStudent(id){DB.students=DB.students.filter(s=>s.id!==id);saveDB();renderStudents();}
