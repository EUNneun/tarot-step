(()=>{
  const data=window.TAROT_DATA||{};
  const questions=Array.isArray(data.questions)?data.questions:[];
  const MAJOR_NAMES=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const SUITS={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const COURTS={11:'페이지',12:'나이트',13:'퀸',14:'킹'};
  const ids=[...Array.from({length:22},(_,i)=>`M${String(i).padStart(2,'0')}`),...['W','C','S','P'].flatMap(s=>Array.from({length:14},(_,i)=>`${s}${String(i+1).padStart(2,'0')}`))];

  function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function cardName(id){
    if(/^M\d{2}$/.test(id)) return MAJOR_NAMES[Number(id.slice(1))]||id;
    const suit=SUITS[id?.[0]]||id?.[0]||''; const n=Number(id?.slice(1));
    if(n===1) return `${suit} 에이스`;
    if(n>=11) return `${suit} ${COURTS[n]||n}`;
    return `${suit} ${n}`;
  }
  function imageUrl(id){return typeof window.TAROTSTEP_CARD_IMAGE==='function'?window.TAROTSTEP_CARD_IMAGE(id):'';}
  function fallbackUrl(id){return typeof window.TAROTSTEP_DEFAULT_CARD_IMAGE==='function'?window.TAROTSTEP_DEFAULT_CARD_IMAGE(id):'';}
  function related(id){return questions.filter(q=>q.card_id===id || (Array.isArray(q.card_ids)&&q.card_ids.includes(id)));}
  function uniqueExplanations(id){
    const seen=new Set();
    return related(id).map(q=>String(q.explanation||'').trim()).filter(text=>text && !seen.has(text) && seen.add(text)).slice(0,8);
  }
  function keywordText(id){
    const q=questions.find(q=>q.card_id===id && q.type==='카드→키워드' && Array.isArray(q.choices));
    return q?.choices?.find(c=>c.correct)?.text||'';
  }
  function navIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/></svg>';}

  function ensureView(){
    const app=document.querySelector('.app'); const nav=document.querySelector('.bottom-nav');
    if(!app||!nav||document.getElementById('cardLibraryView')) return;
    const view=document.createElement('section'); view.id='cardLibraryView'; view.className='subpage-view card-library-view'; app.appendChild(view);
    const btn=document.createElement('button'); btn.type='button'; btn.dataset.tab='cards'; btn.innerHTML=`<span class="nav-icon">${navIcon()}</span><span>카드</span>`;
    const report=nav.querySelector('[data-tab="report"]'); nav.insertBefore(btn,report||null);
    nav.style.gridTemplateColumns='repeat(4,1fr)';
    btn.addEventListener('click',()=>showCards());
    renderGrid();
  }
  function setActive(){
    const app=document.querySelector('.app'); const nav=document.querySelector('.bottom-nav');
    if(!app||!nav) return;
    app.dataset.page='cards';
    nav.querySelectorAll('button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='cards'));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function renderGrid(){
    const view=document.getElementById('cardLibraryView'); if(!view) return;
    view.innerHTML=`<div class="subpage-title"><div><span>TAROT CARDS</span><h2>카드</h2></div><div class="level-chip">78장</div></div><p class="card-library-intro">카드를 눌러 핵심 키워드와 문제에서 사용된 해설을 모아보세요.</p><div class="card-library-grid">${ids.map(id=>{const url=imageUrl(id),fb=fallbackUrl(id);return `<button type="button" class="card-library-item" data-card-id="${id}">${url?`<img src="${url}" alt="${esc(cardName(id))}" loading="lazy"${fb?` onerror="this.onerror=null;this.src='${fb}'"`:''}>`:''}<span>${esc(cardName(id))}</span></button>`;}).join('')}</div>`;
    view.querySelectorAll('[data-card-id]').forEach(btn=>btn.addEventListener('click',()=>renderDetail(btn.dataset.cardId)));
  }
  function renderDetail(id){
    const view=document.getElementById('cardLibraryView'); if(!view) return;
    const name=cardName(id),url=imageUrl(id),fb=fallbackUrl(id),keyword=keywordText(id),exps=uniqueExplanations(id);
    view.innerHTML=`<button type="button" class="card-library-back" id="cardLibraryBack">‹ 카드 목록</button><article class="card-detail"><div class="card-detail-visual">${url?`<img src="${url}" alt="${esc(name)}"${fb?` onerror="this.onerror=null;this.src='${fb}'"`:''}>`:''}</div><div class="card-detail-head"><span>${esc(id)}</span><h2>${esc(name)}</h2>${keyword?`<p>${esc(keyword)}</p>`:''}</div><section class="card-detail-section"><h3>카드 해설 모아보기</h3>${exps.length?exps.map((text,i)=>`<div class="card-explanation"><b>${String(i+1).padStart(2,'0')}</b><p>${esc(text)}</p></div>`).join(''):'<div class="empty-state">아직 이 카드에 연결된 해설이 없습니다.</div>'}</section></article>`;
    document.getElementById('cardLibraryBack')?.addEventListener('click',renderGrid);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showCards(){setActive();renderGrid();}

  ensureView();
  window.addEventListener('tarotstep:deck-changed',()=>{if(document.querySelector('.app')?.dataset.page==='cards') renderGrid();});
})();