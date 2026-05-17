// ═══════════════════════════════════════════════════════════════
// INIT / BOOT
// ═══════════════════════════════════════════════════════════════
function init(){
  renderDashboard();renderTimeBlocks();renderHabits();
  updateCibilDisplay();updateScreenEarned();
  // Restore balance input
  if($('#balance-input'))$('#balance-input').value=DB.settings.balance||'';
  // Restore auto-reset selects
  const ar=DB.settings.autoReset||{};
  if($('#autoreset-daily'))$('#autoreset-daily').value=ar.daily||'';
  if($('#autoreset-weekly'))$('#autoreset-weekly').value=ar.weekly||'';
  // Set default date on expense pickers to today
  const t=today();
  if(document.getElementById('exp-date-picker'))document.getElementById('exp-date-picker').value=t;
  if(document.getElementById('d-qexp-date'))document.getElementById('d-qexp-date').value=t;
  initCoreListeners();
  initSettingsListeners();
}

// ═══════════════════════════════════════════════════════════════
// LIFEFEED — Personal Micro-Journal
// ═══════════════════════════════════════════════════════════════

const LF_TAGS = {
  win:      { emoji:'🏆', label:'Win',      cls:'tag-win'      },
  loss:     { emoji:'😞', label:'Loss',     cls:'tag-loss'     },
  learning: { emoji:'📚', label:'Learning', cls:'tag-learning' },
  money:    { emoji:'💰', label:'Money',    cls:'tag-money'    },
  mood:     { emoji:'😐', label:'Mood',     cls:'tag-mood'     },
};

const LF_MAX   = 500;
let   lfTag    = '';         // currently selected tag for new post
let   lfFilter = '';         // current feed filter

// ── Composer helpers ─────────────────────────────────────────
function lfCharCount(){
  const ta  = $('#lf-textarea');
  const btn = $('#lf-post-btn');
  const cc  = $('#lf-char-count');
  const len = ta.value.length;
  cc.textContent = len + ' / ' + LF_MAX;
  cc.className   = 'lf-char-count' + (len > LF_MAX ? ' over' : len > LF_MAX * 0.85 ? ' warn' : '');
  btn.disabled   = len === 0 || len > LF_MAX;
}

function lfToggleTag(tag){
  lfTag = (lfTag === tag) ? '' : tag;
  $$('#lf-tags-row .lf-tag-btn').forEach(b => {
    const t = b.onclick.toString().match(/'(\w+)'/)?.[1];
    b.classList.toggle('active', t === lfTag);
  });
}

function lfSetFilter(btn, tag){
  lfFilter = tag;
  $$('#page-lifefeed .lf-filter-tag').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLifeFeed();
}

// ── Post ─────────────────────────────────────────────────────
function lfPost(){
  const ta   = $('#lf-textarea');
  const text = ta.value.trim();
  if(!text || text.length > LF_MAX) return;

  const post = {
    id:        uid(),
    text,
    tag:       lfTag,
    ts:        Date.now(),
    date:      today(),
    liked:     false,
    likes:     0,
    bookmarked: false,
    pinned:    false,
    replies:   [],
  };

  DB.posts.unshift(post);
  saveDB();

  // Reset composer
  ta.value = '';
  lfTag    = '';
  $$('#lf-tags-row .lf-tag-btn').forEach(b => b.classList.remove('active'));
  lfCharCount();

  renderLifeFeed();
  toast('✦ Posted to LifeFeed!', 'good');
}

