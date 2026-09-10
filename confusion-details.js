(() => {
  const questions=window.TAROT_DATA?.questions || [];
  const suitFocus={
    W:'행동·열정·추진력',
    C:'감정·관계·정서',
    S:'생각·판단·갈등',
    P:'현실·돈·일·성과'
  };

  function cardCore(cardId){
    const candidates=questions.filter(q => q.card_id===cardId && q.difficulty==='초급' && q.explanation);
    if(!candidates.length) return '';
    const preferred=candidates.find(q => q.type==='카드→키워드') || candidates[0];
    const text=String(preferred.explanation).trim();
    const first=text.match(/^.*?[.!?](?:\s|$)/)?.[0] || text;
    return first.trim();
  }

  function rankLabel(cardId){
    if(!/^[WCSP]\d{2}$/.test(cardId)) return '';
    const n=Number(cardId.slice(1));
    if(n===1) return '에이스';
    if(n<=10) return String(n);
    return ({11:'페이지',12:'나이트',13:'퀸',14:'킹'})[n] || '';
  }

  function distinction(cardA,cardB){
    const aSuit=cardA?.[0], bSuit=cardB?.[0];
    const aRank=rankLabel(cardA), bRank=rankLabel(cardB);
    const aName=getCardName(cardA), bName=getCardName(cardB);

    if(aRank && aRank===bRank && aSuit!==bSuit){
      return `둘 다 ${aRank}의 공통 흐름을 가지지만, ${aName}는 <b>${suitFocus[aSuit]}</b> 쪽에서 나타나고 ${bName}는 <b>${suitFocus[bSuit]}</b> 쪽에서 나타납니다. 같은 숫자라도 먼저 ‘어느 슈트의 문제인가’를 보면 구분이 쉬워집니다.`;
    }
    if(aSuit===bSuit && aRank && bRank){
      return `둘 다 ${SUIT_NAMES[aSuit]}의 영역을 다루지만 단계가 다릅니다. <b>${aName}</b>의 상황이 어디까지 진행됐는지와 <b>${bName}</b>의 상황이 어디까지 진행됐는지를 비교해서 읽어보세요.`;
    }
    if(aSuit!=='M' && bSuit!=='M' && suitFocus[aSuit] && suitFocus[bSuit]){
      return `${aName}는 <b>${suitFocus[aSuit]}</b>의 문제이고, ${bName}는 <b>${suitFocus[bSuit]}</b>의 문제입니다. 비슷해 보여도 카드가 말하는 영역부터 다릅니다.`;
    }
    return `두 카드 모두 비슷한 분위기로 보일 수 있지만, <b>${aName}</b>와 <b>${bName}</b>가 말하는 변화의 원인과 단계가 다릅니다. 아래 핵심 해석에서 ‘무엇 때문에 이런 상태가 되었는지’를 비교해 보세요.`;
  }

  getCardDifference=function(cardA,cardB){
    const nameA=getCardName(cardA);
    const nameB=getCardName(cardB);
    const coreA=cardCore(cardA);
    const coreB=cardCore(cardB);

    return `
      <div class="confusion-meaning">
        <div class="confusion-meaning-row">
          <b>${escapeHtml(nameA)}</b>
          <span>${coreA ? escapeHtml(coreA) : '이 카드의 핵심 의미를 다시 확인해 보세요.'}</span>
        </div>
        <div class="confusion-meaning-row">
          <b>${escapeHtml(nameB)}</b>
          <span>${coreB ? escapeHtml(coreB) : '이 카드의 핵심 의미를 다시 확인해 보세요.'}</span>
        </div>
      </div>
      <div class="confusion-point"><strong>구분 포인트</strong><p>${distinction(cardA,cardB)}</p></div>
    `;
  };
})();
