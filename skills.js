// ═══════════════════════════════════════════════════════════════
// SKILLS
// ═══════════════════════════════════════════════════════════════
function addSkill(){
  const name=$('#skill-name').value.trim();if(!name){toast('Enter topic name','bad');return;}
  const total=parseInt($('#skill-total').value)||1;const comp=parseInt($('#skill-comp').value)||0;
  DB.skills.push({id:uid(),name,total,comp,questions:getDefaultQuestions(name)});
  saveDB();renderSkills();$('#skill-name').value='';$('#skill-total').value='';$('#skill-comp').value='';
  toast('Topic added: '+name,'good');
}
function getDefaultQuestions(name){
  const q={'MuleSoft':['What is MuleSoft Anypoint Platform?','Explain DataWeave transformation.','What is a Mule Flow?','What is an APIkit router?','Difference between sync and async flows?'],'Kafka':['What is Apache Kafka?','Explain producer-consumer model.','What is a Kafka topic partition?','How does Kafka ensure fault tolerance?','What is Zookeeper role in Kafka?'],'AI':['Difference between supervised and unsupervised learning?','Explain gradient descent.','What is overfitting?','What are transformers?','What is RAG?'],'Salesforce':['What is Salesforce CRM?','Explain Apex triggers.','What is Lightning Web Component?','Difference between SOQL and SOSL?','What is a sandbox?']};
  return q[name]||['Explain the core concept of '+name,'Main use cases for '+name+'?','Best practices for '+name+'?'];
}
function logStudy(){
  const hrs=parseFloat($('#study-hrs').value);const topic=$('#study-topic').value;
  if(!hrs||hrs<=0){toast('Enter valid hours','bad');return;}
  DB.studyLog.push({id:uid(),date:today(),hrs,topic});saveDB();updateScreenEarned();
  toast('Logged: '+hrs+'h on '+topic,'good');renderDashboard();
}
function renderSkills(){
  const total=DB.skills.reduce((a,s)=>a+s.total,0);const done=DB.skills.reduce((a,s)=>a+s.comp,0);
  const pct=total?Math.round(done/total*100):0;
  const wa=daysAgo(7);const waStr_=wa.getFullYear()+'-'+String(wa.getMonth()+1).padStart(2,'0')+'-'+String(wa.getDate()).padStart(2,'0');const wh=DB.studyLog.filter(s=>s.date&&s.date>=waStr_).reduce((a,s)=>a+s.hrs,0);
  $('#skill-overall-pct').textContent=pct+'%';$('#skill-overall-bar').style.width=pct+'%';
  $('#skill-hrs-week').textContent=wh.toFixed(1)+'h';$('#skill-done-count').textContent=done;
  $('#skill-remain').textContent=(total-done)+' remaining';
  // Weekly ring bar
  const weekPct=Math.min(100,Math.round(wh/15*100));
  const weekBar=$('#skill-week-ring-bar');const weekLbl=$('#skill-week-ring-label');
  if(weekBar){weekBar.style.width=weekPct+'%';weekBar.style.background=weekPct>=100?'var(--green)':weekPct>=60?'var(--amber)':'var(--blue)';}
  if(weekLbl)weekLbl.textContent=wh.toFixed(1)+'h / 15h';
  // Separate active vs mastered
  const activeSkills=DB.skills.filter(s=>s.comp<s.total);
  const masteredSkills=DB.skills.filter(s=>s.comp>=s.total&&s.total>0);
  const list=$('#skill-list');list.innerHTML='';
  const sel=$('#study-topic');sel.innerHTML='';
  if(!activeSkills.length)list.innerHTML='<div class="text-dim text-sm" style="padding:8px 0">No active topics. Add one above!</div>';
  activeSkills.forEach(s=>{
    const p=s.total?Math.round(s.comp/s.total*100):0;
    const topicLogs=DB.studyLog.filter(l=>l.topic===s.name).map(l=>l.date).sort();
    const recentStudy=topicLogs.length?topicLogs[topicLogs.length-1]:'—';
    list.innerHTML+=`<div class="goal-item"><div class="flex justify-between items-center"><div class="goal-name" style="font-size:13px">${s.name}</div><div class="flex gap8"><button class="btn btn-outline btn-sm" onclick="updateSkillProgress('${s.id}')">Update</button><button class="del-btn" onclick="delSkill('${s.id}')">✕</button></div></div><div class="flex justify-between text-sm mt8 text-dim"><span>${s.comp}/${s.total} sub-topics</span><span class="text-amber">${p}%</span></div><div class="prog-wrap" style="margin-top:5px"><div class="prog-fill ${p>=80?'green':''}" style="width:${p}%"></div></div><div class="text-xs text-dim mt4">Last studied: ${recentStudy}</div></div>`;
    const o=document.createElement('option');o.value=s.name;o.textContent=s.name;sel.appendChild(o);
  });
  // Mastered section
  const mastSec=$('#mastered-section');const mastList=$('#mastered-list');
  if(mastSec)mastSec.style.display=masteredSkills.length?'block':'none';
  if(mastList){
    if(!masteredSkills.length){mastList.innerHTML='';return;}
    mastList.innerHTML='<table class="tbl"><thead><tr><th>Topic</th><th>Sub-topics</th><th>Hours Studied</th><th>Mastered On</th><th></th></tr></thead><tbody>'+
      masteredSkills.map(s=>{
        const totalHrs=DB.studyLog.filter(l=>l.topic===s.name).reduce((a,l)=>a+l.hrs,0);
        return `<tr>
          <td style="color:var(--cyan);font-weight:600">${s.name} 🎓</td>
          <td class="text-dim">${s.total}</td>
          <td class="text-amber font-mono">${totalHrs.toFixed(1)}h</td>
          <td class="text-dim" style="font-size:11px">${s.masteredDate||'—'}</td>
          <td><button class="del-btn" onclick="delSkill('${s.id}')">✕</button></td>
        </tr>`;
      }).join('')+'</tbody></table>';
  }
}
function updateSkillProgress(id){
  const s=DB.skills.find(x=>x.id===id);if(!s)return;
  const c=parseInt(prompt('Sub-topics completed (out of '+s.total+')?',s.comp));if(isNaN(c)||c<0)return;
  s.comp=Math.min(s.total,c);
  if(s.comp>=s.total&&!s.masteredDate){s.masteredDate=today();toast('🎓 '+s.name+' MASTERED! Outstanding!','good');}
  else toast('Progress updated!','good');
  saveDB();renderSkills();
}
function delSkill(id){DB.skills=DB.skills.filter(s=>s.id!==id);saveDB();renderSkills();}
let practiceData={topic:null,qs:[],idx:0,timerInt:null,elapsed:0};
function startPractice(skill){
  practiceData={topic:skill,qs:[...(skill.questions||[])].sort(()=>Math.random()-.5),idx:0,timerInt:null,elapsed:0};
  $('#practice-area').style.display='block';$('#practice-topic-label').textContent='Practicing: '+skill.name;showPracticeQ();
}
function showPracticeQ(){
  const q=practiceData.qs[practiceData.idx%practiceData.qs.length];
  if(!q){$('#practice-question').textContent='No questions.';return;}
  $('#practice-question').textContent='Q: '+q;$('#practice-answer').style.display='none';
  clearInterval(practiceData.timerInt);practiceData.elapsed=0;
  practiceData.timerInt=setInterval(()=>{practiceData.elapsed++;const m=String(Math.floor(practiceData.elapsed/60)).padStart(2,'0');const s=String(practiceData.elapsed%60).padStart(2,'0');$('#practice-timer').textContent=m+':'+s;},1000);
}
function practiceReveal(){$('#practice-answer').innerHTML='💡 Think about: <strong>'+practiceData.qs[practiceData.idx%practiceData.qs.length]+'</strong><br>Write your answer, then review notes.';$('#practice-answer').style.display='block';}
function practiceNext(){practiceData.idx++;showPracticeQ();}
