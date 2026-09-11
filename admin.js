import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const ADMIN_EMAIL='limiteun@gmail.com';
const app=initializeApp(window.TAROT_FIREBASE_CONFIG);
const auth=getAuth(app), db=getFirestore(app), provider=new GoogleAuthProvider();
await setPersistence(auth,browserLocalPersistence);
provider.setCustomParameters({prompt:'select_account'});

const gate=document.getElementById('adminGate'), panel=document.getElementById('adminApp'), login=document.getElementById('adminLogin');
const list=document.getElementById('adminList'), status=document.getElementById('adminStatus'), search=document.getElementById('adminSearch');
const qMap=new Map((window.TAROT_DATA?.questions||[]).map(q=>[q.id,q]));
let rows=[],filter='needs';

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const date=v=>{if(!v)return '';try{return new Date(v).toLocaleString('ko-KR')}catch{return v}};
const choiceText=q=>(q?.choices||[]).map(c=>`${c.correct?'✓ ':'· '}${c.text||c.value_id||''}`).join(' / ');

function buildRows(users){
  const out=[];
  for(const u of users){
    const p=u.progress||{}, hist=Array.isArray(p.feedbackHistory)?p.feedbackHistory:[];
    const historyKeys=new Set(hist.map(h=>`${h.questionId}|${h.type}`));
    for(const h of hist) out.push({kind:h.type==='needs-more'?'needs':'helpful',at:h.at,questionId:h.questionId,user:u.email||u.id,source:'event'});
    for(const [qid,f] of Object.entries(p.explanationFeedback||{})){
      if((f.needsMoreCount||f.needsMoreAt||f.count||f.checkedAt) && !historyKeys.has(`${qid}|needs-more`)) out.push({kind:'needs',at:f.needsMoreAt||f.checkedAt,questionId:qid,user:u.email||u.id,source:'legacy'});
      if((f.helpfulCount||f.helpfulAt) && !historyKeys.has(`${qid}|helpful`)) out.push({kind:'helpful',at:f.helpfulAt,questionId:qid,user:u.email||u.id,source:'legacy'});
    }
  }
  return out.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
}

function render(){
  const term=search.value.trim().toLowerCase();
  const shown=rows.filter(r=>{
    if(filter!=='history' && r.kind!==filter) return false;
    const q=qMap.get(r.questionId);
    const hay=[r.questionId,q?.prompt,q?.card_id,...(q?.card_ids||[]),...(q?.choices||[]).map(c=>c.text)].join(' ').toLowerCase();
    return !term||hay.includes(term);
  });
  status.textContent=`${shown.length}건 표시 · 기존 피드백은 최초 이벤트 로그 도입 이전 데이터일 수 있습니다.`;
  list.innerHTML=shown.length?shown.map(r=>{
    const q=qMap.get(r.questionId), answer=(q?.choices||[]).find(c=>c.correct);
    return `<article class="feedback-card ${r.kind}">
      <div class="feedback-meta"><span>${r.kind==='needs'?'✎ 개선요청':'👍 도움됨'}</span><span>${esc(r.questionId)}</span><span>${esc(q?.difficulty||'')}</span><span>${esc(date(r.at))}</span><span>${r.source==='legacy'?'기존 누적':'이벤트'}</span></div>
      <div class="feedback-question">${esc(q?.prompt||'현재 문제은행에서 찾을 수 없는 문제')}</div>
      ${answer?`<div class="feedback-answer"><b>정답</b> ${esc(answer.text||answer.value_id)}</div>`:''}
      ${q?.choices?.length?`<div class="feedback-choices">${esc(choiceText(q))}</div>`:''}
      ${q?.explanation?`<div class="feedback-explain"><b>현재 해설</b>\n${esc(q.explanation)}</div>`:''}
      <div class="feedback-user">${esc(r.user)}</div>
    </article>`;
  }).join(''):'<div class="empty">해당 피드백이 없습니다.</div>';
}

async function load(){
  status.textContent='피드백 데이터를 불러오는 중...';
  try{
    const snap=await getDocs(collection(db,'users'));
    const users=snap.docs.map(d=>({id:d.id,...d.data()}));
    rows=buildRows(users);
    document.getElementById('needsCount').textContent=rows.filter(r=>r.kind==='needs').length;
    document.getElementById('helpfulCount').textContent=rows.filter(r=>r.kind==='helpful').length;
    document.getElementById('eventCount').textContent=rows.filter(r=>r.source==='event').length;
    document.getElementById('userCount').textContent=users.length;
    render();
  }catch(err){
    console.error(err);
    status.textContent='Firestore에서 사용자 피드백을 읽지 못했습니다. 관리자 계정의 users 컬렉션 조회 권한을 확인해 주세요.';
    list.innerHTML='<div class="empty">데이터 조회 권한이 필요합니다.</div>';
  }
}

login.addEventListener('click',async()=>{
  if(auth.currentUser){await signOut(auth);return;}
  await signInWithPopup(auth,provider);
});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render();
}));
search.addEventListener('input',render);

onAuthStateChanged(auth,user=>{
  if(!user){
    gate.hidden=false;panel.hidden=true;login.textContent='로그인';
    gate.innerHTML='<h1>관리자 로그인</h1><p>TarotStep 관리자 계정으로 로그인해 주세요.</p>';
    return;
  }
  login.textContent='로그아웃';
  if((user.email||'').toLowerCase()!==ADMIN_EMAIL){
    gate.hidden=false;panel.hidden=true;
    gate.innerHTML='<h1>접근 권한이 없습니다</h1><p>관리자 계정으로 다시 로그인해 주세요.</p>';
    return;
  }
  gate.hidden=true;panel.hidden=false;load();
});