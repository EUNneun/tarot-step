(()=>{
  const CURRENT_VERSION='2026.09.11.13';
  const VERSION_URL='version.json';
  const RELOAD_GUARD_KEY='tarotstep_version_reload_target';
  const CHECK_THROTTLE_MS=1500;
  let checking=false;
  let lastCheckedAt=0;

  async function checkVersion(){
    const now=Date.now();
    if(checking || now-lastCheckedAt<CHECK_THROTTLE_MS) return;
    if(typeof navigator!=='undefined' && navigator.onLine===false) return;
    checking=true;
    lastCheckedAt=now;
    try{
      const separator=VERSION_URL.includes('?')?'&':'?';
      const response=await fetch(`${VERSION_URL}${separator}_=${Date.now()}`,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(!response.ok) return;
      const data=await response.json();
      const serverVersion=String(data?.version||'').trim();
      if(!serverVersion) return;
      if(serverVersion===CURRENT_VERSION){sessionStorage.removeItem(RELOAD_GUARD_KEY);return;}
      const guardedVersion=sessionStorage.getItem(RELOAD_GUARD_KEY);
      if(guardedVersion===serverVersion) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY,serverVersion);
      const url=new URL(location.href);
      url.searchParams.set('__appv',serverVersion);
      location.replace(url.toString());
    }catch(err){console.info('[TarotStep] version check skipped',err?.message||err);}
    finally{checking=false;}
  }

  window.TAROTSTEP_APP_VERSION=CURRENT_VERSION;
  window.TAROTSTEP_CHECK_VERSION=checkVersion;
  window.addEventListener('pageshow',checkVersion);
  window.addEventListener('focus',checkVersion);
  window.addEventListener('online',checkVersion);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible') checkVersion();});
  checkVersion();
})();
