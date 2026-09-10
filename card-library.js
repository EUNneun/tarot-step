(()=>{
  const data=window.TAROT_DATA||{};
  const questions=Array.isArray(data.questions)?data.questions:[];
  const notes=window.TAROTSTEP_CARD_NOTES||{};
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
  function keywordText(id){
    const q=questions.find(q=>q.card_id===id && q.type==='카드→키워드' && Array.isArray(q.choices));
    return q?.choices?.find(c=>c.correct)?.text||'';
  }
  function keywordList(id){
    const note=notes[id];
    if(Array.isArray(note?.keywords)&&note.keywords.length) return note.keywords;
    return keywordText(id).split(/[·,\/]/).map(v=>v.trim()).filter(Boolean).slice(0,6);
  }
  function compactFallback(id){
    const q=questions.find(q=>q.card_id===id && q.explanation);
    const text=String(q?.explanation||'').replace(/\s+/g,' ').trim();
    if(!text) return '';
    const first=text.split(/(?<=[.!?。])\s+/)[0]||text;
    return first.length>110?`${first.slice(0,107)}…`:first;
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
    view.innerHTML=`<div class="subpage-title"><div><span>TAROT CARDS</span><h2>카드</h2></div><div class="level-chip">78장</div></div><p class="card-library-intro">카드를 눌러 핵심 의미를 빠르게 확인해 보세요.</p><div class="card-library-grid">${ids.map(id=>{const url=imageUrl(id),fb=fallbackUrl(id);return `<button type="button" class="card-library-item" data-card-id="${id}">${url?`<img src="${url}" alt="${esc(cardName(id))}" loading="lazy"${fb?` onerror="this.onerror=null;this.src='${fb}'"`:''}>`:''}<span>${esc(cardName(id))}</span></button>`;}).join('')}</div>`;
    view.querySelectorAll('[data-card-id]').forEach(btn=>btn.addEventListener('click',()=>renderDetail(btn.dataset.cardId)));
  }
  function renderDetail(id){
    const view=document.getElementById('cardLibraryView'); if(!view) return;
    const name=cardName(id),url=imageUrl(id),fb=fallbackUrl(id),note=notes[id],keywords=keywordList(id),fallback=compactFallback(id);
    const chips=keywords.length?`<div class="card-keywords">${keywords.map(k=>`<span>${esc(k)}</span>`).join('')}</div>`:'';
    const workbookSections=note?`
      ${note.symbols?.length?`<section class="card-note-block"><h3>이미지 포인트</h3><p>${esc(note.symbols.join(' · '))}</p></section>`:''}
      ${note.imageMeaning?`<section class="card-note-block"><h3>이미지 해석</h3><p>${esc(note.imageMeaning)}</p></section>`:''}
      <section class="card-reading-grid">
        ${note.love?`<div><b>연애</b><p>${esc(note.love)}</p></div>`:''}
        ${note.work?`<div><b>일·커리어</b><p>${esc(note.work)}</p></div>`:''}
        ${note.mind?`<div><b>감정·심리</b><p>${esc(note.mind)}</p></div>`:''}
      </section>
      ${note.line?`<blockquote class="card-one-line">“${esc(note.line)}”</blockquote>`:''}`:
      `<section class="card-note-block"><h3>핵심 해설</h3><p>${esc(fallback||'이 카드는 핵심 키워드를 중심으로 먼저 익혀보세요.')}</p></section>`;
    view.innerHTML=`<button type="button" class="card-library-back" id="cardLibraryBack">‹ 카드 목록</button><article class="card-detail"><div class="card-detail-visual">${url?`<img src="${url}" alt="${esc(name)}"${fb?` onerror="this.onerror=null;this.src='${fb}'"`:''}>`:''}</div><div class="card-detail-head"><span>${esc(id)}</span><h2>${esc(name)}</h2>${chips}</div>${workbookSections}</article>`;
    document.getElementById('cardLibraryBack')?.addEventListener('click',renderGrid);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function showCards(){setActive();renderGrid();}

  ensureView();
  window.addEventListener('tarotstep:deck-changed',()=>{if(document.querySelector('.app')?.dataset.page==='cards') renderGrid();});
})();