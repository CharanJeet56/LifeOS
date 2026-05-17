// ═══════════════════════════════════════════════════════════════
// SYSTEM CONTROL
// ═══════════════════════════════════════════════════════════════
function initSettingsListeners(){
  document.getElementById('reset-timerange').addEventListener('change',function(){
    document.getElementById('reset-custom-dates').style.display=this.value==='custom'?'grid':'none';
  });
}

function filterByTimeRange(arr,range,dateField='date'){
  if(range==='all')return[];// return empty = delete all
  const now=new Date();
  let since=new Date();
  if(range==='today')since=new Date(today());
  else if(range==='7d')since.setDate(now.getDate()-7);
  else if(range==='30d')since.setDate(now.getDate()-30);
  else if(range==='custom'){
    const from=$('#reset-from').value;const to=$('#reset-to').value;
    return arr.filter(x=>{const d=new Date(x[dateField]||x);return d>=new Date(from)&&d<=new Date(to);});
  }
  return arr.filter(x=>new Date(x[dateField]||x)>=since);
}

function resetModule(){
  const mod=$('#reset-module').value;const range=$('#reset-timerange').value;
  if(!confirm('Reset '+mod+'? ('+range+')\nThis cannot be undone.'))return;
  if(!DB[mod]&&mod!=='corpAttendance'){toast('Unknown module: '+mod,'bad');return;}
  if(range==='all'){
    if(mod==='corpAttendance')DB.corpAttendance={};else DB[mod]=[];
  } else {
    if(mod==='corpAttendance'){
      // Filter attendance by date
      const since=range==='today'?today():null;
      if(since){delete DB.corpAttendance[since];}else{
        const now=new Date();let cutoff=new Date();
        if(range==='7d')cutoff.setDate(now.getDate()-7);if(range==='30d')cutoff.setDate(now.getDate()-30);
        Object.keys(DB.corpAttendance).forEach(d=>{if(new Date(d)>=cutoff)delete DB.corpAttendance[d];});
      }
    } else {
      const toDelete=filterByTimeRange(DB[mod],range);
      const ids=new Set(toDelete.map(x=>x.id));
      DB[mod]=DB[mod].filter(x=>!ids.has(x.id));
    }
  }
  saveDB();toast('Module reset: '+mod,'good');renderDashboard();
}

function saveAutoReset(){
  DB.settings.autoReset={daily:$('#autoreset-daily').value,weekly:$('#autoreset-weekly').value};
  saveDB();$('#autoreset-status').textContent='✓ Auto-reset schedule saved.';toast('Schedule saved','good');
}

function checkAutoReset(){
  const ar=DB.settings.autoReset||{};const t=today();const lastCheck=localStorage.getItem('lifeos_last_reset');
  if(lastCheck===t)return;localStorage.setItem('lifeos_last_reset',t);
  // Daily
  if(ar.daily==='timeBlocks')DB.timeBlocks=DB.timeBlocks.filter(b=>b.date===t);
  if(ar.daily==='tasks-done')DB.tasks=DB.tasks.filter(tk=>!tk.done);
  // Weekly
  const lastWeekCheck=localStorage.getItem('lifeos_last_week_reset');const weekNum=getWeekNum();
  if(lastWeekCheck!==String(weekNum)){localStorage.setItem('lifeos_last_week_reset',weekNum);if(ar.weekly==='wastedLog')DB.wastedLog=[];if(ar.weekly==='studyLog')DB.studyLog=[];}
  saveDB();
}
function getWeekNum(){const d=new Date();const jan1=new Date(d.getFullYear(),0,1);return Math.ceil((((d-jan1)/86400000)+jan1.getDay()+1)/7);}

function resetAll(){
  const confirm_text=$('#reset-confirm-text').value.trim();
  if(confirm_text!=='RESET LIFEOS'){toast('Type "RESET LIFEOS" to confirm','bad');return;}
  if(!confirm('⚠️ This will delete ALL your LifeOS data. Are you absolutely sure?'))return;
  initDB({});saveDB();location.reload();
}

function exportData(){
  const json=JSON.stringify(DB,null,2);
  const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='lifeos-backup-'+today()+'.json';a.click();URL.revokeObjectURL(url);
  toast('Backup exported!','good');
}
function importData(){document.getElementById('import-file').click();}
function handleImport(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{const data=JSON.parse(ev.target.result);initDB(data);saveDB();toast('Backup imported! Reloading...','good');setTimeout(()=>location.reload(),1500);}
    catch(err){toast('Invalid backup file','bad');}
  };reader.readAsText(file);
}