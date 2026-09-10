(()=>{
  if(typeof select!=='function' || typeof render!=='function') return;

  const ensureToast=()=>{
    let toast=document.getElementById('feedbackToast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='feedbackToast';
      toast.className='feedback-toast';
      toast.textContent='체크되었습니다';
      document.body.appendChild(toast);
    }
    return toast;
  };

  let toastTimer=null;
  function showToast(){
    const toast=ensureToast();
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);
  }

  function ensureProgressShape(){
    progress.explanationFeedback=progress.explanationFeedback||{};
  }

  function addFeedbackButton(q){
    const explain=document.getElementById('explain');
    if(!explain || !q) return;
    explain.parentElement?.querySelector('.explain-feedback-action')?.remove();

    const wrap=document.createElement('div');
    wrap.className='explain-feedback-action';
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='explain-feedback-btn';
    btn.setAttribute('aria-label','해설 보완 필요 체크');
    btn.title='해설 보완 필요 체크';
    btn.textContent='✎';

    ensureProgressShape();
    const existing=progress.explanationFeedback[q.id];
    if(existing){
      btn.classList.add('is-checked');
      btn.disabled=true;
    }

    btn.addEventListener('click',()=>{
      ensureProgressShape();
      if(progress.explanationFeedback[q.id]){
        showToast();
        return;
      }
      progress.explanationFeedback[q.id]={
        count:1,
        questionType:q.type||'',
        difficulty:q.difficulty||'',
        category:q.category||'',
        checkedAt:new Date().toISOString()
      };
      saveProgress();
      btn.classList.add('is-checked');
      btn.disabled=true;
      showToast();
    });

    wrap.appendChild(btn);
    explain.insertAdjacentElement('afterend',wrap);
  }

  const baseSelect=select;
  select=function(c,btn,q){
    baseSelect(c,btn,q);
    addFeedbackButton(q);
  };

  const baseRender=render;
  render=function(){
    baseRender();
    const q=session?.[idx];
    if(q && document.getElementById('feedback')?.style.display==='block') addFeedbackButton(q);
  };
})();