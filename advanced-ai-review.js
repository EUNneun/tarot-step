(()=>{
  const API_URL='https://tarot-step-mw2v.vercel.app/api/review-tarot';

  function cardInfo(card){
    return {
      role:card.querySelector('.advanced-card-role')?.textContent?.trim()||'카드',
      name:card.querySelector('.advanced-card-name')?.textContent?.trim()||''
    };
  }

  function ensureStyles(){
    if(document.getElementById('advancedAiStyles')) return;
    const style=document.createElement('style');
    style.id='advancedAiStyles';
    style.textContent=`
      .advanced-ai-result{margin-top:16px;border:1px solid #e1e5f0;border-radius:16px;padding:14px;background:#fff}
      .advanced-ai-result.loading{color:#71798d;font-size:13px;line-height:1.6}
      .advanced-ai-score{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .advanced-ai-score b{font-size:15px;color:#252b3c}.advanced-ai-score strong{font-size:24px;color:#5d50c9}
      .advanced-ai-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
      .advanced-ai-metric{background:#f7f8fc;border-radius:12px;padding:10px}.advanced-ai-metric span{display:block;font-size:11px;color:#7b8396;margin-bottom:3px}.advanced-ai-metric b{font-size:15px;color:#2b3142}
      .advanced-ai-section{margin-top:12px}.advanced-ai-section h4{font-size:13px;margin:0 0 7px;color:#30364a}.advanced-ai-section ul{margin:0;padding-left:18px}.advanced-ai-section li,.advanced-ai-section p{font-size:12px;line-height:1.65;color:#626a7d;margin:3px 0}
      .advanced-ai-improved{background:#f3f1ff;border-radius:13px;padding:12px 13px;font-size:12px;line-height:1.7;color:#4c466f}
      .advanced-ai-error{background:#fff1f1;border:1px solid #f2cece;color:#9a4b4b;border-radius:12px;padding:11px 12px;font-size:12px;line-height:1.55}
    `;
    document.head.appendChild(style);
  }

  function renderResult(data){
    const feedback=document.getElementById('advancedFeedback');
    if(!feedback) return;
    let box=document.getElementById('advancedAiResult');
    if(!box){box=document.createElement('div');box.id='advancedAiResult';box.className='advanced-ai-result';feedback.prepend(box);}
    const list=v=>(Array.isArray(v)?v:[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('');
    box.className='advanced-ai-result';
    box.innerHTML=`
      <div class="advanced-ai-score"><b>AI 첨삭 결과</b><strong>${Number(data.score)||0}점</strong></div>
      <div class="advanced-ai-grid">
        <div class="advanced-ai-metric"><span>카드 이해</span><b>${Number(data.cardUnderstanding)||0}</b></div>
        <div class="advanced-ai-metric"><span>카드 연결</span><b>${Number(data.connection)||0}</b></div>
        <div class="advanced-ai-metric"><span>질문 맥락</span><b>${Number(data.contextFit)||0}</b></div>
        <div class="advanced-ai-metric"><span>단정 조절</span><b>${Number(data.overInterpretation)||0}</b></div>
      </div>
      <div class="advanced-ai-section"><h4>잘한 점</h4><ul>${list(data.goodPoints)}</ul></div>
      <div class="advanced-ai-section"><h4>놓친 점</h4><ul>${list(data.missedPoints)}</ul></div>
      <div class="advanced-ai-section"><h4>첨삭</h4><p>${escapeHtml(data.feedback||'')}</p></div>
      <div class="advanced-ai-section"><h4>더 균형 잡힌 해석</h4><div class="advanced-ai-improved">${escapeHtml(data.improvedReading||'')}</div></div>`;
  }

  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  async function requestReview(button){
    const answer=document.getElementById('advancedAnswer')?.value?.trim()||'';
    if(answer.length<30) return;
    const question=document.querySelector('.advanced-question')?.textContent?.trim()||'';
    const context=document.querySelector('.advanced-context')?.textContent?.trim()||'';
    const cards=[...document.querySelectorAll('.advanced-card')].map(cardInfo);
    const feedback=document.getElementById('advancedFeedback');
    if(feedback) feedback.classList.add('show');

    let box=document.getElementById('advancedAiResult');
    if(!box&&feedback){box=document.createElement('div');box.id='advancedAiResult';feedback.prepend(box);}
    if(box){box.className='advanced-ai-result loading';box.textContent='AI가 카드 의미와 연결 흐름을 읽고 있어요…';}

    const oldText=button.textContent;
    button.disabled=true;
    button.textContent='AI 첨삭 중…';
    try{
      const response=await fetch(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question,context,cards,answer})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.detail||data.error||'AI 첨삭 요청에 실패했습니다.');
      renderResult(data);
    }catch(error){
      if(box){box.className='advanced-ai-error';box.textContent=`AI 첨삭 연결 오류: ${error.message}`;}
    }finally{
      button.disabled=false;
      button.textContent=oldText;
    }
  }

  function bind(){
    ensureStyles();
    const btn=document.getElementById('reviewAdvanced');
    if(!btn||btn.dataset.aiBound==='1') return;
    btn.dataset.aiBound='1';
    btn.textContent='AI 첨삭 받기';
    btn.addEventListener('click',()=>requestReview(btn));
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(bind));
  observer.observe(document.body,{childList:true,subtree:true});
  bind();
})();