// ── Render feed ───────────────────────────────────────────────
function renderLifeFeed(){
  const feed    = $('#lf-feed');
  if(!feed) return;

  const query   = ($('#lf-search')?.value || '').toLowerCase().trim();
  const pinned  = DB.posts.filter(p => p.pinned);
  const rest    = DB.posts.filter(p => !p.pinned);
  let   posts   = [...pinned, ...rest];

  // Filter by tag
  if(lfFilter) posts = posts.filter(p => p.tag === lfFilter);
  // Filter by search
  if(query)    posts = posts.filter(p => p.text.toLowerCase().includes(query) || (p.tag && p.tag.includes(query)));

  if(posts.length === 0){
    feed.innerHTML = `
      <div class="lf-empty">
        <div class="lf-empty-icon">${lfFilter ? LF_TAGS[lfFilter]?.emoji || '🔍' : '🐦'}</div>
        <div class="lf-empty-title">${query ? 'No results found' : lfFilter ? 'No ' + (LF_TAGS[lfFilter]?.label||'') + ' posts yet' : 'Your feed is empty'}</div>
        <div class="lf-empty-sub">${query ? 'Try a different search term' : 'Write your first thought above ↑'}</div>
      </div>`;
    lfRenderSidebar();
    return;
  }

  feed.innerHTML = posts.map(p => lfPostHTML(p)).join('');
  lfRenderSidebar();
}

function lfPostHTML(p){
  const tagInfo  = p.tag ? LF_TAGS[p.tag] : null;
  const timeStr  = lfTimeAgo(p.ts);
  const repliesHTML = p.replies?.map(r => `
    <div class="lf-reply">
      <div class="lf-reply-avatar">💬</div>
      <div>
        <div class="lf-reply-body">${lfEscape(r.text)}</div>
        <div class="lf-reply-time">${lfTimeAgo(r.ts)}</div>
      </div>
    </div>`).join('') || '';

  return `
  <div class="lf-post${p.pinned?' pinned':''}" id="post-${p.id}">
    <div class="lf-post-header">
      <div class="lf-avatar" style="width:36px;height:36px;font-size:13px">C</div>
      <div class="lf-post-meta">
        <div class="lf-post-name">Charan</div>
        <div class="lf-post-time">${timeStr} · ${p.date}</div>
      </div>
      ${tagInfo ? `<span class="lf-post-tag ${tagInfo.cls}">${tagInfo.emoji} ${tagInfo.label}</span>` : ''}
    </div>
    <div class="lf-post-body">${lfEscape(p.text)}</div>
    <div class="lf-post-actions">
      <button class="lf-action ${p.liked?'liked':''}" onclick="lfLike('${p.id}')">
        ${p.liked?'❤️':'🤍'} <span class="lf-action-count">${p.likes||0}</span>
      </button>
      <div class="lf-action-sep"></div>
      <button class="lf-action" onclick="lfToggleReply('${p.id}')">
        💬 <span class="lf-action-count">${p.replies?.length||0}</span>
      </button>
      <div class="lf-action-sep"></div>
      <button class="lf-action ${p.bookmarked?'bookmarked':''}" onclick="lfBookmark('${p.id}')">
        ${p.bookmarked?'🔖':'🏷️'} <span>${p.bookmarked?'Saved':'Save'}</span>
      </button>
      <div class="lf-action-sep"></div>
      <button class="lf-action ${p.pinned?'pinned-act':''}" onclick="lfPin('${p.id}')">
        📌 <span>${p.pinned?'Unpin':'Pin'}</span>
      </button>
      <div class="lf-action-sep"></div>
      <button class="lf-action" onclick="lfDelete('${p.id}')" style="margin-left:auto;color:var(--text3)">
        🗑️
      </button>
    </div>

    <!-- Reply section -->
    <div class="lf-replies" id="replies-${p.id}">
      ${repliesHTML}
      <div class="lf-reply-composer">
        <div class="lf-reply-avatar" style="width:28px;height:28px">💬</div>
        <input class="lf-reply-input" id="reply-input-${p.id}" placeholder="Write a reply…" onkeydown="if(event.key==='Enter')lfReply('${p.id}')"/>
        <button class="lf-reply-send" onclick="lfReply('${p.id}')">REPLY</button>
      </div>
    </div>
  </div>`;
}

// ── Actions ───────────────────────────────────────────────────
function lfLike(id){
  const p = DB.posts.find(x=>x.id===id);
  if(!p) return;
  p.liked  = !p.liked;
  p.likes  = (p.likes||0) + (p.liked ? 1 : -1);
  saveDB(); renderLifeFeed();
}

function lfBookmark(id){
  const p = DB.posts.find(x=>x.id===id);
  if(!p) return;
  p.bookmarked = !p.bookmarked;
  saveDB(); renderLifeFeed();
}

