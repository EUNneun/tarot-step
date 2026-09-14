(()=>{
  const app=document.querySelector('.app');
  if(!app) return;
  let loading=false;
  let loaded=false;

  function addEntry(){
    const dashboard=document.getElementById('homeDashboard');
    if(!dashboard || dashboard.querySelector('#advancedEntry')) return;
    const daily=dashboard.querySelector('.daily-card');
    if(!daily) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.id='advancedEntry';
    btn.className='advanced-entry';
    btn.innerHTML='<span>객관식이 익숙해졌다면</span><b>심화 리딩 연습 →</b><small>3장 조합을 직접 해석하고 모범 리딩과 비교해요</small>';
    btn.addEventListener('click',openAdvanced);
    daily.insertAdjacentElement('afterend',btn);
  }

  function ensureCss(){
    if(document.querySelector('link[data-advanced-css]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='advanced-mode.css?v=20260914-3';
    link.dataset.advancedCss='1';
    document.head.appendChild(link);
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src.includes(src.split('?')[0]));
      if(existing){resolve();return;}
      const s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=reject;
      document.body.appendChild(s);
    });
  }

  async function openAdvanced(){
    const btn=document.getElementById('advancedEntry');
    if(loaded && window.TAROTSTEP_ADVANCED?.show){
      window.TAROTSTEP_ADVANCED.show();
      return;
    }
    if(loading) return;
    loading=true;
    if(btn){btn.disabled=true;btn.querySelector('b').textContent='심화 리딩 불러오는 중…';}
    try{
      ensureCss();
      await loadScript('advanced-mode.js?v=20260914-3');
      await loadScript('advanced-card-images.js?v=20260914-2');
      loaded=true;
      window.TAROTSTEP_ADVANCED?.show?.();
    }catch(err){
      console.error('[TarotStep] advanced mode load failed',err);
      if(btn){btn.disabled=false;btn.querySelector('b').textContent='다시 시도 →';}
    }finally{
      loading=false;
    }
  }

  const observer=new MutationObserver(addEntry);
  observer.observe(app,{childList:true,subtree:true});
  addEntry();
})();