import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const ADMIN_EMAIL='limiteun@gmail.com';
const LOAD_TIMEOUT=8000;
const authHealth=document.getElementById('healthAuth');
const dbHealth=document.getElementById('healthDb');
const appHealth=document.getElementById('healthApp');
const retryBtn=document.getElementById('adminRetry');
const testToggle=document.getElementById('errorTestToggle');
const testPanel=document.getElementById('errorTestPanel');
const gate=document.getElementById('adminGate'), panel=document.getElementById('adminApp'), login=document.getElementById('adminLogin');
const list=document.getElementById('adminList'), status=document.getElementById('adminStatus'), search=document.getElementById('adminSearch');
let auth,db,provider;
let rows=[],filter='needs';
const qMap=new Map((window.TAROT_DATA?.questions||[]).map(q=>[q.id,q]));

const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
const date=v=>{if(!v)return '';try{return new Date(v).toLocaleString('ko-KR')}catch{return v}};
const choiceText=q=>(q?.choices||[]).map(c=>`${c.correct?'✓ ':'· '}${c.text||c.value_id||''}`).join(' / ');
const withTimeout=(promise,label)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timeout`)),LOAD_TIMEOUT))]);

function setHealth(el,text,state){if(!el)return;el.textContent=text;el.className=`health-pill ${state}`;}
function showRetry(show=true){if(retryBtn)retryBtn.hidden=!show;}
function showGate(title,message){gate.hidden=false;panel.hidden=true;gate.innerHTML=`<h1>${esc(title)}</h1><p>${esc(message)}</p>`;}

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
    return `<article class="feedback-card ${r.kind}"><div class="feedback-meta"><span>${r.kind==='needs'?'✎ 개선요청':'👍 도움됨'}</span><span>${esc(r.questionId)}</span><span>${esc(q?.difficulty||'')}</span><span>${esc(date(r.at))}</span><span>${r.source==='legacy'?'기존 누적':'이벤트'}</span></div><div class="feedback-question">${esc(q?.prompt||'현재 문제은행에서 찾을 수 없는 문제')}</div>${answer?`<div class="feedback-answer"><b>정답</b> ${esc(answer.text||answer.value_id)}</div>`:''}${q?.choices?.length?`<div class="feedback-choices">${esc(choiceText(q))}</div>`:''}${q?.explanation?`<div class="feedback-explain"><b>현재 해설</b>\n${esc(q.explanation)}</div>`:''}<div class="feedback-user">${esc(r.user)}</div></article>`;
  }).join(''):'<div class="empty">해당 피드백이 없습니다.</div>';
}

async function load(){
  setHealth(dbHealth,'DB 확인중','checking');showRetry(false);status.textContent='피드백 데이터를 불러오는 중...';
  try{
    const snap=await withTimeout(getDocs(collection(db,'users')),'Firestore');
    const users=snap.docs.map(d=>({id:d.id,...d.data()}));rows=buildRows(users);
    document.getElementById('needsCount').textContent=rows.filter(r=>r.kind==='needs').length;
    document.getElementById('helpfulCount').textContent=rows.filter(r=>r.kind==='helpful').length;
    document.getElementById('eventCount').textContent=rows.filter(r=>r.source==='event').length;
    document.getElementById('userCount').textContent=users.length;
    setHealth(dbHealth,`DB 정상 · ${users.length}명`,'ok');render();
  }catch(err){
    console.error('[TarotStep Admin] Firestore load failed',err);
    setHealth(dbHealth,err.message?.includes('timeout')?'DB 시간초과':'DB 오류','error');
    status.textContent='피드백 데이터를 불러오지 못했습니다. 관리자 화면은 정상이며 DB 조회만 실패했습니다.';
    list.innerHTML='<div class="empty">데이터 조회에 실패했습니다. 상단의 다시 시도를 눌러주세요.</div>';showRetry(true);
  }
}

function simulateError(type){
  if(type==='normal'){
    setHealth(appHealth,'APP 정상','ok');setHealth(authHealth,auth?.currentUser?'AUTH 정상':'AUTH 로그아웃',auth?.currentUser?'ok':'idle');
    if(auth?.currentUser){gate.hidden=true;panel.hidden=false;load();}else{setHealth(dbHealth,'DB 대기','idle');showGate('관리자 로그인','TarotStep 관리자 계정으로 로그인해 주세요.');showRetry(false);}return;
  }
  if(type==='auth'){
    setHealth(appHealth,'APP 정상','ok');setHealth(authHealth,'AUTH 오류','error');setHealth(dbHealth,'DB 대기','idle');
    showGate('인증 오류 테스트','Firebase 인증 초기화에 실패한 상황을 재현했습니다.');showRetry(true);return;
  }
  gate.hidden=true;panel.hidden=false;setHealth(appHealth,'APP 정상','ok');setHealth(authHealth,'AUTH 정상','ok');
  if(type==='timeout'){
    setHealth(dbHealth,'DB 시간초과','error');status.textContent='[테스트] Firestore 응답이 8초 이상 지연된 상황입니다.';
    list.innerHTML='<div class="empty">[테스트] DB 응답이 지연되었습니다. 다시 시도를 눌러주세요.</div>';showRetry(true);return;
  }
  if(type==='permission'){
    setHealth(dbHealth,'DB 권한오류','error');status.textContent='[테스트] Firestore 권한 부족으로 조회에 실패한 상황입니다.';
    list.innerHTML='<div class="empty">[테스트] 관리자 조회 권한이 없습니다. Firestore Rules를 확인해 주세요.</div>';showRetry(true);
  }
}

function bindUI(){
  login.addEventListener('click',async()=>{try{if(auth.currentUser){await signOut(auth);return;}await withTimeout(signInWithPopup(auth,provider),'Google login');}catch(err){console.error('[TarotStep Admin] login failed',err);setHealth(authHealth,'AUTH 오류','error');showGate('로그인 오류','Google 로그인을 다시 시도해 주세요.');showRetry(true);}});
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.filter;render();}));
  search.addEventListener('input',render);
  retryBtn?.addEventListener('click',()=>{if(auth?.currentUser) load();else location.reload();});
  testToggle?.addEventListener('click',()=>{testPanel.hidden=!testPanel.hidden;});
  testPanel?.querySelectorAll('[data-test-error]').forEach(btn=>btn.addEventListener('click',()=>simulateError(btn.dataset.testError)));
}

function init(){
  try{
    if(!window.TAROT_FIREBASE_CONFIG) throw new Error('Firebase config missing');
    const app=initializeApp(window.TAROT_FIREBASE_CONFIG);auth=getAuth(app);db=getFirestore(app);provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
    setHealth(appHealth,'APP 정상','ok');setPersistence(auth,browserLocalPersistence).catch(err=>console.warn('[TarotStep Admin] persistence failed',err));bindUI();
    let authResolved=false;const authTimer=setTimeout(()=>{if(authResolved)return;setHealth(authHealth,'AUTH 시간초과','error');showGate('인증 확인 지연','인증 응답이 늦습니다. 다시 시도해 주세요.');showRetry(true);},LOAD_TIMEOUT);
    onAuthStateChanged(auth,user=>{
      authResolved=true;clearTimeout(authTimer);
      if(!user){setHealth(authHealth,'AUTH 로그아웃','idle');setHealth(dbHealth,'DB 대기','idle');gate.hidden=false;panel.hidden=true;login.textContent='로그인';gate.innerHTML='<h1>관리자 로그인</h1><p>TarotStep 관리자 계정으로 로그인해 주세요.</p>';return;}
      setHealth(authHealth,'AUTH 정상','ok');login.textContent='로그아웃';
      if((user.email||'').toLowerCase()!==ADMIN_EMAIL){setHealth(authHealth,'AUTH 권한없음','error');gate.hidden=false;panel.hidden=true;gate.innerHTML='<h1>접근 권한이 없습니다</h1><p>관리자 계정으로 다시 로그인해 주세요.</p>';return;}
      gate.hidden=true;panel.hidden=false;load();
    },err=>{authResolved=true;clearTimeout(authTimer);console.error('[TarotStep Admin] auth listener failed',err);setHealth(authHealth,'AUTH 오류','error');showGate('인증 오류','Firebase 인증 초기화에 실패했습니다.');showRetry(true);});
  }catch(err){console.error('[TarotStep Admin] init failed',err);setHealth(appHealth,'APP 오류','error');setHealth(authHealth,'AUTH 대기','idle');setHealth(dbHealth,'DB 대기','idle');showGate('관리자 화면 초기화 오류','Firebase 설정을 확인해 주세요.');showRetry(true);}
}

init();