// ═══════════════════════════════════════════════════════════════
// ANTI-DISTRACTION
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// ANTI-DISTRACTION — Premium Focus System
// ═══════════════════════════════════════════════════════════════

// State
let pomoInt=null, pomoRunning=false, pomoSecs=25*60, pomoTotalSecs=25*60;
let pomoRound=1, pomoModeLabel='Deep Work';
let focusSessions=[]; // today's sessions {label,mins,ts}
let focusTimerInt=null, focusElapsed=0;

// ── Pomo mode buttons ─────────────────────────────────────────
function setPomoMode(btn){
  if(pomoRunning){toast('Stop current timer first','bad');return;}
  $$('.pomo-mode-btn').forEach(b=>b.classList.remove('active','btn-amber','btn-outline'));
  btn.classList.add('active','btn-amber');
  const mins=parseInt(btn.dataset.mins);
  pomoModeLabel=btn.dataset.label;
  pomoSecs=mins*60; pomoTotalSecs=mins*60;
  $('#pomo-mode-label').textContent=pomoModeLabel.toUpperCase();
  $('#pomo-timer').textContent=String(Math.floor(pomoSecs/60)).padStart(2,'0')+':00';
}
function setCustomTimer(){
  if(pomoRunning){toast('Stop current timer first','bad');return;}
  const m=parseInt($('#custom-mins').value)||0;
  const s=parseInt($('#custom-secs').value)||0;
  const total=m*60+s;
  if(total<=0){toast('Enter valid time','bad');return;}
  pomoSecs=total; pomoTotalSecs=total;
  pomoModeLabel='Custom';
  $('#pomo-mode-label').textContent='CUSTOM TIMER';
  $('#pomo-timer').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  toast('Custom timer set: '+m+'m '+s+'s','good');
}

// ── Pomo start/pause/reset ────────────────────────────────────
function pomoStart(){
  if(pomoRunning){
    // Pause
    clearInterval(pomoInt); pomoRunning=false;
    $('#pomo-btn').innerHTML='▶ RESUME';
    $('#pomo-active-dot').style.background='var(--text3)';
    return;
  }
  pomoRunning=true;
  $('#pomo-btn').innerHTML='⏸ PAUSE';
  $('#pomo-active-dot').style.background='var(--cyan)';
  $('#pomo-active-dot').style.boxShadow='0 0 8px var(--cyan)';

  const startTs=Date.now();
  const startSecs=pomoSecs;

  pomoInt=setInterval(()=>{
    if(pomoSecs<=0){
      clearInterval(pomoInt); pomoRunning=false;
      // Log completed session
      const label=$('#pomo-task-label')?.value||pomoModeLabel;
      const mins=Math.round(pomoTotalSecs/60);
      focusSessions.push({label,mins,ts:Date.now()});
      // Save to DB
      if(!DB.settings.focusSessions) DB.settings.focusSessions={};
      const t=today();
      if(!DB.settings.focusSessions[t]) DB.settings.focusSessions[t]=[];
      DB.settings.focusSessions[t].push({label,mins,ts:Date.now()});
      // Award XP
      const xpGained=10;
      DB.focusProfile.totalXP=(DB.focusProfile.totalXP||0)+xpGained;
      DB.focusProfile.level=Math.floor(DB.focusProfile.totalXP/100)+1;
      // Update streak
      const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
      const yd=yesterday.getFullYear()+'-'+String(yesterday.getMonth()+1).padStart(2,'0')+'-'+String(yesterday.getDate()).padStart(2,'0');
      if(DB.focusProfile.lastFocusDate===t){/* same day, no change */}
      else if(DB.focusProfile.lastFocusDate===yd){DB.focusProfile.streak=(DB.focusProfile.streak||0)+1;}
      else{DB.focusProfile.streak=1;}
      DB.focusProfile.lastFocusDate=t;
      saveDB();
      $('#pomo-btn').innerHTML='▶ START';
      $('#pomo-active-dot').style.background='var(--green)';
      $('#pomo-active-dot').style.boxShadow='0 0 8px var(--green)';
      pomoRound++;$('#pomo-round').textContent=pomoRound;
      pomoSecs=pomoTotalSecs;
      updatePomoDisplay();
      renderDistStats();
      toast('✅ '+pomoModeLabel+' done! +'+xpGained+' XP','good');
      // Auto-suggest break
      if(pomoModeLabel==='Deep Work'||pomoModeLabel==='Flow State'||pomoModeLabel==='Marathon'){
        setTimeout(()=>toast('⏸ Take a break — you earned it.','info'),2000);
      }
      return;
    }
    pomoSecs--;
    updatePomoDisplay();
  },1000);
}