function lfPin(id){
  const p = DB.posts.find(x=>x.id===id);
  if(!p) return;
  // Allow only 3 pinned at once
  const pinCount = DB.posts.filter(x=>x.pinned&&x.id!==id).length;
  if(!p.pinned && pinCount >= 3){ toast('Max 3 pinned posts allowed','bad'); return; }
  p.pinned = !p.pinned;
  saveDB(); renderLifeFeed();
  toast(p.pinned ? '📌 Post pinned' : 'Post unpinned', 'info');
}

function lfDelete(id){
  if(!confirm('Delete this post?')) return;
  DB.posts = DB.posts.filter(p=>p.id!==id);
  saveDB(); renderLifeFeed();
  toast('Post deleted','info');
}

function lfToggleReply(id){
  const el = document.getElementById('replies-'+id);
  if(!el) return;
  el.classList.toggle('open');
  if(el.classList.contains('open')){
    const input = document.getElementById('reply-input-'+id);
    if(input) setTimeout(()=>input.focus(), 50);
  }
}

function lfReply(id){
  const input = document.getElementById('reply-input-'+id);
  if(!input) return;
  const text = input.value.trim();
  if(!text) return;
  const p = DB.posts.find(x=>x.id===id);
  if(!p) return;
  if(!p.replies) p.replies = [];
  p.replies.push({ id: uid(), text, ts: Date.now() });
  saveDB(); renderLifeFeed();
  // Re-open the replies section after re-render
  setTimeout(()=>{
    const el = document.getElementById('replies-'+id);
    if(el) el.classList.add('open');
  }, 10);
  toast('Reply added!', 'good');
}

// ── Sidebar ───────────────────────────────────────────────────
function lfRenderSidebar(){
  // Stats
  const statsEl = $('#lf-stats');
  if(statsEl){
    const total    = DB.posts.length;
    const totalLikes = DB.posts.reduce((a,p)=>a+(p.likes||0), 0);
    const bkCount  = DB.posts.filter(p=>p.bookmarked).length;
    const tagCounts = Object.fromEntries(Object.keys(LF_TAGS).map(t=>[t, DB.posts.filter(p=>p.tag===t).length]));
    statsEl.innerHTML = `
      <div class="lf-stat-row"><span class="lf-stat-label">Total Posts</span><span class="lf-stat-val">${total}</span></div>
      <div class="lf-stat-row"><span class="lf-stat-label">Total Likes</span><span class="lf-stat-val">${totalLikes}❤️</span></div>
      <div class="lf-stat-row"><span class="lf-stat-label">Bookmarked</span><span class="lf-stat-val">${bkCount}</span></div>
      ${Object.entries(tagCounts).filter(([,v])=>v>0).map(([k,v])=>`
        <div class="lf-stat-row">
          <span class="lf-stat-label">${LF_TAGS[k].emoji} ${LF_TAGS[k].label}</span>
          <span class="lf-stat-val">${v}</span>
        </div>`).join('')}
    `;
  }

  // Streak
  const streakEl = $('#lf-streak-num');
  if(streakEl) streakEl.textContent = lfCalcStreak();

  // Bookmarks
  const bkEl = $('#lf-bookmarks');
  if(bkEl){
    const bks = DB.posts.filter(p=>p.bookmarked).slice(0,5);
    if(!bks.length){
      bkEl.innerHTML = '<div class="text-dim text-xs" style="padding:4px 0">No bookmarks yet</div>';
    } else {
      bkEl.innerHTML = bks.map(p=>`
        <div style="padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="lfScrollTo('${p.id}')">
          <div style="font-size:12px;color:var(--text);line-height:1.4">${lfEscape(p.text.slice(0,60))}${p.text.length>60?'…':''}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--text3);margin-top:2px">${lfTimeAgo(p.ts)}</div>
        </div>`).join('');
    }
  }
}

function lfScrollTo(id){
  const el = document.getElementById('post-'+id);
  if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); el.style.outline='1px solid var(--cyan)'; setTimeout(()=>el.style.outline='',1500); }
}

