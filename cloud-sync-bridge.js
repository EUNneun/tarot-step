(() => {
  if(typeof saveProgress!=='function') return;
  const originalSave=saveProgress;
  saveProgress=function(){
    originalSave();
    window.dispatchEvent(new CustomEvent('tarotstep:progress-saved'));
  };
})();
