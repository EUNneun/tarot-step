(()=>{
  const STORAGE_KEY='tarotstep_progress_v2';
  const MAJOR_NAMES=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const SUITS={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const COURTS={11:'페이지',12:'나이트',13:'퀸',14:'킹'};

  function readProgress(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{return {};}
  }
  function cardName(id){
    if(typeof id!=='string') return id||'카드';
    if(/^M\d{2}$/.test(id)) return MAJOR_NAMES[Number(id.slice(1))]||id;
    if(/^[WCSP]\d{2}$/.test(id)){
      const n=Number(id.slice(1));
      const suit=SUITS[id[0]]||id[0];
      if(n===1) return `${suit} 에이스`;
      if(n>=11) return `${suit} ${COURTS[n]||n}`;
      return `${suit} ${n}`;
    }
    return id;
  }
  function isMastered(stat){
    if(!stat) return false;
    const attempts=Number(stat.attempts)||0;
    const correct=Number(stat.correct)||0;
    const streak=Number(stat.streak)||0;
    return attempts>=3 && correct/attempts>=.75 && streak>=2;
  }
  function levelInfo(p){
    const mastered=Object.values(p.cardStats||{}).filter(isMastered).length;
    let level=1,name='입문';
    if(mastered>=78){level=6;name='마스터';}
    else if(mastered>=65){level=5;name='고급';}
    else if(mastered>=45){level=4;name='숙련';}
    else if(mastered>=25){level=3;name='성장';}
    else if(mastered>=10){level=2;name='기초';}
    return {level,name,mastered};
  }
  function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function getWeakCards(p){
    return Object.entries(p.cardStats||{})
      .filter(([,s])=>(Number(s.attempts)||0)>0 && !isMastered(s))
      .map(([id,s])=>({id,attempts:Number(s.attempts)||0,correct:Number(s.correct)||0,streak:Number(s.streak)||0}))
      .sort((a,b)=>{
        const ar=a.correct/a.attempts, br=b.correct/b.attempts;
        if(ar!==br) return ar-br;
        if(a.attempts!==b.attempts) return b.attempts-a.attempts;
        return a.streak-b.streak;
      }).slice(0,3);
  }
  function getConfusions(p){
    return Object.entries(p.confusionPairs||{})
      .filter(([key,count])=>key.includes('|') && Number(count)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,3)
      .map(([key,count])=>({cards:key.split('|'),count:Number(count)}));
  }
  function ensureUI(){
    const app=document.querySelector('.app');
    if(!app || document.getElementById('mypageView')) return;
    const view=document.createElement('section');
    view.id='mypageView';
    view.className='mypage-view';
    app.appendChild(view);

    const nav=document.createElement('nav');
    nav.className='bottom-nav';
    nav.innerHTML=`<button type="button" data-tab="learn" class="active"><span>🃏</span>학습</button><button type="button" data-tab="mypage"><span>👤</span>마이</button>`;
    document.body.appendChild(nav);
    nav.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-tab]');
      if(!btn) return;
      const my=btn.dataset.tab==='mypage';
      app.classList.toggle('mypage-open',my);
      nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
      if(my){render();window.scrollTo({top:0,behavior:'smooth'});}
    });
  }
  function render(){
    const view=document.getElementById('mypageView');
    if(!view) return;
    const p=readProgress();
    const level=levelInfo(p);
    const total=Number(p.totalAnswered)||0;
    const correct=Number(p.totalCorrect)||0;
    const accuracy=total?Math.round(correct/total*100):0;
    const xp=Number(p.xp)||0;
    const stats=p.cardStats||{};
    const seen=Object.keys(stats).filter(id=>(Number(stats[id]?.attempts)||0)>0).length;
    const learning=Math.max(0,seen-level.mastered);
    const unseen=Math.max(0,78-seen);
    const weak=getWeakCards(p);
    const confusions=getConfusions(p);
    const user=window.TAROT_AUTH_USER;
    const displayName=user?.displayName||'TarotStep 학습자';
    const email=user?.email||'Google 로그인 시 여러 기기에서 동기화됩니다.';
    const avatar=user?.photoURL?`<img src="${escapeHtml(user.photoURL)}" alt="">`:'🔮';

    view.innerHTML=`
      <div class="mypage-hero">
        <div class="mypage-profile"><div class="mypage-avatar">${avatar}</div><div><div class="mypage-name">${escapeHtml(displayName)}</div><div class="mypage-email">${escapeHtml(email)}</div></div></div>
        <div class="mypage-level-row"><div><div class="mypage-level">Lv.${level.level} ${level.name}</div><div class="mypage-level-sub">숙련 카드 ${level.mastered}/78</div></div><span class="mypage-badge">${level.mastered===78?'전체 숙련':'학습 중'}</span></div>
        <div class="mypage-master-bar"><i style="width:${Math.round(level.mastered/78*100)}%"></i></div>
      </div>

      <div class="mypage-grid">
        <div class="mypage-stat"><b>${total}</b><span>누적 문제</span></div>
        <div class="mypage-stat"><b>${total?accuracy+'%':'-'}</b><span>정답률</span></div>
        <div class="mypage-stat"><b>${xp}</b><span>XP</span></div>
      </div>

      <section class="mypage-section"><div class="mypage-section-head"><h3>카드 학습 현황</h3><span class="mypage-section-note">총 78장</span></div>
        <div class="mypage-learning-grid"><div class="mypage-learning-box"><b>${level.mastered}</b><span>숙련</span></div><div class="mypage-learning-box"><b>${learning}</b><span>학습 중</span></div><div class="mypage-learning-box"><b>${unseen}</b><span>아직 안 봄</span></div></div>
      </section>

      <section class="mypage-section"><div class="mypage-section-head"><h3>나의 취약 카드 TOP3</h3><span class="mypage-section-note">정답률 기준</span></div>
        <div class="mypage-card-list">${weak.length?weak.map((w,i)=>{const rate=Math.round(w.correct/w.attempts*100);return `<div class="mypage-card-row"><div><div class="mypage-card-name">${i+1}. ${escapeHtml(cardName(w.id))}</div><div class="mypage-card-meta">${w.attempts}회 풀이 · ${w.correct}회 정답 · 연속 ${w.streak}</div></div><div class="mypage-rate">${rate}%</div></div>`;}).join(''):`<div class="mypage-empty">아직 취약 카드를 판단할 만큼 학습 데이터가 쌓이지 않았습니다.</div>`}</div>
      </section>

      <section class="mypage-section"><div class="mypage-section-head"><h3>자주 헷갈린 카드 TOP3</h3><span class="mypage-section-note">누적 오답 선택 기준</span></div>
        <div class="mypage-card-list">${confusions.length?confusions.map((c,i)=>`<div class="mypage-card-row"><div><div class="mypage-card-name">${i+1}. ${escapeHtml(cardName(c.cards[0]))} ↔ ${escapeHtml(cardName(c.cards[1]))}</div><div class="mypage-card-meta">두 카드를 구분해서 다시 복습해 보세요.</div></div><div class="mypage-rate">${c.count}회</div></div>`).join(''):`<div class="mypage-empty">아직 누적된 혼동 카드가 없습니다. 틀린 선택이 쌓이면 자동으로 분석됩니다.</div>`}</div>
      </section>`;
  }

  ensureUI();
  render();
  window.addEventListener('tarotstep:auth-changed',render);
  window.addEventListener('tarotstep:progress-saved',()=>{if(document.querySelector('.app')?.classList.contains('mypage-open')) render();});
})();