function updatePomoDisplay(){
  const m=String(Math.floor(pomoSecs/60)).padStart(2,'0');
  const s=String(pomoSecs%60).padStart(2,'0');
  $('#pomo-timer').textContent=m+':'+s;
  // Update focus overlay timer too
  if($('#focus-timer')) $('#focus-timer').textContent=m+':'+s;
}

function pomoReset(){
  clearInterval(pomoInt); pomoRunning=false;
  pomoSecs=pomoTotalSecs;
  updatePomoDisplay();
  $('#pomo-btn').innerHTML='▶ START';
  $('#pomo-active-dot').style.background='var(--cyan)';
  $('#pomo-active-dot').style.boxShadow='none';
}

// ── Focus overlay ─────────────────────────────────────────────
function toggleFocus(){
  const t=$('#focus-toggle');const on=t.classList.toggle('on');
  $('#focus-status').textContent=on?'ON — STAY FOCUSED':'OFF';
  toast(on?'🔕 Focus mode ON.':'Focus mode off.',on?'bad':'info');
}
function showFocusOverlay(){
  $('#focus-overlay').classList.add('open');
  updatePomoDisplay();
}
function hideFocusOverlay(){ $('#focus-overlay').classList.remove('open'); }

// ── Blocked apps ──────────────────────────────────────────────
function addBlockedApp(){
  const name=$('#block-app-name').value.trim();if(!name){toast('Enter app name','bad');return;}
  DB.blockedApps.push({id:uid(),name,start:$('#block-start').value,end:$('#block-end').value});
  saveDB();renderBlockedApps();$('#block-app-name').value='';toast(name+' added to block list 🔒','good');
}
function renderBlockedApps(){
  const list=$('#blocked-apps-list');if(!list)return;list.innerHTML='';
  DB.blockedApps.forEach(a=>{
    list.innerHTML+=`<div class="flex justify-between items-center" style="padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--red)">🚫 ${a.name}</span>
      <span class="text-mono text-dim" style="font-size:10px">${a.start||'--'}→${a.end||'--'}</span>
      <button class="del-btn" onclick="delBlockedApp('${a.id}')">✕</button>
    </div>`;
  });
}
function delBlockedApp(id){DB.blockedApps=DB.blockedApps.filter(a=>a.id!==id);saveDB();renderBlockedApps();}

// ── Screen time ───────────────────────────────────────────────
function logWasted(){
  const hrs=parseFloat($('#wasted-input').value);const app=$('#wasted-app-select').value;
  if(!hrs||hrs<=0){toast('Enter valid hours','bad');return;}
  DB.wastedLog.push({id:uid(),date:today(),hrs,app});
  saveDB();renderWastedLog();updateWastedTotal();$('#wasted-input').value='';
  toast('😞 '+hrs+'h on '+app+' logged.','bad');
}
function renderWastedLog(){
  updateWastedTotal();const tb=$('#wasted-tbody');if(!tb)return;tb.innerHTML='';
  [...DB.wastedLog].reverse().slice(0,20).forEach(w=>{
    tb.innerHTML+=`<tr><td class="text-dim" style="font-size:11px">${w.date}</td><td>${w.app}</td><td class="text-red text-mono">${w.hrs}h</td><td><button class="del-btn" onclick="delWasted('${w.id}')">✕</button></td></tr>`;
  });
}
function delWasted(id){DB.wastedLog=DB.wastedLog.filter(w=>w.id!==id);saveDB();renderWastedLog();}
function updateWastedTotal(){
  const wa=daysAgo(7);const waStr=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');
  const tot=DB.wastedLog.filter(w=>w.date&&w.date>=waStr).reduce((a,w)=>a+w.hrs,0);
  if($('#wasted-hours'))$('#wasted-hours').textContent=tot.toFixed(1)+'h';
  if($('#wasted-compare'))$('#wasted-compare').textContent=tot>15?'⚠️ Way too much!':tot>7?'Reduce further':'Good';
}
function updateScreenEarned(){
  const wa=daysAgo(7);const waStr=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');
  const sh=DB.studyLog.filter(s=>s.date&&s.date>=waStr).reduce((a,s)=>a+s.hrs,0);
  if($('#screen-earned'))$('#screen-earned').textContent=Math.floor(sh/2)*30+' min';
}

