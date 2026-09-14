import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const ADMIN_EMAIL='limiteun@gmail.com';
const app=initializeApp(window.TAROT_FIREBASE_CONFIG);
const auth=getAuth(app), db=getFirestore(app), provider=new GoogleAuthProvider();
await setPersistence(auth,browserLocalPersistence);
provider.setCustomParameters({prompt:'select_account'});

const gate=document.getElementById('adminGate'), panel=document.getElementById('adminApp'), login=document.getElementById('adminLogin');
const list=document.getElementById('adminList'), status=document.getElementById('adminStatus'), search=document.getElementById('adminSearch');
const copyBtn=document.getElementById('copyForAi');
const qMap=new Map((window.TAROT_DATA?.questions||[]).map(q=>[q.id,q]));
let rows=[],filter='needs',adminComments={};

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

async function loadAdminComments(){
  const user=auth.currentUser;
  if(!user) return;
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    adminComments=snap.exists()?(snap.data()?.adminComments||{}):{};
  }catch(err){
    console.error('[TarotStep Admin] comment load failed',err);
    adminComments={};
  }
}

async function saveAdminComment(questionId,comment,button){
  const user=auth.currentUser;
  if(!user) return;
  const trimmed=comment.trim();
  button.disabled=true;
  const old=button.textContent;
  button.textContent='저장 중...';
  try{
    const item={comment:trimmed,updatedAt:new Date().toISOString()};
    await setDoc(doc(db,'users',user.uid),{adminComments:{[questionId]:item}},{merge:true});
    adminComments[questionId]=item;
    document.querySelectorAll(`textarea[data-comment-qid="${questionId}"]`).forEach(el=>{el.value=trimmed;});
    button.textContent='저장됨';
    setTimeout(()=>{button.textContent=old;button.disabled=false;},1000);
  }catch(err){
    console.error('[TarotStep Admin] comment save failed',err);
    button.textContent='저장 실패';
    button.disabled=false;
  }
}

function filteredRows(){
  const term=search.value.trim().toLowerCase();
  return rows.filter(r=>{
    if(filter!=='history' && r.kind!==filter) return false;
    const q=qMap.get(r.questionId);
    const comment=adminComments[r.questionId]?.comment||'';
    const hay=[r.questionId,q?.prompt,q?.card_id,...(q?.card_ids||[]),...(q?.choices||[]).map(c=>c.text),comment].join(' ').toLowerCase();
    return !term||hay.includes(term);
  });
}

function render(){
  const shown=filteredRows();
  status.textContent=`${shown.length}건 표시 · 관리자 코멘트는 문항 ID 기준으로 저장됩니다.`;
  list.innerHTML=shown.length?shown.map(r=>{
    const q=qMap.get(r.questionId), answer=(q?.choices||[]).find(c=>c.correct);
    const savedComment=adminComments[r.questionId]?.comment||'';
    const savedAt=adminComments[r.questionId]?.updatedAt;
    return `<article class="feedback-card ${r.kind}">
      <div class="feedback-meta"><span>${r.kind==='needs'?'✎ 개선요청':'👍 도움됨'}</span><span>${esc(r.questionId)}</span><span>${esc(q?.difficulty||'')}</span><span>${esc(date(r.at))}</span><span>${r.source==='legacy'?'기존 누적':'이벤트'}</span></div>
      <div class="feedback-question">${esc(q?.prompt||'현재 문제은행에서 찾을 수 없는 문제')}</div>
      ${answer?`<div class="feedback-answer"><b>정답</b> ${esc(answer.text||answer.value_id)}</div>`:''}
      ${q?.choices?.length?`<div class="feedback-choices">${esc(choiceText(q))}</div>`:''}
      ${q?.explanation?`<div class="feedback-explain"><b>현재 해설</b>\n${esc(q.explanation)}</div>`:''}
      ${r.kind==='needs'?`<div class="admin-comment-box">
        <div class="admin-comment-head"><b>관리자 코멘트</b>${savedAt?`<span>${esc(date(savedAt))} 저장</span>`:''}</div>
        <textarea data-comment-qid="${esc(r.questionId)}" placeholder="예: 정답 근거가 약함 / 컵 4와 차이를 더 설명 / 실제 상담 문장 추가">${esc(savedComment)}</textarea>
        <div class="admin-comment-actions"><button type="button" class="save-comment" data-save-qid="${esc(r.questionId)}">코멘트 저장</button></div>
      </div>`:''}
      <div class="feedback-user">${esc(r.user)}</div>
    </article>`;
  }).join(''):'<div class="empty">해당 피드백이 없습니다.</div>';
}

async function copyForAi(){
  const unique=[];
  const seen=new Set();
  for(const r of filteredRows()){
    if(r.kind!=='needs'||seen.has(r.questionId)) continue;
    seen.add(r.questionId);
    const q=qMap.get(r.questionId);
    unique.push([
      `[${r.questionId}]`,
      `질문: ${q?.prompt||''}`,
      `현재 해설: ${q?.explanation||''}`,
      `관리자 코멘트: ${adminComments[r.questionId]?.comment||'(미작성)'}`
    ].join('\n'));
  }
  if(!unique.length){status.textContent='복사할 개선요청 문항이 없습니다.';return;}
  try{
    await navigator.clipboard.writeText(`TarotStep 해설 개선 작업\n\n${unique.join('\n\n---\n\n')}`);
    const old=copyBtn.textContent;copyBtn.textContent='복사 완료';setTimeout(()=>copyBtn.textContent=old,1400);
  }catch(err){
    console.error(err);status.textContent='클립보드 복사에 실패했습니다.';
  }
}

async function load(){
  status.textContent='피드백 데이터를 불러오는 중...';
  try{
    await loadAdminComments();
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
copyBtn?.addEventListener('click',copyForAi);
list.addEventListener('click',e=>{
  const btn=e.target.closest('[data-save-qid]');if(!btn)return;
  const qid=btn.dataset.saveQid;
  const textarea=btn.closest('.admin-comment-box')?.querySelector('textarea');
  if(textarea) saveAdminComment(qid,textarea.value,btn);
});

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