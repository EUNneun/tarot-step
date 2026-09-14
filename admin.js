import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const ADMIN_EMAIL='limiteun@gmail.com';
const app=initializeApp(window.TAROT_FIREBASE_CONFIG);
const auth=getAuth(app);
const db=getFirestore(app);
const provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
setPersistence(auth,browserLocalPersistence).catch(err=>console.warn('[TarotStep Admin] persistence',err));

const gate=document.getElementById('adminGate');
const panel=document.getElementById('adminApp');
const login=document.getElementById('adminLogin');
const list=document.getElementById('adminList');
const status=document.getElementById('adminStatus');
const search=document.getElementById('adminSearch');
const copyBtn=document.getElementById('copyForAi');
const qMap=new Map((window.TAROT_DATA?.questions||[]).map(q=>[q.id,q]));
let rows=[];
let filter='needs';
let adminComments={};

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const fmtDate=v=>{if(!v)return '';try{return new Date(v).toLocaleString('ko-KR')}catch{return String(v)}};

function buildRows(users){
  const out=[];
  for(const u of users){
    const p=u.progress||{};
    const hist=Array.isArray(p.feedbackHistory)?p.feedbackHistory:[];
    const historyKeys=new Set(hist.map(h=>`${h.questionId}|${h.type}`));
    for(const h of hist){
      out.push({kind:h.type==='needs-more'?'needs':'helpful',at:h.at,questionId:h.questionId,user:u.email||u.id,source:'event'});
    }
    for(const [qid,f] of Object.entries(p.explanationFeedback||{})){
      if((f.needsMoreCount||f.needsMoreAt||f.count||f.checkedAt) && !historyKeys.has(`${qid}|needs-more`)){
        out.push({kind:'needs',at:f.needsMoreAt||f.checkedAt,questionId:qid,user:u.email||u.id,source:'legacy'});
      }
      if((f.helpfulCount||f.helpfulAt) && !historyKeys.has(`${qid}|helpful`)){
        out.push({kind:'helpful',at:f.helpfulAt,questionId:qid,user:u.email||u.id,source:'legacy'});
      }
    }
  }
  return out.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
}

function choiceHtml(q){
  if(!q?.choices?.length) return '';
  return `<div class="admin-choice-list"><div class="admin-choice-title">보기</div>${q.choices.map((c,i)=>`<div class="admin-choice-item ${c.correct?'correct':''}"><span class="admin-choice-no">${i+1}</span><span class="admin-choice-text">${esc(c.text||c.value_id||'')}</span>${c.correct?'<span class="admin-choice-badge">정답</span>':''}</div>`).join('')}</div>`;
}

function filteredRows(){
  const term=(search?.value||'').trim().toLowerCase();
  return rows.filter(r=>{
    if(filter!=='history' && r.kind!==filter) return false;
    const q=qMap.get(r.questionId);
    const meta=adminComments[r.questionId]||{};
    const hay=[r.questionId,q?.prompt,q?.card_id,...(q?.card_ids||[]),...(q?.choices||[]).map(c=>c.text),meta.comment,meta.improvedAt].join(' ').toLowerCase();
    return !term||hay.includes(term);
  });
}

function render(){
  const shown=filteredRows();
  status.textContent=`${shown.length}건 표시 · 관리자 코멘트와 개선일시는 문항 ID 기준으로 저장됩니다.`;
  list.innerHTML=shown.length?shown.map(r=>{
    const q=qMap.get(r.questionId);
    const meta=adminComments[r.questionId]||{};
    const improvedAt=meta.improvedAt;
    return `<article class="feedback-card ${r.kind}${improvedAt?' improved':''}">
      <div class="feedback-meta">
        <span>${r.kind==='needs'?'✎ 개선요청':'👍 도움됨'}</span>
        <span>${esc(r.questionId)}</span>
        <span>${esc(q?.difficulty||'')}</span>
        <span>${esc(fmtDate(r.at))}</span>
        <span>${r.source==='legacy'?'기존 누적':'이벤트'}</span>
        ${improvedAt?`<span class="improved-badge">✓ 개선 완료 · ${esc(fmtDate(improvedAt))}</span>`:''}
      </div>
      <div class="feedback-question">${esc(q?.prompt||'현재 문제은행에서 찾을 수 없는 문제')}</div>
      ${choiceHtml(q)}
      ${q?.explanation?`<div class="feedback-explain"><b>현재 해설</b>\n${esc(q.explanation)}</div>`:''}
      ${r.kind==='needs'?`<div class="admin-comment-box">
        <div class="admin-comment-head"><b>관리자 코멘트</b>${meta.updatedAt?`<span>${esc(fmtDate(meta.updatedAt))} 저장</span>`:''}</div>
        <textarea data-comment-qid="${esc(r.questionId)}" placeholder="예: 정답 근거가 약함 / 다른 카드와 차이를 더 설명">${esc(meta.comment||'')}</textarea>
        <div class="admin-comment-actions">
          <button type="button" class="improvement-toggle${improvedAt?' done':''}" data-improved-qid="${esc(r.questionId)}">${improvedAt?'개선 완료 해제':'개선 완료 처리'}</button>
          <button type="button" class="save-comment" data-save-qid="${esc(r.questionId)}">코멘트 저장</button>
        </div>
        ${improvedAt?`<div class="improved-time">개선일시: <b>${esc(fmtDate(improvedAt))}</b></div>`:''}
      </div>`:''}
      <div class="feedback-user">${esc(r.user)}</div>
    </article>`;
  }).join(''):'<div class="empty">해당 피드백이 없습니다.</div>';
}

