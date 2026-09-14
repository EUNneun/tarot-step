(()=>{
  const qMap=new Map((window.TAROT_DATA?.questions||[]).map(q=>[q.id,q]));
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function enhanceCard(card){
    const meta=[...card.querySelectorAll('.feedback-meta span')].map(el=>el.textContent.trim());
    const qid=meta.find(v=>/^Q\d+/.test(v));
    if(!qid) return;
    const q=qMap.get(qid);
    if(!q?.choices?.length) return;

    let wrap=card.querySelector('.admin-choice-list');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='admin-choice-list';
      const explain=card.querySelector('.feedback-explain');
      const legacy=card.querySelector('.feedback-choices');
      if(legacy) legacy.replaceWith(wrap);
      else if(explain) explain.before(wrap);
      else card.appendChild(wrap);
    }

    wrap.innerHTML=`<div class="admin-choice-title">보기</div>${q.choices.map((c,i)=>{
      const no=c.no??(i+1);
      return `<div class="admin-choice-item ${c.correct?'correct':''}">
        <span class="admin-choice-no">${esc(no)}</span>
        <span class="admin-choice-text">${esc(c.text||c.value_id||'')}</span>
        ${c.correct?'<span class="admin-choice-badge">정답</span>':''}
      </div>`;
    }).join('')}`;
  }

  function enhanceAll(){
    document.querySelectorAll('.feedback-card').forEach(enhanceCard);
  }

  const list=document.getElementById('adminList');
  if(!list) return;
  const observer=new MutationObserver(enhanceAll);
  observer.observe(list,{childList:true,subtree:true});
  enhanceAll();
})();