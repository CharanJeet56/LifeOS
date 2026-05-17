// ═══════════════════════════════════════════════════════════════
// SUPABASE CONFIG
// ═══════════════════════════════════════════════════════════════
const SUPA_URL='https://ttedkebbdxxltclumfyr.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0ZWRrZWJiZHh4bHRjbHVtZnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MDc2NjQsImV4cCI6MjA5MDE4MzY2NH0.GOlbwgKDw1sAJtFLga7msHhX5OikKdLunPuhZqeLYJA';
let supa=null;
try{if(window.supabase&&window.supabase.createClient)supa=window.supabase.createClient(SUPA_URL,SUPA_KEY,{
    auth:{
      persistSession:false,
      autoRefreshToken:false,
      detectSessionInUrl:false,
    },
    realtime:{
      params:{eventsPerSecond:0}
    },
    global:{
      fetch:(...args)=>fetch(...args)
    }
  });}catch(e){console.warn('Supabase offline:',e.message);}

// ═══════════════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════════════
const KEY='lifeos_v3';
let DB={};
let syncTimeout=null;
try{DB=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){DB={};}

function initDB(d){
  DB=d||{};
  DB.expenses=DB.expenses||[];DB.income=DB.income||[];DB.investments=DB.investments||[];
  DB.debts=DB.debts||[];DB.skills=DB.skills||[];DB.studyLog=DB.studyLog||[];
  DB.tasks=DB.tasks||[];DB.habits=DB.habits||[];DB.timeBlocks=DB.timeBlocks||[];
  DB.corpLogs=DB.corpLogs||[];DB.corpAttendance=DB.corpAttendance||{};
  DB.blockedApps=DB.blockedApps||[];DB.wastedLog=DB.wastedLog||[];
  DB.goals=DB.goals||[];DB.familySupport=DB.familySupport||[];
  DB.courses=DB.courses||[];DB.students=DB.students||[];
  DB.cibilHistory=DB.cibilHistory||[];
  DB.posts=DB.posts||[];
  DB.splits=DB.splits||[];
  DB.focusProfile=DB.focusProfile||{level:1,totalXP:0,streak:0,lastFocusDate:''};
  DB.nextMonthPlan=DB.nextMonthPlan||{month:'',expenses:[],income:[]};
  DB.settings=DB.settings||{budget:15000,dailyBudget:0,sideGoal:10000,balance:0,autoReset:{}};
  DB.settings.dailyBudget=DB.settings.dailyBudget||0;
}
initDB(DB);

function setSyncStatus(s){
  const dot=document.querySelector('.status-dot');
  const lbl=document.getElementById('sync-label');
  if(!dot||!lbl)return;
  const m={idle:['#3d5a73','CLOUD'],syncing:['#f0a500','SYNCING…'],synced:['#2ecc71','SYNCED ✓'],error:['#e03b3b','SYNC ERR'],offline:['#7a9ab8','OFFLINE']};
  const[c,t]=m[s]||m.idle;dot.style.background=c;lbl.textContent=t;
}
function saveDB(){
  localStorage.setItem(KEY,JSON.stringify(DB));localStorage.setItem(KEY+'_ts',Date.now().toString());
  clearTimeout(syncTimeout);setSyncStatus('syncing');syncTimeout=setTimeout(pushToDB,800);
}
async function pushToDB(){
  if(!supa){setSyncStatus('offline');return;}
  try{const{error}=await supa.from('lifeos_data').upsert({id:'main',data:DB,updated_at:new Date().toISOString()});if(error)throw error;setSyncStatus('synced');setTimeout(()=>setSyncStatus('idle'),2500);}
  catch(e){console.warn('Sync fail:',e.message);setSyncStatus('error');setTimeout(()=>setSyncStatus('offline'),3000);}
}
async function loadDB(){
  try{const s=JSON.parse(localStorage.getItem(KEY));if(s)initDB(s);else initDB({});}catch(e){initDB({});}
  if(!supa){setSyncStatus('offline');return;}
  setSyncStatus('syncing');
  try{
    const{data,error}=await supa.from('lifeos_data').select('data,updated_at').eq('id','main').single();
    if(error&&error.code!=='PGRST116')throw error;
    if(data&&data.data&&Object.keys(data.data).length>0){
      const cu=new Date(data.updated_at).getTime();const lu=parseInt(localStorage.getItem(KEY+'_ts')||'0');
      if(cu>=lu){initDB(data.data);localStorage.setItem(KEY,JSON.stringify(DB));localStorage.setItem(KEY+'_ts',cu);}
    }else{await pushToDB();}
    setSyncStatus('synced');setTimeout(()=>setSyncStatus('idle'),2500);
  }catch(e){console.warn('Load fail:',e.message);setSyncStatus('offline');}
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function fmt(n){return '₹'+Number(n||0).toLocaleString('en-IN');}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function toast(msg,type='info'){
  const t=document.getElementById('toast');t.textContent=msg;
  t.style.borderColor=type==='good'?'var(--green)':type==='bad'?'var(--red)':'var(--amber)';
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);
}
function $$(s){return document.querySelectorAll(s);}
function $(s){return document.querySelector(s);}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return d;}

