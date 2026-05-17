// ═══════════════════════════════════════════════════════════════
// TASKS & HABITS
// ═══════════════════════════════════════════════════════════════
let taskFilter='';let taskPriorityFilter='';
function filterTasks(f){taskFilter=f;renderTasks();}
function filterTaskPriority(p){taskPriorityFilter=p;renderTasks();}
function toggleDoneSection(){const w=$('#done-tasks-tbody-wrap');if(w)w.style.display=w.style.display==='none'?'':'none';}
function addTask(){
  const title=$('#task-title').value.trim();if(!title){toast('Enter task title','bad');return;}
  DB.tasks.push({id:uid(),title,cat:$('#task-cat').value,priority:$('#task-priority').value,done:false,date:today(),due:$('#task-due').value});
  saveDB();renderTasks();renderDashboard();$('#task-title').value='';toast('Task added!','good');
}
function toggleTask(id){const t=DB.tasks.find(x=>x.id===id);if(t){t.done=!t.done;if(t.done)t.doneDate=today();saveDB();renderTasks();renderDashboard();}}
function renderTasks(){
  let all=taskFilter?DB.tasks.filter(t=>t.cat===taskFilter):DB.tasks;
  if(taskPriorityFilter)all=all.filter(t=>t.priority===taskPriorityFilter);
  const active=all.filter(t=>!t.done);
  const done=all.filter(t=>t.done);
  const tb=$('#tasks-tbody');tb.innerHTML='';
  const todayStr=today();
  active.forEach(t=>{
    const pc=t.priority==='high'?'var(--red)':t.priority==='medium'?'var(--amber)':'var(--green)';
    const overdue=t.due&&t.due<todayStr;
    const dueLabel=t.due?(overdue?`<span class="badge badge-notdone" style="font-size:8px">OVERDUE</span>`:t.due):'—';
    tb.innerHTML+=`<tr><td><div class="habit-check" onclick="toggleTask('${t.id}')" style="cursor:pointer;border-color:${pc}"></div></td>
      <td style="font-size:12px"><span style="color:${pc};margin-right:5px">●</span>${t.title}</td>
      <td><span class="badge badge-warn" style="font-size:9px">${t.cat}</span></td>
      <td class="text-dim" style="font-size:11px">${dueLabel}</td>
      <td><button class="del-btn" onclick="delTask('${t.id}')">✕</button></td></tr>`;
  });
  if(!active.length)tb.innerHTML='<tr><td colspan="5" class="text-dim text-sm" style="padding:12px;text-align:center">All clear! No pending tasks.</td></tr>';
  // Completed archive
  const doneSec=$('#done-tasks-section');const doneTb=$('#done-tasks-tbody');
  if(doneSec)doneSec.style.display=done.length?'block':'none';
  if(doneTb){doneTb.innerHTML='';
    [...done].sort((a,b)=>(b.doneDate||'').localeCompare(a.doneDate||'')).slice(0,30).forEach(t=>{
      doneTb.innerHTML+=`<tr style="opacity:.6"><td class="text-dim" style="font-size:11px">${t.doneDate||t.date||'—'}</td>
        <td style="font-size:12px;text-decoration:line-through">${t.title}</td>
        <td><span class="badge badge-warn" style="font-size:9px">${t.cat}</span></td>
        <td><button class="del-btn" onclick="delTask('${t.id}')">✕</button></td></tr>`;
    });
  }
}
function delTask(id){DB.tasks=DB.tasks.filter(t=>t.id!==id);saveDB();renderTasks();renderDashboard();}
function addTimeBlock(){
  const start=$('#tb-start').value;const end=$('#tb-end').value;const label=$('#tb-label').value.trim();
  if(!start||!end||!label){toast('Fill all fields','bad');return;}
  DB.timeBlocks.push({id:uid(),date:today(),start,end,label});
  saveDB();renderTimeBlocks();$('#tb-label').value='';
}
function renderTimeBlocks(){
  const list=$('#time-blocks-list');list.innerHTML='';
  DB.timeBlocks.filter(b=>b.date===today()).sort((a,b)=>a.start.localeCompare(b.start)).forEach(b=>{
    list.innerHTML+=`<div class="flex justify-between items-center" style="padding:5px 0;border-bottom:1px solid var(--border)"><span class="text-mono text-amber" style="font-size:11px">${b.start}→${b.end}</span><span style="font-size:12px">${b.label}</span><button class="del-btn" onclick="delTimeBlock('${b.id}')">✕</button></div>`;
  });
}
function delTimeBlock(id){DB.timeBlocks=DB.timeBlocks.filter(b=>b.id!==id);saveDB();renderTimeBlocks();}
function addHabit(){
  const name=$('#habit-name-input').value.trim();if(!name){toast('Enter habit name','bad');return;}
  DB.habits.push({id:uid(),name,log:[]});saveDB();renderHabits();$('#habit-name-input').value='';toast('Habit added: '+name,'good');
}
function toggleHabitToday(id){
  const h=DB.habits.find(x=>x.id===id);if(!h)return;const t=today();
  if(h.log.includes(t))h.log=h.log.filter(d=>d!==t);else h.log.push(t);
  saveDB();renderHabits();renderDashboard();
}
function renderHabits(){
  const list=$('#habits-list');list.innerHTML='';const t=today();
  DB.habits.forEach(h=>{
    const done=h.log&&h.log.includes(t);const streak=calcStreak(h.log);
    list.innerHTML+=`<div class="habit-row"><div class="flex items-center gap8"><div class="habit-check ${done?'done':''}" onclick="toggleHabitToday('${h.id}')">${done?'✓':''}</div><span style="font-size:12px">${h.name}</span></div><div class="flex items-center gap8"><span class="text-mono text-amber text-sm">🔥${streak}</span><button class="del-btn" onclick="delHabit('${h.id}')">✕</button></div></div>`;
  });
}
function delHabit(id){DB.habits=DB.habits.filter(h=>h.id!==id);saveDB();renderHabits();}
function calcStreak(log){
  if(!log||!log.length)return 0;let streak=0;let d=new Date();
  for(let i=0;i<30;i++){const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(log.includes(ds))streak++;else if(i>0)break;d.setDate(d.getDate()-1);}
  return streak;
}