// ── Utilities ─────────────────────────────────────────────────
function lfCalcStreak(){
  if(!DB.posts.length) return 0;
  const days = new Set(DB.posts.map(p=>p.date));
  let streak = 0;
  let d = new Date();
  for(let i=0; i<365; i++){
    const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(days.has(ds)) streak++;
    else if(i>0) break;
    d.setDate(d.getDate()-1);
  }
  return streak;
}

function lfTimeAgo(ts){
  const diff = Date.now() - ts;
  const s = Math.floor(diff/1000);
  const m = Math.floor(s/60);
  const h = Math.floor(m/60);
  const d = Math.floor(h/24);
  if(s < 60)  return 'just now';
  if(m < 60)  return m + 'm ago';
  if(h < 24)  return h + 'h ago';
  if(d < 30)  return d + 'd ago';
  return new Date(ts).toLocaleDateString('en-IN',{day:'2-digit',month:'short'});
}

function lfEscape(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/\n/g,'<br>');
}


// ═══════════════════════════════════════════════════════════════
// LOCK SCREEN
// ═══════════════════════════════════════════════════════════════
const LOCK_KEY     = 'lifeos_pw';
const LOCK_SESSION = 'lifeos_session';
const DEFAULT_PW   = '7798';

function lockGetPw(){
  return localStorage.getItem(LOCK_KEY) || DEFAULT_PW;
}

function lockCheck(){
  // If session is still valid (same browser tab session), skip lock
  if(sessionStorage.getItem(LOCK_SESSION) === 'unlocked'){
    document.getElementById('lock-screen').style.display = 'none';
    return;
  }
  // Show lock screen (already visible by default)
  setTimeout(()=>{
    const inp = document.getElementById('lock-input');
    if(inp) inp.focus();
  }, 100);
}

function lockSubmit(){
  const inp = document.getElementById('lock-input');
  const err = document.getElementById('lock-error');
  const val = inp.value.trim();

  if(!val){ err.textContent = '// Enter your password'; return; }

  if(val === lockGetPw()){
    // Correct — unlock
    sessionStorage.setItem(LOCK_SESSION, 'unlocked');
    const screen = document.getElementById('lock-screen');
    screen.style.transition = 'opacity .4s';
    screen.style.opacity = '0';
    setTimeout(()=>{ screen.style.display = 'none'; }, 400);
    err.textContent = '';
  } else {
    // Wrong — shake + error
    inp.value = '';
    err.textContent = '// Wrong password. Try again.';
    inp.style.borderColor = '#e03b3b';
    inp.style.animation = 'none';
    setTimeout(()=>{
      inp.style.borderColor = '';
      err.textContent = '';
    }, 2000);
  }
}

function lockShowChange(){
  const panel = document.getElementById('lock-change-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if(panel.style.display === 'block'){
    document.getElementById('lock-cur-pw').focus();
  }
}

function lockChangePassword(){
  const cur  = document.getElementById('lock-cur-pw').value.trim();
  const nw   = document.getElementById('lock-new-pw').value.trim();
  const conf = document.getElementById('lock-conf-pw').value.trim();
  const err  = document.getElementById('lock-change-error');

  if(cur !== lockGetPw()){
    err.textContent = '// Current password is wrong.'; return;
  }
  if(!nw || nw.length < 3){
    err.textContent = '// New password must be at least 3 characters.'; return;
  }
  if(nw !== conf){
    err.textContent = '// Passwords do not match.'; return;
  }

  localStorage.setItem(LOCK_KEY, nw);
  err.style.color = '#2ecc71';
  err.textContent = '// Password changed! Unlocking…';

  setTimeout(()=>{
    sessionStorage.setItem(LOCK_SESSION, 'unlocked');
    const screen = document.getElementById('lock-screen');
    screen.style.transition = 'opacity .4s';
    screen.style.opacity = '0';
    setTimeout(()=>{ screen.style.display = 'none'; }, 400);
  }, 1000);
}

// Also add a "Lock" option in the UI (called from sidebar)
function lockApp(){
  sessionStorage.removeItem(LOCK_SESSION);
  location.reload();
}

async function boot(){
  lockCheck();
  await loadDB();init();
  restoreCurrentPage();
  checkAndPromptPlanApply();
}
boot();