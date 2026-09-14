(()=>{
  if(!window.TAROT_DATA?.questions) return;

  const questions=window.TAROT_DATA.questions;
  const explain=document.getElementById('explain');
  const feedback=document.getElementById('feedback');
  const questionEl=document.getElementById('question');
  if(!explain||!feedback||!questionEl) return;

  const MAJOR_NAMES=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const SUIT_NAMES={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const COURT_NAMES={11:'페이지',12:'나이트',13:'퀸',14:'킹'};

  const isCardId=v=>typeof v==='string'&&/^[MWCSP]\d{2}$/.test(v);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function cardName(id){
    if(!isCardId(id)) return id||'';
    if(id[0]==='M') return MAJOR_NAMES[Number(id.slice(1))]||id;
    const suit=SUIT_NAMES[id[0]]||id[0];
    const no=Number(id.slice(1));
    if(no===1) return `${suit} 에이스`;
    if(no>=2&&no<=10) return `${suit} ${no}`;
    return `${suit} ${COURT_NAMES[no]||no}`;
  }

  function cardKeywords(id){
    const q=questions.find(x=>x.card_id===id&&x.type==='카드→키워드'&&Array.isArray(x.choices));
    const answer=q?.choices?.find(c=>c.correct);
    return answer?.text||'';
  }

  function isCardChoiceQuestion(q){
    if(!q?.choices?.length) return false;
    return q.choices.every(c=>isCardId(c.value_id)&&String(c.text||'').trim()===cardName(c.value_id));
  }

  function currentQuestion(){
    const prompt=questionEl.textContent.trim();
    return questions.find(q=>String(q.prompt||'').trim()===prompt&&isCardChoiceQuestion(q));
  }

  function appendWrongCardNotes(){
    document.getElementById('wrongCardNotes')?.remove();
    if(feedback.style.display==='none') return;

    const q=currentQuestion();
    if(!q) return;

    const wrong=q.choices.filter(c=>!c.correct&&isCardId(c.value_id));
    if(!wrong.length) return;

    const wrap=document.createElement('div');
    wrap.id='wrongCardNotes';
    wrap.className='wrong-card-notes';
    wrap.innerHTML=`<div class="wrong-card-title">오답 카드 비교</div>${wrong.map(c=>{
      const name=cardName(c.value_id);
      const keywords=cardKeywords(c.value_id);
      return `<div class="wrong-card-row"><b>${esc(name)}</b><span>${esc(keywords||'핵심 의미를 다시 확인해 보세요.')}</span></div>`;
    }).join('')}`;
    explain.insertAdjacentElement('afterend',wrap);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(appendWrongCardNotes));
  observer.observe(feedback,{attributes:true,attributeFilter:['style'],childList:true,subtree:true});

  document.getElementById('nextBtn')?.addEventListener('click',()=>document.getElementById('wrongCardNotes')?.remove());
})();