// ── Focus Quest gamification ──────────────────────────────────
const RANK_LABELS=['Novice','Apprentice','Focused','Master','Legend'];
function getFocusRank(level){return RANK_LABELS[Math.min(Math.floor((level-1)/2),RANK_LABELS.length-1)];}

function renderFocusQuest(){
  const fp=DB.focusProfile||{level:1,totalXP:0,streak:0,lastFocusDate:''};
  const level=fp.level||1;
  const totalXP=fp.totalXP||0;
  const xpInLevel=totalXP%100;
  const xpToNext=100-xpInLevel;
  const t=today();
  const todaySess=(DB.settings&&DB.settings.focusSessions&&DB.settings.focusSessions[t])||[];

  if($('#fq-level'))$('#fq-level').textContent=level;
  if($('#fq-rank'))$('#fq-rank').textContent=getFocusRank(level);
  if($('#fq-xp'))$('#fq-xp').textContent=totalXP;
  if($('#fq-xp-next'))$('#fq-xp-next').textContent=xpToNext+' to next';
  if($('#fq-streak'))$('#fq-streak').textContent=fp.streak||0;
  if($('#fq-today-sessions'))$('#fq-today-sessions').textContent=todaySess.length;
  if($('#fq-xp-bar'))$('#fq-xp-bar').style.width=xpInLevel+'%';
}

// ── Distraction stats + chart ─────────────────────────────────
function renderDistStats(){
  renderFocusQuest();
  // Today's focus sessions from DB
  const t=today();
  const todaySess=(DB.settings.focusSessions&&DB.settings.focusSessions[t])||[];
  const totalMins=todaySess.reduce((a,s)=>a+s.mins,0);
  const h=Math.floor(totalMins/60), m=totalMins%60;
  if($('#dist-focus-today'))$('#dist-focus-today').textContent=h+'h '+m+'m';
  if($('#dist-sessions-today'))$('#dist-sessions-today').textContent=todaySess.length;

  // Sessions list
  const sessEl=$('#pomo-sessions-today');
  if(sessEl){
    if(!todaySess.length){
      sessEl.innerHTML='<div class="text-dim text-xs">No sessions yet today. Start your first!</div>';
    } else {
      sessEl.innerHTML='<div class="text-dim text-xs mb8" style="letter-spacing:1px;font-family:var(--mono)">TODAY\'S SESSIONS</div>'+
        todaySess.map((s,i)=>`<div class="flex justify-between" style="font-size:11px;padding:3px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--cyan);font-family:var(--mono)">${String(i+1).padStart(2,'0')}.</span>
          <span style="flex:1;margin:0 8px;color:var(--text)">${s.label}</span>
          <span style="color:var(--amber);font-family:var(--mono)">${s.mins}m</span>
        </div>`).join('');
    }
  }

  // Focus vs Waste 7-day chart
  const d7=[]; const focusArr=[]; const wasteArr=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    d7.push(d.toLocaleDateString('en-IN',{weekday:'short'}));
    const sessions=(DB.settings.focusSessions&&DB.settings.focusSessions[ds])||[];
    focusArr.push(Math.round(sessions.reduce((a,s)=>a+s.mins,0)/60*10)/10);
    wasteArr.push(DB.wastedLog.filter(w=>w.date===ds).reduce((a,w)=>a+w.hrs,0));
  }
  if(typeof Chart!=='undefined'){
    destroyChart('chart-focus-vs-waste');
    const el=document.getElementById('chart-focus-vs-waste');
    if(el){
      activeCharts['chart-focus-vs-waste']=new Chart(el,{
        type:'bar',
        data:{labels:d7,datasets:[
          {label:'Focus (h)',data:focusArr,backgroundColor:'rgba(34,211,238,.7)',borderWidth:0},
          {label:'Wasted (h)',data:wasteArr,backgroundColor:'rgba(224,59,59,.7)',borderWidth:0},
        ]},
        options:{...CHART_DEFAULTS,scales:{x:{ticks:{color:'#3d5a73',font:{size:10}},grid:{color:'rgba(30,45,61,.5)'},stacked:false},y:{ticks:{color:'#3d5a73',font:{size:10}},grid:{color:'rgba(30,45,61,.5)'}}}},
      });
    }
  }
  updateScreenEarned();
  updateWastedTotal();
  renderBlockedApps();
  renderWastedLog();
}
