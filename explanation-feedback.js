(()=>{
  if(typeof select!=='function' || typeof render!=='function') return;

  const data=window.TAROT_DATA||{};
  const questions=Array.isArray(data.questions)?data.questions:[];
  const cardMeta=data.cardMeta||{};
  const keywordMap={};

  for(const q of questions){
    if(q?.type!=='카드→키워드' || !q.card_id || !Array.isArray(q.choices)) continue;
    const correct=q.choices.find(c=>c.correct);
    if(correct?.text && !keywordMap[q.card_id]) keywordMap[q.card_id]=correct.text;
  }

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

  function isMinor(id){return /^[WCSP]\d{2}$/.test(id||'');}
  function rankOf(id){return isMinor(id)?id.slice(1):'';}
  function suitOf(id){return isMinor(id)?id[0]:'';}

  function comparisonType(q){
    const ids=(q.choices||[]).map(c=>c.value_id).filter(isMinor);
    if(ids.length<3) return '';
    const ranks=[...new Set(ids.map(rankOf))];
    const suits=[...new Set(ids.map(suitOf))];
    if(ranks.length===1 && suits.length>=3) return 'same-rank';
    if(suits.length===1 && ranks.length>=3) return 'same-suit';
    return '';
  }

  function shortKeyword(id){
    const raw=String(keywordMap[id]||'').trim();
    if(!raw) return '';
    const parts=raw.split(/[·,\/]/).map(v=>v.trim()).filter(Boolean);
    return parts.slice(0,4).join(' · ');
  }

  function addChoiceComparison(q){
    const explain=document.getElementById('explain');
    if(!explain || !q) return;
    explain.parentElement?.querySelector('.choice-compare')?.remove();

    const type=comparisonType(q);
    if(!type) return;

    const items=(q.choices||[])
      .filter(c=>isMinor(c.value_id))
      .map(c=>{
        const name=cardMeta[c.value_id]?.name||c.text||c.value_id;
        const key=shortKeyword(c.value_id);
        return {name,key,correct:Boolean(c.correct)};
      });

    if(items.length<3) return;

    const box=document.createElement('div');
    box.className='choice-compare';
    box.innerHTML='<div class="choice-compare-title">보기 비교</div>'+
      items.map(item=>'<div class="choice-compare-row'+(item.correct?' is-answer':'')+'"><b>'+
      (item.correct?'정답 · ':'')+item.name+'</b><span>'+ (item.key||'핵심 의미를 카드 탭에서 확인해 보세요.') +'</span></div>').join('');
    explain.insertAdjacentElement('afterend',box);
  }

  function addFeedbackButtons(q){
    const explain=document.getElementById('explain');
    if(!explain || !q) return;
    explain.parentElement?.querySelector('.explain-feedback-action')?.remove();

    addChoiceComparison(q);

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
    const compare=explain.parentElement?.querySelector('.choice-compare');
    (compare||explain).insertAdjacentElement('afterend',wrap);
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