// ═══════════════════════════════════════════════════════════════
// RESPONSIVE / SIDEBAR
// ═══════════════════════════════════════════════════════════════
function toggleSidebar(){
  const sb=document.getElementById('sidebar');const ov=document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');ov.classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
const PAGE_TITLES={dashboard:'Dashboard',corporate:'Corporate',finance:'Finance Engine',credit:'Credit + Invest',invincibles:'Invincibles',skills:'Skills & Learning',tasks:'Tasks & Routine',distraction:'Anti-Distraction',income:'Income & Teaching',goals:'Goals & Family',analytics:'Analytics',report:'Reports',sysctl:'System Control',lifefeed:'LifeFeed'};
function navigate(page){
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
  $('#page-title-text').textContent=PAGE_TITLES[page]||page;
  closeSidebar();
  if(page==='dashboard')renderDashboard();
  if(page==='finance'){renderExpenses();renderFinanceSummary();}
  if(page==='skills')renderSkills();
  if(page==='tasks'){renderTasks();renderHabits();}
  if(page==='invincibles')renderDebts();
  if(page==='corporate'){renderCorpLogs();renderCorpCalendar();renderCorpTimeline();}
  if(page==='credit'){renderInvestments();renderCibilHistory();}
  if(page==='distraction')renderDistStats();
  if(page==='nextplan')renderNextPlan();
  if(page==='income'){renderIncome();renderCourses();renderStudents();renderSplits();}
  if(page==='goals'){renderGoals();renderFamily();}
  if(page==='analytics'){renderAnalytics();}
  if(page==='report'){renderReportStats();generateReport();}
  if(page==='lifefeed')renderLifeFeed();
  saveCurrentPage(page);
}
$$('.nav-item').forEach(n=>n.addEventListener('click',()=>navigate(n.dataset.page)));
// Persist current page across refresh
function saveCurrentPage(page){ try{sessionStorage.setItem('lifeos_page',page);}catch(e){} }
function restoreCurrentPage(){
  const p=sessionStorage.getItem('lifeos_page');
  if(p&&p!=='dashboard'&&document.getElementById('page-'+p)) navigate(p);
}

// ═══════════════════════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════════════════════
function updateClock(){
  const now=new Date();
  $('#live-clock').textContent=now.toTimeString().slice(0,8);
  $('#topbar-date').textContent=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
  $('#sidebar-date').textContent=now.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
setInterval(updateClock,1000);updateClock();

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════
function openModal(title,html){$('#modal-title').textContent=title;$('#modal-body').innerHTML=html;$('#modal-overlay').classList.add('open');}
function closeModal(){$('#modal-overlay').classList.remove('open');}
function initCoreListeners(){
  $('#modal-overlay').addEventListener('click',e=>{if(e.target===$('#modal-overlay'))closeModal();});
}
