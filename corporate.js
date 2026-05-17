// ═══════════════════════════════════════════════════════════════
// CORPORATE
// ═══════════════════════════════════════════════════════════════
let calYear=new Date().getFullYear();let calMonth=new Date().getMonth();

function corpMarkToday(){
  const type=$('#corp-day-type').value;
  const h=parseInt($('#corp-day-hrs').value)||0;
  const min=parseInt($('#corp-day-mins').value)||0;
  const totalMins=h*60+min;
  DB.corpAttendance[today()]={type,mins:totalMins};
  saveDB();renderCorpCalendar();renderCorpStats();renderCorpTimeline();
  if(typeof renderHealthScore==='function')renderHealthScore();
  toast('Attendance marked: '+type.toUpperCase()+(totalMins?' — '+h+'h '+min+'m':''),'good');
}
function toggleOthersField(){
  const v=$('#corp-assigned-by').value;
  $('#others-field-wrap').style.display=v==='others'?'block':'none';
}
function corpCalcHours(){
  const li=$('#corp-login-time').value;const lo=$('#corp-logout-time').value;
  if(!li||!lo){toast('Enter login and logout times','bad');return;}
  const[lh,lm]=li.split(':').map(Number);const[oh,om]=lo.split(':').map(Number);
  const tot=(oh*60+om)-(lh*60+lm);const h=Math.floor(tot/60);const mins=tot%60;
  $('#corp-hours').textContent=h+'h '+mins+'m';
}
function corpAddLog(){
  const text=$('#corp-log-text').value.trim();if(!text){toast('Enter what you did today','bad');return;}
  let by=$('#corp-assigned-by').value;
  if(by==='others'){by=$('#corp-others-name').value.trim()||'Others';}
  DB.corpLogs.push({id:uid(),date:today(),text,by,priority:$('#corp-priority').value,status:$('#corp-status').value});
  saveDB();$('#corp-log-text').value='';renderCorpLogs();renderCorpStats();toast('Work logged!','good');
}
function cycleLogStatus(id){
  const l=DB.corpLogs.find(x=>x.id===id);if(!l)return;
  const cycle=['pending','in-progress','completed','not-completed'];
  const idx=cycle.indexOf(l.status||'pending');
  l.status=cycle[(idx+1)%cycle.length];
  saveDB();renderCorpLogs();
  toast('Status → '+l.status,'good');
}
function renderCorpTimeline(){
  const tl=document.getElementById('corp-hours-timeline');
  const summary=document.getElementById('corp-month-summary');
  if(!tl)return;
  const now=new Date(); const m=now.getMonth(); const y=now.getFullYear();
  const daysInMonth=new Date(y,m+1,0).getDate();

  let totalWfoHrs=0,wfoDays=0,wfhDays=0,leaveDays=0,maxHrs=0;

  // Gather data
  const days=[];
  for(let d=1;d<=daysInMonth;d++){
    const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const att=DB.corpAttendance[ds];
    const tp=att?(att.type||att):'';
    const rawMins=att?(att.mins!=null?att.mins:(att.hrs||0)*60):0;
    const hrs=rawMins/60;
    if(tp==='wfo'){totalWfoHrs+=hrs;wfoDays++;if(hrs>maxHrs)maxHrs=hrs;}
    if(tp==='wfh')wfhDays++;
    if(tp==='leave'||tp==='holiday')leaveDays++;
    days.push({d,ds,tp,hrs,rawMins});
  }

  const maxH=Math.max(maxHrs,8);

  // Build timeline
  let html='<div style="display:flex;align-items:flex-end;gap:3px;height:80px;padding-bottom:20px;position:relative">';
  // Hour gridlines
  html+='<div style="position:absolute;top:0;left:0;right:0;bottom:20px;pointer-events:none">';
  [0,4,8].forEach(h=>{
    const pct=100-(h/maxH*100);
    html+=`<div style="position:absolute;left:0;right:0;top:${pct}%;border-top:1px dashed rgba(30,45,61,.5);"><span style="font-family:var(--mono);font-size:8px;color:var(--text3);padding-left:2px">${h}h</span></div>`;
  });
  html+='</div>';

  days.forEach(({d,tp,hrs,rawMins})=>{
    const isToday=new Date().getDate()===d&&new Date().getMonth()===m;
    let color='var(--bg4)';
    let height=4;
    if(tp==='wfo'){
      color='#2ecc71';
      height=Math.max(4,Math.round(hrs/maxH*60));
    } else if(tp==='wfh'){color='#3b82f6';height=20;}
    else if(tp==='leave'){color='#666';height=10;}
    else if(tp==='holiday'){color='#a855f7';height=10;}
    const outline=isToday?'outline:2px solid var(--amber);outline-offset:-1px':'';
    const hDisp=rawMins?Math.floor(rawMins/60)+'h '+(rawMins%60?rawMins%60+'m':''):'';
    html+=`<div style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:2px" title="${d}: ${tp||'No entry'}${hDisp?' ('+hDisp+')':''}">
      <div style="width:100%;height:${height}px;background:${color};${outline};transition:height .3s;cursor:default"></div>
      <div style="font-family:var(--mono);font-size:7px;color:${isToday?'var(--amber)':'var(--text3)'}">${d}</div>
    </div>`;
  });
  html+='</div>';
  tl.innerHTML=html;

  // Summary chips — show hrs:mins
  function minsToHM(m){const h=Math.floor(m/60);const mn=Math.round(m%60);return h+'h '+(mn?mn+'m':'');}
  const totalWfoMins=Math.round(totalWfoHrs*60);
  const avgWfoMins=wfoDays?Math.round(totalWfoMins/wfoDays):0;
  summary.innerHTML=[
    {label:'WFO Days',val:wfoDays,col:'var(--green)'},
    {label:'WFH Days',val:wfhDays,col:'var(--blue)'},
    {label:'Leave',val:leaveDays,col:'#888'},
    {label:'Total WFO Time',val:minsToHM(totalWfoMins),col:'var(--amber)'},
    {label:'Avg / WFO Day',val:minsToHM(avgWfoMins),col:'var(--cyan)'},
  ].map(c=>`<div style="background:var(--bg3);border:1px solid var(--border);padding:6px 12px;font-size:11px">
    <div style="font-family:var(--mono);font-size:9px;color:var(--text3);letter-spacing:1px">${c.label}</div>
    <div style="font-family:var(--mono);font-size:16px;color:${c.col};font-weight:bold">${c.val}</div>
  </div>`).join('');
}

