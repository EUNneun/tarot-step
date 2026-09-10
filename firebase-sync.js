import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const STORAGE_KEY='tarotstep_progress_v2';
const AUTH_SYNC_KEY='tarotstep_auth_synced_uid';
const OWNER_KEY='tarotstep_progress_owner_uid';
const config=window.TAROT_FIREBASE_CONFIG;
const loginGate=document.getElementById('loginGate');
const gateButton=document.getElementById('loginGateButton');

if(!config){
  document.body.classList.remove('auth-checking');
  console.info('[TarotStep] Firebase config not set. Cloud sync is disabled.');
} else {
  const app=initializeApp(config);
  const auth=getAuth(app);
  const db=getFirestore(app);
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  await setPersistence(auth,browserLocalPersistence);

  function readLocal(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}') || {}; }
    catch { return {}; }
  }

  function num(v){ return Number.isFinite(Number(v)) ? Number(v) : 0; }

  function mergeStat(a={},b={}){
    const attempts=Math.max(num(a.attempts),num(b.attempts));
    const correct=Math.min(attempts,Math.max(num(a.correct),num(b.correct)));
    return { attempts, correct, streak:Math.max(num(a.streak),num(b.streak)) };
  }

  function mergeMapMax(a={},b={}){
    const out={...a};
    for(const [k,v] of Object.entries(b||{})) out[k]=Math.max(num(out[k]),num(v));
    return out;
  }

  function mergeProgress(local={},remote={}){
    const cardStats={...remote.cardStats};
    for(const [id,stat] of Object.entries(local.cardStats||{})) cardStats[id]=mergeStat(stat,cardStats[id]);
    const localRecent=Array.isArray(local.recentQuestionIds)?local.recentQuestionIds:[];
    const remoteRecent=Array.isArray(remote.recentQuestionIds)?remote.recentQuestionIds:[];
    return {
      xp:Math.max(num(local.xp),num(remote.xp)),
      totalAnswered:Math.max(num(local.totalAnswered),num(remote.totalAnswered)),
      totalCorrect:Math.max(num(local.totalCorrect),num(remote.totalCorrect)),
      wrongQueue:mergeMapMax(remote.wrongQueue,local.wrongQueue),
      cardStats,
      confusionPairs:mergeMapMax(remote.confusionPairs,local.confusionPairs),
      recentQuestionIds:remoteRecent.length?remoteRecent:localRecent
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

  async function mergeCloudIntoLocal(user){
    const ref=doc(db,'users',user.uid);
    const snap=await getDoc(ref);
    const local=readLocal();
    if(!snap.exists()){
      await pushProgress(user);
      return false;
    }
    const remote=snap.data()?.progress||{};
    const merged=mergeProgress(local,remote);
    const before=JSON.stringify(local);
    const after=JSON.stringify(merged);
    localStorage.setItem(STORAGE_KEY,after);
    await setDoc(ref,{progress:merged,email:user.email||null,displayName:user.displayName||null,updatedAt:serverTimestamp()},{merge:true});
    return before!==after;
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

  async function login(){
    if(gateButton) gateButton.disabled=true;
    try { await signInWithPopup(auth,provider); }
    catch(err){ console.error('[TarotStep] Google login failed',err); alert(authErrorMessage(err)); throw err; }
    finally { if(gateButton) gateButton.disabled=false; }
  }

  let activeUser=null;
  let saveTimer=null;

  async function logout(){
    if(activeUser){
      clearTimeout(saveTimer);
      try { await pushProgress(activeUser); } catch(err){ console.error('[TarotStep] final cloud save failed',err); }
      localStorage.setItem(OWNER_KEY,activeUser.uid);
    }
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(AUTH_SYNC_KEY);
    await signOut(auth);
    location.reload();
  }

  gateButton?.addEventListener('click',()=>login().catch(()=>{}));
  window.TAROT_AUTH_ACTIONS={login,logout};

  onAuthStateChanged(auth,async user=>{
    activeUser=user;
    window.TAROT_AUTH_USER=user?{uid:user.uid,displayName:user.displayName||'',email:user.email||'',photoURL:user.photoURL||''}:null;
    window.dispatchEvent(new CustomEvent('tarotstep:auth-changed',{detail:window.TAROT_AUTH_USER}));
    document.body.classList.remove('auth-checking','auth-signed-in','auth-signed-out');

    if(!user){
      if(gateButton){ gateButton.disabled=false; gateButton.textContent='Google 계정으로 시작하기'; }
      document.body.classList.add('auth-signed-out');
      return;
    }

    document.body.classList.add('auth-signed-in');
    const owner=localStorage.getItem(OWNER_KEY);
    if(owner && owner!==user.uid) localStorage.removeItem(STORAGE_KEY);

    try{
      await mergeCloudIntoLocal(user);
      localStorage.setItem(OWNER_KEY,user.uid);
      if(sessionStorage.getItem(AUTH_SYNC_KEY)!==user.uid){
        sessionStorage.setItem(AUTH_SYNC_KEY,user.uid);
        location.reload();
      }
    }catch(err){
      console.error('[TarotStep] cloud merge failed',err);
      localStorage.setItem(OWNER_KEY,user.uid);
      if(sessionStorage.getItem(AUTH_SYNC_KEY)!==user.uid){
        sessionStorage.setItem(AUTH_SYNC_KEY,user.uid);
        location.reload();
      }
    }
  });

  window.addEventListener('tarotstep:progress-saved',()=>{
    if(!activeUser) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushProgress(activeUser).catch(err=>console.error('[TarotStep] cloud save failed',err)),500);
  });
}