async function loadAdminComments(){
  const user=auth.currentUser;
  if(!user) return;
  try{
    const snap=await getDoc(doc(db,'users',user.uid));
    adminComments=snap.exists()?(snap.data()?.adminComments||{}):{};
  }catch(err){
    console.error('[TarotStep Admin] comments',err);
    adminComments={};
  }
}

async function saveMeta(qid,next,button,successText){
  const user=auth.currentUser;
  if(!user) return;
  const old=button.textContent;
  button.disabled=true;
  button.textContent='저장 중...';
  try{
    await setDoc(doc(db,'users',user.uid),{adminComments:{[qid]:next}},{merge:true});
    adminComments[qid]=next;
    button.textContent=successText;
    setTimeout(render,500);
  }catch(err){
    console.error('[TarotStep Admin] save',err);
    button.textContent='저장 실패';
    button.disabled=false;
    setTimeout(()=>button.textContent=old,1200);
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
    console.error('[TarotStep Admin] load',err);
    status.textContent='피드백 데이터를 불러오지 못했습니다. Firestore 관리자 조회 권한을 확인해 주세요.';
    list.innerHTML='<div class="empty">화면은 정상입니다. 데이터 조회 권한만 확인이 필요합니다.</div>';
  }
}

login?.addEventListener('click',async()=>{
  try{
    if(auth.currentUser) await signOut(auth);
    else await signInWithPopup(auth,provider);
  }catch(err){
    console.error('[TarotStep Admin] auth',err);
    gate.innerHTML='<h1>로그인 오류</h1><p>Google 로그인을 다시 시도해 주세요.</p>';
  }
});

document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
  filter=btn.dataset.filter;
  render();
}));

search?.addEventListener('input',render);

copyBtn?.addEventListener('click',async()=>{
  const unique=[];
  const seen=new Set();
  for(const r of filteredRows()){
    if(r.kind!=='needs'||seen.has(r.questionId)) continue;
    seen.add(r.questionId);
    const q=qMap.get(r.questionId);
    const meta=adminComments[r.questionId]||{};
    unique.push(`[${r.questionId}]\n질문: ${q?.prompt||''}\n현재 해설: ${q?.explanation||''}\n관리자 코멘트: ${meta.comment||'(미작성)'}\n개선 상태: ${meta.improvedAt?`완료 (${fmtDate(meta.improvedAt)})`:'미완료'}`);
  }
  try{
    await navigator.clipboard.writeText(`TarotStep 해설 개선 작업\n\n${unique.join('\n\n---\n\n')}`);
    copyBtn.textContent='복사 완료';
    setTimeout(()=>copyBtn.textContent='AI 작업용 복사',1000);
  }catch(err){
    console.error(err);
  }
});

list?.addEventListener('click',e=>{
  const save=e.target.closest('[data-save-qid]');
  if(save){
    const qid=save.dataset.saveQid;
    const textarea=save.closest('.admin-comment-box')?.querySelector('textarea');
    const prev=adminComments[qid]||{};
    const next={...prev,comment:(textarea?.value||'').trim(),updatedAt:new Date().toISOString()};
    saveMeta(qid,next,save,'저장됨');
    return;
  }
  const improved=e.target.closest('[data-improved-qid]');
  if(improved){
    const qid=improved.dataset.improvedQid;
    const prev=adminComments[qid]||{};
    const next={...prev,improvedAt:prev.improvedAt?null:new Date().toISOString(),improvementUpdatedAt:new Date().toISOString()};
    saveMeta(qid,next,improved,prev.improvedAt?'완료 해제됨':'개선 완료');
  }
});

onAuthStateChanged(auth,user=>{
  if(!user){
    gate.hidden=false;
    panel.hidden=true;
    login.textContent='로그인';
    gate.innerHTML='<h1>관리자 로그인</h1><p>TarotStep 관리자 계정으로 로그인해 주세요.</p>';
    return;
  }
  login.textContent='로그아웃';
  if((user.email||'').toLowerCase()!==ADMIN_EMAIL){
    gate.hidden=false;
    panel.hidden=true;
    gate.innerHTML='<h1>접근 권한이 없습니다</h1><p>관리자 계정으로 다시 로그인해 주세요.</p>';
    return;
  }
  gate.hidden=true;
  panel.hidden=false;
  load();
});
