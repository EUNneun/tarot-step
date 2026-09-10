import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const STORAGE_KEY='tarotstep_progress_v2';
const config=window.TAROT_FIREBASE_CONFIG;

if(!config){
  console.info('[TarotStep] Firebase config not set. Cloud sync is disabled.');
} else {
  const app=initializeApp(config);
  const auth=getAuth(app);
  const db=getFirestore(app);
  const provider=new GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  await setPersistence(auth,browserLocalPersistence);

  const authArea=document.createElement('div');
  authArea.className='auth-area';
  document.querySelector('.topbar .stat')?.prepend(authArea);

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
    for(const [id,stat] of Object.entries(local.cardStats||{})){
      cardStats[id]=mergeStat(stat,cardStats[id]);
    }
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

  function renderAuth(user){
    authArea.innerHTML='';
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='auth-button';
    if(user){
      btn.textContent=user.displayName ? `${user.displayName} · 로그아웃` : '로그아웃';
      btn.onclick=()=>signOut(auth);
    }else{
      btn.textContent='Google 로그인';
      btn.onclick=async()=>{
        btn.disabled=true;
        try { await signInWithPopup(auth,provider); }
        catch(err){ console.error(err); alert('Google 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'); }
        finally { btn.disabled=false; }
      };
    }
    authArea.appendChild(btn);
  }

  let activeUser=null;
  let saveTimer=null;

  onAuthStateChanged(auth,async user=>{
    activeUser=user;
    renderAuth(user);
    if(!user) return;
    try{
      const changed=await mergeCloudIntoLocal(user);
      if(changed && !sessionStorage.getItem('tarotstep_cloud_merged')){
        sessionStorage.setItem('tarotstep_cloud_merged','1');
        location.reload();
      }
    }catch(err){ console.error('[TarotStep] cloud merge failed',err); }
  });

  window.addEventListener('tarotstep:progress-saved',()=>{
    if(!activeUser) return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>pushProgress(activeUser).catch(err=>console.error('[TarotStep] cloud save failed',err)),500);
  });
}