function renderCorpStats(){
  const now_=new Date();const mPfx_=now_.getFullYear()+'-'+String(now_.getMonth()+1).padStart(2,'0');
  const days=Object.entries(DB.corpAttendance).filter(([d,v])=>d.startsWith(mPfx_)&&(v.type||v)==='wfo');
  $('#corp-days').textContent=days.length;
  const logs=DB.corpLogs;
  $('#corp-assigned-count').textContent=logs.length;
  $('#corp-stat-done').textContent=logs.filter(l=>l.status==='completed').length+' Done';
  $('#corp-stat-pending').textContent=logs.filter(l=>l.status==='pending').length+' Pending';
  $('#corp-stat-notdone').textContent=logs.filter(l=>l.status==='not-completed').length+' Not Done';
  renderCorpCarousel();
}

let _carouselIdx=0;let _carouselSlides=[];let _carouselTimer=null;

function renderCorpCarousel(){
  const lbl=$('#corp-carousel-label');
  const body=$('#corp-carousel-body');
  const dots=$('#corp-carousel-dots');
  if(!lbl||!body||!dots)return;

  const now=new Date();
  const cm=now.getMonth();const cy=now.getFullYear();
  const lm=cm===0?11:cm-1;const ly=cm===0?cy-1:cy;

  function attOf(y,m){
    const prefix=y+'-'+String(m+1).padStart(2,'0');
    return Object.entries(DB.corpAttendance).filter(([d])=>d.startsWith(prefix)).map(([d,v])=>({d,v}));
  }
  function countType(entries,tp){return entries.filter(({v})=>(v.type||v)===tp).length;}
  function totalMinsType(entries,tp){return entries.filter(({v})=>(v.type||v)===tp).reduce((s,{v})=>s+(v.mins!=null?v.mins:(v.hrs||0)*60),0);}

  const thisAtt=attOf(cy,cm);
  const lastAtt=attOf(ly,lm);

  const thisWfo=countType(thisAtt,'wfo');
  const thisWfh=countType(thisAtt,'wfh');
  const thisLeave=countType(thisAtt,'leave');
  const thisHoliday=countType(thisAtt,'holiday');
  const thisMins=totalMinsType(thisAtt,'wfo');
  const avgMins=thisWfo?Math.round(thisMins/thisWfo):0;

  const lastWfo=countType(lastAtt,'wfo');
  const lastWfh=countType(lastAtt,'wfh');
  const lastLeave=countType(lastAtt,'leave');
  const lastMins=totalMinsType(lastAtt,'wfo');

  // Best day this month
  let bestEntry=null;let bestMins=0;
  thisAtt.forEach(({d,v})=>{if((v.type||v)==='wfo'){const mn=v.mins!=null?v.mins:(v.hrs||0)*60;if(mn>bestMins){bestMins=mn;bestEntry=d;}}});

  // WFO streak (consecutive WFO days up to today)
  let streak=0;
  const todayD=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  for(let i=0;i<60;i++){
    const dt=new Date(todayD-i*86400000);
    const ds=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    const v=DB.corpAttendance[ds];
    if(v&&(v.type||v)==='wfo')streak++;
    else if(i>0)break;
  }

  function hm(m){const h=Math.floor(m/60);const mn=Math.round(m%60);return h+'h'+(mn?' '+mn+'m':'');}
  function chip(val,col){return `<span style="font-family:var(--mono);font-size:20px;color:${col};font-weight:700">${val}</span>`;}
  function row(label,val,col='var(--amber)'){return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;color:var(--text2)">${label}</span><span style="font-family:var(--mono);font-size:13px;color:${col};font-weight:600">${val}</span></div>`;}

  const lastMonthName=new Date(ly,lm).toLocaleDateString('en-IN',{month:'short'});
  const thisMonthName=now.toLocaleDateString('en-IN',{month:'short'});

  _carouselSlides=[
    {
      label:'THIS MONTH · '+thisMonthName,
      html:`<div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-bottom:10px">
        ${chip(thisWfo,'var(--green)')} <span style="font-size:10px;color:var(--text3)">WFO</span>
        ${chip(thisWfh,'var(--blue)')} <span style="font-size:10px;color:var(--text3)">WFH</span>
        ${chip(thisLeave,'#888')} <span style="font-size:10px;color:var(--text3)">LEAVE</span>
        ${chip(thisHoliday,'var(--purple)')} <span style="font-size:10px;color:var(--text3)">HOLS</span>
      </div>
      ${row('Office Hours',hm(thisMins),'var(--green)')}
      ${row('Avg / WFO Day',hm(avgMins),'var(--cyan)')}`
    },
    {
      label:'LAST MONTH · '+lastMonthName,
      html:`<div style="display:flex;gap:16px;align-items:center;justify-content:center;margin-bottom:10px">
        ${chip(lastWfo,'var(--green)')} <span style="font-size:10px;color:var(--text3)">WFO</span>
        ${chip(lastWfh,'var(--blue)')} <span style="font-size:10px;color:var(--text3)">WFH</span>
        ${chip(lastLeave,'#888')} <span style="font-size:10px;color:var(--text3)">LEAVE</span>
      </div>
      ${row('Office Hours',hm(lastMins),'var(--green)')}
      ${row('vs This Month',(lastWfo>thisWfo?'+':'')+(thisWfo-lastWfo)+' WFO days',thisWfo>=lastWfo?'var(--green)':'var(--red)')}`
    },
    {
      label:'BEST DAY',
      html: bestEntry
        ? `<div style="text-align:center;margin-bottom:8px"><span style="font-family:var(--mono);font-size:11px;color:var(--text3)">${bestEntry}</span></div>
           <div style="text-align:center">${chip(hm(bestMins),'var(--amber)')}</div>
           <div style="text-align:center;font-size:10px;color:var(--text3);margin-top:4px">longest office session</div>`
        : `<div style="text-align:center;color:var(--text3);font-size:12px;padding:12px 0">No WFO data yet</div>`
    },
    {
      label:'WFO STREAK',
      html:`<div style="text-align:center;margin:6px 0">${chip(streak,'var(--amber)')}<span style="font-size:11px;color:var(--text3);margin-left:6px">consecutive days</span></div>
      ${row('WFO this month',thisWfo+' days','var(--green)')}
      ${row('Weekly avg '+(thisMonthName),Math.round(thisWfo/4.3*10)/10+' days/wk','var(--cyan)')}`
    }
  ];

  function showSlide(i){
    _carouselIdx=(i+_carouselSlides.length)%_carouselSlides.length;
    lbl.textContent=_carouselSlides[_carouselIdx].label;
    body.innerHTML=_carouselSlides[_carouselIdx].html;
    dots.innerHTML=_carouselSlides.map((_,j)=>`<div style="width:6px;height:6px;border-radius:50%;background:${j===_carouselIdx?'var(--amber)':'var(--bg4)'};transition:background .3s;cursor:pointer" onclick="corpCarouselGo(${j})"></div>`).join('');
  }

  if(_carouselTimer)clearInterval(_carouselTimer);
  showSlide(_carouselIdx);
  _carouselTimer=setInterval(()=>showSlide(_carouselIdx+1),10000);
}

function corpCarouselPrev(){if(_carouselTimer)clearInterval(_carouselTimer);_carouselIdx=(_carouselIdx-1+_carouselSlides.length)%_carouselSlides.length;renderCorpCarousel();}
function corpCarouselNext(){if(_carouselTimer)clearInterval(_carouselTimer);_carouselIdx=(_carouselIdx+1)%_carouselSlides.length;renderCorpCarousel();}
function corpCarouselGo(i){if(_carouselTimer)clearInterval(_carouselTimer);_carouselIdx=i;renderCorpCarousel();}
function renderCorpLogs(){
  renderCorpStats();
  renderCorpTimeline();
  const filt=$('#corp-filter-status').value;
  const tb=$('#corp-log-tbody');tb.innerHTML='';
  let logs=[...DB.corpLogs].reverse().slice(0,50);
  if(filt)logs=logs.filter(l=>l.status===filt);
  logs.forEach(l=>{
    const sc={'completed':'badge-done','pending':'badge-pending','not-completed':'badge-notdone','in-progress':'badge-purple'}[l.status]||'badge-warn';
    const pc=l.priority==='high'?'var(--red)':l.priority==='medium'?'var(--amber)':'var(--green)';
    tb.innerHTML+=`<tr>
      <td class="text-dim" style="font-size:11px;white-space:nowrap">${l.date}</td>
      <td style="font-size:12px;max-width:180px;word-break:break-word">${l.text}</td>
      <td><span class="badge badge-warn" style="font-size:9px">${l.by}</span></td>
      <td><span class="badge ${sc}" style="font-size:9px;cursor:pointer" onclick="cycleLogStatus('${l.id}')" title="Click to change status">${l.status||'pending'} ✎</span></td>
      <td><button class="del-btn" onclick="delCorpLog('${l.id}')">✕</button></td>
    </tr>`;
  });
}
function delCorpLog(id){DB.corpLogs=DB.corpLogs.filter(l=>l.id!==id);saveDB();renderCorpLogs();}

function calPrevMonth(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCorpCalendar();}
function calNextMonth(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCorpCalendar();}

function renderCorpCalendar(){
  const lbl=$('#cal-month-label');
  lbl.textContent=new Date(calYear,calMonth).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  const cal=$('#corp-calendar');cal.innerHTML='';
  // Day headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{
    cal.innerHTML+=`<div class="cal-day-header">${d}</div>`;
  });
  const firstDay=new Date(calYear,calMonth,1).getDay();
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const todayStr=today();
  // Empty cells
  for(let i=0;i<firstDay;i++)cal.innerHTML+=`<div class="cal-day empty"></div>`;
  // Day cells
  for(let d=1;d<=daysInMonth;d++){
    const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const att=DB.corpAttendance[ds];
    let cls='';let typeLabel='';let hrsLabel='';
    if(att){
      const tp=att.type||att; // support old string format
      const hrs=att.hrs||0;
      if(tp==='wfo'){typeLabel='WFO';cls='cal-wfo-high';}
      else if(tp==='wfh'){typeLabel='WFH';cls='cal-wfh';}
      else if(tp==='leave'){typeLabel='LEAVE';cls='cal-leave';}
      else if(tp==='holiday'){typeLabel='HOLIDAY';cls='cal-holiday';}
      else{typeLabel=tp.toUpperCase();cls='cal-wfh';}// legacy
    }
    const isToday=ds===todayStr?'cal-today':'';
    cal.innerHTML+=`<div class="cal-day ${cls} ${isToday}" onclick="editCalDay('${ds}')">
      <div class="cal-num">${d}</div>
      ${typeLabel?`<div class="cal-type">${typeLabel}</div>`:''}
      ${hrsLabel?`<div class="cal-hrs">${hrsLabel}</div>`:''}
    </div>`;
  }
}
function editCalDay(ds){
  const att=DB.corpAttendance[ds]||{};
  const tp=att.type||att||'';
  const existMins=att.mins!=null?att.mins:(att.hrs||0)*60;
  const existH=Math.floor(existMins/60);const existM=existMins%60;
  openModal('Edit Attendance: '+ds,`
    <div class="form-row"><label>Type</label>
      <select id="edit-att-type">
        <option value="wfo" ${tp==='wfo'?'selected':''}>WFO</option>
        <option value="wfh" ${tp==='wfh'?'selected':''}>WFH</option>
        <option value="leave" ${tp==='leave'?'selected':''}>Leave</option>
        <option value="holiday" ${tp==='holiday'?'selected':''}>Holiday</option>
        <option value="" ${!tp?'selected':''}>Clear</option>
      </select>
    </div>
    <div class="flex gap8">
      <div class="form-row" style="flex:1"><label>Hours</label><input type="number" id="edit-att-hrs" value="${existH||''}" placeholder="0" min="0" max="12"/></div>
      <div class="form-row" style="flex:1"><label>Mins</label><input type="number" id="edit-att-mins" value="${existM||''}" placeholder="0" min="0" max="59"/></div>
    </div>
    <div class="flex gap8 mt14">
      <button class="btn btn-amber w100" onclick="saveCalDay('${ds}')">SAVE</button>
      <button class="btn btn-red btn-sm" onclick="clearCalDay('${ds}')">CLEAR</button>
    </div>
  `);
}
function saveCalDay(ds){
  const tp=$('#edit-att-type').value;
  const h=parseInt($('#edit-att-hrs').value)||0;const mn=parseInt($('#edit-att-mins').value)||0;
  if(!tp){delete DB.corpAttendance[ds];}else{DB.corpAttendance[ds]={type:tp,mins:h*60+mn};}
  saveDB();renderCorpCalendar();closeModal();
  if(typeof renderHealthScore==='function')renderHealthScore();
  toast('Attendance updated','good');
}
function clearCalDay(ds){delete DB.corpAttendance[ds];saveDB();renderCorpCalendar();closeModal();}
