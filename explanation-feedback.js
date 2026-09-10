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
  function showToast(message='체크되었습니다'){
    const toast=ensureToast();
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('show'),1400);
  }

  function ensureProgressShape(){
    progress.explanationFeedback=progress.explanationFeedback||{};
  }

  function getEntry(q){
    ensureProgressShape();
    return progress.explanationFeedback[q.id]||{};
  }

  function metadata(q){
    return {
      questionType:q.type||'',
      difficulty:q.difficulty||'',
      category:q.category||'',
      cardId:q.card_id||'',
      cardIds:Array.isArray(q.card_ids)?q.card_ids:[]
    };
  }

  function addFeedbackButtons(q){
    const explain=document.getElementById('explain');
    if(!explain || !q) return;
    explain.parentElement?.querySelector('.explain-feedback-action')?.remove();

    const wrap=document.createElement('div');
    wrap.className='explain-feedback-action';

    const pencil=document.createElement('button');
    pencil.type='button';
    pencil.className='explain-feedback-btn';
    pencil.setAttribute('aria-label','해설 보완 필요');
    pencil.title='해설 보완 필요';
    pencil.textContent='✎';

    const helpful=document.createElement('button');
    helpful.type='button';
    helpful.className='explain-feedback-btn';
    helpful.setAttribute('aria-label','도움이 된 해설');
    helpful.title='도움이 된 해설';
    helpful.textContent='👍';

    const existing=getEntry(q);
    const pencilChecked=Boolean(existing.needsMoreCount || existing.needsMoreAt || existing.count || existing.checkedAt);
    const helpfulChecked=Boolean(existing.helpfulCount || existing.helpfulAt);
    if(pencilChecked){ pencil.classList.add('is-checked'); pencil.disabled=true; }
    if(helpfulChecked){ helpful.classList.add('is-checked'); helpful.disabled=true; }

    pencil.addEventListener('click',()=>{
      const prev=getEntry(q);
      if(prev.needsMoreCount || prev.needsMoreAt || prev.count || prev.checkedAt){
        showToast();
        return;
      }
      const now=new Date().toISOString();
      progress.explanationFeedback[q.id]={
        ...prev,
        ...metadata(q),
        count:Math.max(Number(prev.count)||0,1),
        needsMoreCount:Math.max(Number(prev.needsMoreCount)||0,1),
        checkedAt:prev.checkedAt||now,
        needsMoreAt:now
      };
      saveProgress();
      pencil.classList.add('is-checked');
      pencil.disabled=true;
      showToast('보완 필요로 체크했습니다');
    });

    helpful.addEventListener('click',()=>{
      const prev=getEntry(q);
      if(prev.helpfulCount || prev.helpfulAt){
        showToast();
        return;
      }
      const now=new Date().toISOString();
      progress.explanationFeedback[q.id]={
        ...prev,
        ...metadata(q),
        helpfulCount:Math.max(Number(prev.helpfulCount)||0,1),
        helpfulAt:now
      };
      saveProgress();
      helpful.classList.add('is-checked');
      helpful.disabled=true;
      showToast('도움이 된 해설로 체크했습니다');
    });

    wrap.append(pencil,helpful);
    explain.insertAdjacentElement('afterend',wrap);
  }

  const baseSelect=select;
  select=function(c,btn,q){
    baseSelect(c,btn,q);
    addFeedbackButtons(q);
  };

  const baseRender=render;
  render=function(){
    baseRender();
    const q=session?.[idx];
    if(q && document.getElementById('feedback')?.style.display==='block') addFeedbackButtons(q);
  };
})();