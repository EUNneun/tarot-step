(()=>{
  if(typeof render!=='function') return;

  const imageBase='https://petaloverflow.github.io/tarot-api/cards/';
  const suitCode={W:'wa',C:'cu',S:'sw',P:'pe'};

  function imageUrl(cardId){
    if(/^M\d{2}$/.test(cardId||'')) return `${imageBase}ar${cardId.slice(1)}.jpg`;
    if(/^[WCSP]\d{2}$/.test(cardId||'')) return `${imageBase}${suitCode[cardId[0]]}${cardId.slice(1)}.jpg`;
    return '';
  }

  function parseConsultation(q){
    const lines=String(q.prompt||'').split('\n').map(v=>v.trim()).filter(Boolean);
    const roleIndex=lines.findIndex(line=>line.includes(':') && line.includes('·'));
    if(roleIndex<0) return null;
    const roleLine=lines[roleIndex];
    const roles=roleLine.split('·').map(part=>{
      const i=part.indexOf(':');
      return i<0?null:{role:part.slice(0,i).trim(),name:part.slice(i+1).trim()};
    }).filter(Boolean);
    return {
      intro:lines.slice(0,roleIndex).join('\n'),
      followup:lines.slice(roleIndex+1).join('\n') || '가장 적절한 상담은?',
      roles
    };
  }

  function enhanceConsultation(){
    document.querySelector('.consultation-spread')?.remove();
    document.querySelector('.consultation-followup')?.remove();
    const questionEl=document.getElementById('question');
    questionEl?.classList.remove('consultation-question');

    const q=session?.[idx];
    if(!q || q.type!=='오늘의 상담') return;
    const parsed=parseConsultation(q);
    if(!parsed || !questionEl) return;

    questionEl.textContent=parsed.intro || q.prompt;
    questionEl.classList.add('consultation-question');

    const spread=document.createElement('div');
    spread.className='consultation-spread';
    const cardIds=Array.isArray(q.card_ids)?q.card_ids:[];
    spread.innerHTML=parsed.roles.slice(0,3).map((item,i)=>{
      const id=cardIds[i]||'';
      const url=imageUrl(id);
      return `<div class="consultation-card">${url?`<img src="${url}" alt="${item.name}" loading="lazy">`:''}<span class="consultation-role">${item.role}</span><strong class="consultation-name">${item.name}</strong></div>`;
    }).join('');
    questionEl.insertAdjacentElement('afterend',spread);

    const follow=document.createElement('div');
    follow.className='consultation-followup';
    follow.textContent=parsed.followup;
    spread.insertAdjacentElement('afterend',follow);
  }

  const baseRender=render;
  render=function(){
    baseRender();
    enhanceConsultation();
  };

  enhanceConsultation();
})();