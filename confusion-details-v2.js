(() => {
  const questions=window.TAROT_DATA?.questions || [];
  const suitFocus={W:'행동·열정·추진',C:'감정·관계·정서',S:'생각·판단·갈등',P:'현실·돈·일·성과'};

  function getCore(cardId){
    const pool=questions.filter(q=>q.card_id===cardId && q.difficulty==='초급' && q.explanation);
    const q=pool.find(q=>q.type==='카드→키워드') || pool[0];
    if(!q) return '';
    const text=String(q.explanation).trim();
    const match=text.match(/^.*?[.!?](?:\s|$)/);
    return (match?.[0] || text).trim();
  }

  function getKeywords(cardId){
    const q=questions.find(q=>q.card_id===cardId && q.type==='카드→키워드' && Array.isArray(q.choices));
    return q?.choices?.find(c=>c.correct)?.text || '';
  }

  function getRank(cardId){
    if(!/^[WCSP]\d{2}$/.test(cardId)) return '';
    const n=Number(cardId.slice(1));
    if(n===1) return '에이스';
    if(n<=10) return String(n);
    return ({11:'페이지',12:'나이트',13:'퀸',14:'킹'})[n] || '';
  }

  function getDistinction(a,b){
    const nameA=getCardName(a), nameB=getCardName(b);
    const kwA=getKeywords(a), kwB=getKeywords(b);
    const suitA=a?.[0], suitB=b?.[0];
    const rankA=getRank(a), rankB=getRank(b);

    if(rankA && rankA===rankB && suitA!==suitB){
      return `둘 다 <b>${rankA}</b>이지만 영역이 다릅니다. ${nameA}는 <b>${suitFocus[suitA]}</b>에서 ${escapeHtml(kwA || '해당 의미')}를, ${nameB}는 <b>${suitFocus[suitB]}</b>에서 ${escapeHtml(kwB || '해당 의미')}를 보여줍니다.`;
    }
    if(suitA===suitB && rankA && rankB){
      return `같은 <b>${SUIT_NAMES[suitA]}</b>라도 단계가 다릅니다. ${nameA}는 <b>${escapeHtml(kwA || '앞 카드의 흐름')}</b>, ${nameB}는 <b>${escapeHtml(kwB || '뒤 카드의 흐름')}</b>이 핵심입니다. 숫자가 달라지면서 상황이 어떻게 진행됐는지를 보세요.`;
    }
    if(kwA && kwB){
      return `${nameA}의 판단 기준은 <b>${escapeHtml(kwA)}</b>, ${nameB}의 판단 기준은 <b>${escapeHtml(kwB)}</b>입니다. 비슷한 분위기보다 ‘무엇을 다루는 카드인지’를 먼저 보면 구분이 쉬워집니다.`;
    }
    return `${nameA}와 ${nameB}는 비슷해 보여도 변화의 원인과 단계가 다릅니다. 위의 핵심 해석에서 행동·감정·생각·현실 중 어디에 초점이 있는지 비교해 보세요.`;
  }

  function renderRichConfusions(){
    const section=document.getElementById('confusionSection');
    const list=document.getElementById('confusionList');
    const reviewBtn=document.getElementById('confusionReviewBtn');
    if(!section || !list || typeof sessionConfusions==='undefined' || typeof progress==='undefined') return;

    const entries=Object.entries(sessionConfusions).sort((a,b)=>{
      const totalDiff=(progress.confusionPairs?.[b[0]]||0)-(progress.confusionPairs?.[a[0]]||0);
      return totalDiff || b[1].count-a[1].count;
    });
    if(!entries.length) return;

    section.style.display='block';
    if(reviewBtn) reviewBtn.style.display='block';
    list.innerHTML=entries.map(([key,info])=>{
      const [a,b]=key.split('|');
      const nameA=getCardName(a), nameB=getCardName(b);
      const coreA=getCore(a) || `${nameA}의 핵심 의미를 확인해 보세요.`;
      const coreB=getCore(b) || `${nameB}의 핵심 의미를 확인해 보세요.`;
      const total=progress.confusionPairs?.[key] || info.count;
      const sessionText=info.count>1 ? `이번 학습 ${info.count}회 · ` : '';
      return `
        <div class="confusion-card">
          <div class="confusion-top">
            <div class="confusion-pair">${escapeHtml(nameA)} <span>↔</span> ${escapeHtml(nameB)}</div>
            <div class="confusion-count">${sessionText}누적 ${total}회</div>
          </div>
          <div class="confusion-difference">
            <div class="confusion-meaning-row"><b>${escapeHtml(nameA)}</b><span>${escapeHtml(coreA)}</span></div>
            <div class="confusion-meaning-row"><b>${escapeHtml(nameB)}</b><span>${escapeHtml(coreB)}</span></div>
            <div class="confusion-point"><strong>구분 포인트</strong><p>${getDistinction(a,b)}</p></div>
          </div>
        </div>`;
    }).join('');
  }

  const nextBtn=document.getElementById('nextBtn');
  if(nextBtn){
    nextBtn.addEventListener('click',()=>setTimeout(()=>{
      const summary=document.getElementById('summary');
      if(summary && summary.style.display==='block') renderRichConfusions();
    },0));
  }

  window.addEventListener('pageshow',()=>setTimeout(renderRichConfusions,0));
})();
