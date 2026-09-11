import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const STORAGE_KEY='tarotstep_progress_v2';
const AUTH_SYNC_KEY='tarotstep_auth_synced_uid';
const OWNER_KEY='tarotstep_progress_owner_uid';
const GUEST_OWNER='guest';
const config=window.TAROT_FIREBASE_CONFIG;
const gateButton=document.getElementById('loginGateButton');

function setGuestMode(){
  document.body.classList.remove('auth-checking','auth-signed-in');
  document.body.classList.add('auth-signed-out');
  window.TAROT_AUTH_USER=null;
}

if(!config){
  const owner=localStorage.getItem(OWNER_KEY);
  if(owner && owner!==GUEST_OWNER) localStorage.removeItem(STORAGE_KEY);
  localStorage.setItem(OWNER_KEY,GUEST_OWNER);
  setGuestMode();
  console.info('[TarotStep] Firebase config not set. Guest mode is active.');
} else {
  const app=initializeApp(config);
  const auth=getAuth(app);
  const db=getFirestore(app);
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const kakaoProvider=new OAuthProvider('oidc.kakao');
  kakaoProvider.addScope('openid');
  kakaoProvider.addScope('profile');
  kakaoProvider.addScope('account_email');
  await setPersistence(auth,browserLocalPersistence);

  function readLocal(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') || {}; }
    catch { return {}; }
  }

  function num(v){ return Number.isFinite(Number(v)) ? Number(v) : 0; }

  function mergeStatSafe(a={},b={}){
    const attempts=Math.max(num(a.attempts),num(b.attempts));
    const correct=Math.min(attempts,Math.max(num(a.correct),num(b.correct)));
    return { attempts, correct, streak:Math.max(num(a.streak),num(b.streak)) };
  }

  function addStat(guest={},remote={}){
    const attempts=num(remote.attempts)+num(guest.attempts);
    const correct=Math.min(attempts,num(remote.correct)+num(guest.correct));
    return { attempts, correct, streak:Math.max(num(remote.streak),num(guest.streak)) };
  }

  function mergeMapMax(a={},b={}){
    const out={...a};
    for(const [k,v] of Object.entries(b||{})) out[k]=Math.max(num(out[k]),num(v));
    return out;
  }

  function mergeMapAdd(a={},b={}){
    const out={...a};
    for(const [k,v] of Object.entries(b||{})) out[k]=num(out[k])+num(v);
    return out;
  }

  function mergeDue(a={},b={}){
    const out={...a};
    for(const [k,v] of Object.entries(b||{})){
      const av=num(out[k]), bv=num(v);
      out[k]=av&&bv?Math.min(av,bv):(av||bv);
    }
    return out;
  }

  function mergeFeedback(a={},b={}){
    const out={...a};
    for(const [id,item] of Object.entries(b||{})){
      const prev=out[id]||{};
      const legacyNeedsMore=Math.max(num(prev.count),num(item?.count));
      out[id]={
        ...prev,
        ...item,
        count:legacyNeedsMore,
        needsMoreCount:Math.max(num(prev.needsMoreCount),num(item?.needsMoreCount),legacyNeedsMore),
        helpfulCount:Math.max(num(prev.helpfulCount),num(item?.helpfulCount)),
        checkedAt:item?.checkedAt||prev.checkedAt||null,
        needsMoreAt:item?.needsMoreAt||prev.needsMoreAt||item?.checkedAt||prev.checkedAt||null,
        helpfulAt:item?.helpfulAt||prev.helpfulAt||null
      };
    }
    return out;
  }

  function mergeHistory(a=[],b=[]){
    const all=[...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])];
    const seen=new Set();
    return all.filter(item=>{
      const key=item?.id||`${item?.questionId||''}|${item?.type||''}|${item?.at||''}`;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((x,y)=>String(x?.at||'').localeCompare(String(y?.at||''))).slice(-500);
  }

  function mergeRecent(localRecent=[],remoteRecent=[]){
    const combined=[...(Array.isArray(remoteRecent)?remoteRecent:[]),...(Array.isArray(localRecent)?localRecent:[])];
    return [...new Set(combined)].slice(-120);
  }

  function mergeProgressSafe(local={},remote={}){
    const cardStats={...remote.cardStats};
    for(const [id,stat] of Object.entries(local.cardStats||{})) cardStats[id]=mergeStatSafe(stat,cardStats[id]);
    return {
      xp:Math.max(num(local.xp),num(remote.xp)),
      totalAnswered:Math.max(num(local.totalAnswered),num(remote.totalAnswered)),
      totalCorrect:Math.max(num(local.totalCorrect),num(remote.totalCorrect)),
      wrongQueue:mergeMapMax(remote.wrongQueue,local.wrongQueue),
      cardStats,
      confusionPairs:mergeMapMax(remote.confusionPairs,local.confusionPairs),
      confusionReviewDue:mergeDue(remote.confusionReviewDue,local.confusionReviewDue),
      explanationFeedback:mergeFeedback(remote.explanationFeedback,local.explanationFeedback),
      feedbackHistory:mergeHistory(remote.feedbackHistory,local.feedbackHistory),
      recentQuestionIds:mergeRecent(local.recentQuestionIds,remote.recentQuestionIds)
    };
  }

  function mergeGuestProgress(guest={},remote={}){
    const cardStats={...remote.cardStats};
    for(const [id,stat] of Object.entries(guest.cardStats||{})) cardStats[id]=addStat(stat,cardStats[id]);
    return {
      xp:num(remote.xp)+num(guest.xp),
      totalAnswered:num(remote.totalAnswered)+num(guest.totalAnswered),
      totalCorrect:num(remote.totalCorrect)+num(guest.totalCorrect),
      wrongQueue:mergeMapAdd(remote.wrongQueue,guest.wrongQueue),
      cardStats,
      confusionPairs:mergeMapAdd(remote.confusionPairs,guest.confusionPairs),
      confusionReviewDue:mergeDue(remote.confusionReviewDue,guest.confusionReviewDue),
      explanationFeedback:mergeFeedback(remote.explanationFeedback,guest.explanationFeedback),
      feedbackHistory:mergeHistory(remote.feedbackHistory,guest.feedbackHistory),
      recentQuestionIds:mergeRecent(guest.recentQuestionIds,remote.recentQuestionIds)
    };
  }

  async function pushProgress(user){
    if(!user) return;
    const payload=readLocal();
    await setDoc(doc(db,'users',user.uid),{
      progress:payload,
      email:user.email||null,
      displayName:user.displayName||null,
      updatedAt:serverTimestamp()
    },{merge:true});
  }

  async function loadOrMergeAccount(user,mode){
    const ref=doc(db,'users',user.uid);
    const snap=await getDoc(ref);
    const local=readLocal();
    const remote=snap.exists()?(snap.data()?.progress||{}):{};

    const merged=mode==='guest'
      ? mergeGuestProgress(local,remote)
      : mode==='same'
        ? mergeProgressSafe(local,remote)
        : mergeProgressSafe({},remote);

    localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
    await setDoc(ref,{
      progress:merged,
      email:user.email||null,
      displayName:user.displayName||null,
      updatedAt:serverTimestamp()
    },{merge:true});
  }

  function authErrorMessage(err){
    const code=err?.code || 'unknown';
    const messages={
      'auth/unauthorized-domain':'현재 접속한 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.',
      'auth/operation-not-allowed':'Firebase Authentication에서 Google 로그인이 아직 활성화되지 않았습니다.',
      'auth/popup-blocked':'브라우저에서 로그인 팝업이 차단되었습니다.',
      'auth/popup-closed-by-user':'Google 로그인 창이 완료 전에 닫혔습니다.',
      'auth/cancelled-popup-request':'다른 로그인 요청이 진행 중입니다.'
    };
    return `${messages[code] || err?.message || 'Google 로그인에 실패했습니다.'}\n\n오류 코드: ${code}`;
  }

  function setChecking(message='로그인 확인 중...'){
    document.body.classList.remove('auth-signed-in','auth-signed-out');
    document.body.classList.add('auth-checking');
    if(gateButton){ gateButton.disabled=true; gateButton.textContent=message; }
  }

  function setSignedOut(){
    setGuestMode();
    if(gateButton){ gateButton.disabled=false; gateButton.textContent='Google 계정으로 로그인'; }
  }

  function setSignedIn(){
    document.body.classList.remove('auth-checking','auth-signed-out');
    document.body.classList.add('auth-signed-in');
  }

  async function login(){
    try { await signInWithPopup(auth,provider); }
    catch(err){
      console.error('[TarotStep] Google login failed',err);
      setSignedOut();
      alert(authErrorMessage(err));
      throw err;
    }
  }

  async function loginWithKakao(){
    try { await signInWithPopup(auth,kakaoProvider); }
    catch(err){
      console.error('[TarotStep] Kakao login failed',err);
      setSignedOut();
      const code=err?.code||'unknown';
      const hint=code==='auth/operation-not-allowed'
        ? '\n\nFirebase Authentication에서 OIDC 공급자 oidc.kakao 설정이 필요합니다.'
        : '';
      alert((err?.message||'카카오 로그인에 실패했습니다.')+hint+'\n\n오류 코드: '+code);
      throw err;
    }
  }

  let activeUser=null;
  let saveTimer=null;

  async function logout(){
    setChecking('로그아웃 중...');
    if(activeUser){
      clearTimeout(saveTimer);
      try { await pushProgress(activeUser); } catch(err){ console.error('[TarotStep] final cloud save failed',err); }
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(OWNER_KEY,GUEST_OWNER);
    sessionStorage.removeItem(AUTH_SYNC_KEY);
    await signOut(auth);
    setSignedOut();
    location.reload();
  }

  gateButton?.addEventListener('click',()=>login().catch(()=>{}));
  window.TAROT_AUTH_ACTIONS={login,loginWithKakao,logout};

  onAuthStateChanged(auth,async user=>{
    activeUser=user;
    window.TAROT_AUTH_USER=user?{uid:user.uid,displayName:user.displayName||'',email:user.email||'',photoURL:user.photoURL||''}:null;
    window.dispatchEvent(new CustomEvent('tarotstep:auth-changed',{detail:window.TAROT_AUTH_USER}));

    if(!user){
      const owner=localStorage.getItem(OWNER_KEY);
      if(owner && owner!==GUEST_OWNER) localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(OWNER_KEY,GUEST_OWNER);
      setSignedOut();
      return;
    }

    setChecking('학습 기록 불러오는 중...');
    const owner=localStorage.getItem(OWNER_KEY);
    const mode=owner===GUEST_OWNER || !owner ? 'guest' : owner===user.uid ? 'same' : 'other';

    if(mode==='other') localStorage.removeItem(STORAGE_KEY);

    try{
      await loadOrMergeAccount(user,mode);
      localStorage.setItem(OWNER_KEY,user.uid);
      if(sessionStorage.getItem(AUTH_SYNC_KEY)!==user.uid){
        sessionStorage.setItem(AUTH_SYNC_KEY,user.uid);
        location.reload();
        return;
      }
      setSignedIn();
    }catch(err){
      console.error('[TarotStep] cloud merge failed',err);
      localStorage.setItem(OWNER_KEY,user.uid);
      setSignedIn();
    }
  });

  window.addEventListener('tarotstep:progress-saved',()=>{
    if(!activeUser) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushProgress(activeUser).catch(err=>console.error('[TarotStep] cloud save failed',err)),500);
  });
}
