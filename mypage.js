(()=>{
  const STORAGE_KEY='tarotstep_progress_v2';
  const SHARE_URL='https://eunneun.github.io/tarot-step/';
  const MAJOR_NAMES=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const SUITS={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const COURTS={11:'페이지',12:'나이트',13:'퀸',14:'킹'};

  function readProgress(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{return {};}}
  function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
  function cardName(id){
    if(typeof id!=='string') return id||'카드';
    if(/^M\d{2}$/.test(id)) return MAJOR_NAMES[Number(id.slice(1))]||id;
    if(/^[WCSP]\d{2}$/.test(id)){
      const n=Number(id.slice(1)), suit=SUITS[id[0]]||id[0];
      if(n===1) return `${suit} 에이스`;
      if(n>=11) return `${suit} ${COURTS[n]||n}`;
      return `${suit} ${n}`;
    }
    return id;
  }
  function isMastered(stat){
    if(!stat) return false;
    const attempts=Number(stat.attempts)||0, correct=Number(stat.correct)||0, streak=Number(stat.streak)||0;
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
  function getWeakCards(p){
    return Object.entries(p.cardStats||{})
      .filter(([,s])=>(Number(s.attempts)||0)>0 && !isMastered(s))
      .map(([id,s])=>({id,attempts:Number(s.attempts)||0,correct:Number(s.correct)||0,streak:Number(s.streak)||0}))
      .sort((a,b)=>{const ar=a.correct/a.attempts, br=b.correct/b.attempts; if(ar!==br) return ar-br; if(a.attempts!==b.attempts) return b.attempts-a.attempts; return a.streak-b.streak;})
      .slice(0,3);
  }
  function getConfusions(p){
    return Object.entries(p.confusionPairs||{})
      .filter(([key,count])=>key.includes('|') && Number(count)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,3)
      .map(([key,count])=>({cards:key.split('|'),count:Number(count)}));
  }
  function navIcon(type){
    const icons={
      home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.8 12 3.8l8.5 7v8.4a1 1 0 0 1-1 1h-5.2v-5.5H9.7v5.5H4.5a1 1 0 0 1-1-1z"/></svg>',
      report:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V10m7 9V5m7 14v-7"/></svg>',
      my:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5.5 20c.8-4 3.1-6 6.5-6s5.7 2 6.5 6"/></svg>'
    };
    return icons[type];
  }
  function ensureUI(){
    const app=document.querySelector('.app');
    if(!app || document.getElementById('reportView')) return;

    const report=document.createElement('section'); report.id='reportView'; report.className='subpage-view'; app.appendChild(report);
    const my=document.createElement('section'); my.id='myView'; my.className='subpage-view'; app.appendChild(my);

    const nav=document.createElement('nav');
    nav.className='bottom-nav';
    nav.innerHTML=`
      <button type="button" data-tab="home" class="active"><span class="nav-icon">${navIcon('home')}</span><span>홈</span></button>
      <button type="button" data-tab="report"><span class="nav-icon">${navIcon('report')}</span><span>리포트</span></button>
      <button type="button" data-tab="my"><span class="nav-icon">${navIcon('my')}</span><span>마이</span></button>`;
    document.body.appendChild(nav);

    nav.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-tab]'); if(!btn) return;
      const tab=btn.dataset.tab;
      app.dataset.page=tab;
      nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));
      if(tab==='report') renderReport();
      if(tab==='my') renderMy();
      window.scrollTo({top:0,behavior:'smooth'});
    });
  }
  function renderReport(){
    const view=document.getElementById('reportView'); if(!view) return;
    const p=readProgress(), level=levelInfo(p), total=Number(p.totalAnswered)||0, correct=Number(p.totalCorrect)||0;
    const accuracy=total?Math.round(correct/total*100):0, xp=Number(p.xp)||0, stats=p.cardStats||{};
    const seen=Object.keys(stats).filter(id=>(Number(stats[id]?.attempts)||0)>0).length;
    const learning=Math.max(0,seen-level.mastered), unseen=Math.max(0,78-seen), weak=getWeakCards(p), confusions=getConfusions(p);

    view.innerHTML=`
      <div class="subpage-title"><div><span>LEARNING REPORT</span><h2>나의 학습 리포트</h2></div><div class="level-chip">Lv.${level.level} ${level.name}</div></div>
      <div class="report-hero">
        <div class="report-hero-top"><div><strong>${level.mastered}</strong><span>/ 78장 숙련</span></div><b>${Math.round(level.mastered/78*100)}%</b></div>
        <div class="master-bar"><i style="width:${Math.round(level.mastered/78*100)}%"></i></div>
      </div>
      <div class="report-grid"><div><b>${total}</b><span>누적 문제</span></div><div><b>${total?accuracy+'%':'-'}</b><span>정답률</span></div><div><b>${xp}</b><span>XP</span></div></div>
      <section class="report-section"><div class="section-head"><h3>카드 학습 현황</h3><span>총 78장</span></div><div class="learning-grid"><div><b>${level.mastered}</b><span>숙련</span></div><div><b>${learning}</b><span>학습 중</span></div><div><b>${unseen}</b><span>아직 안 봄</span></div></div></section>
      <section class="report-section"><div class="section-head"><h3>나의 취약 카드 TOP3</h3><span>정답률 기준</span></div><div class="report-list">${weak.length?weak.map((w,i)=>{const rate=Math.round(w.correct/w.attempts*100);return `<div class="report-row"><div><div class="row-title">${i+1}. ${escapeHtml(cardName(w.id))}</div><div class="row-meta">${w.attempts}회 풀이 · ${w.correct}회 정답 · 연속 ${w.streak}</div></div><strong>${rate}%</strong></div>`;}).join(''):'<div class="empty-state">조금 더 학습하면 취약 카드가 자동으로 분석됩니다.</div>'}</div></section>
      <section class="report-section"><div class="section-head"><h3>자주 헷갈린 카드 TOP3</h3><span>누적 기준</span></div><div class="report-list">${confusions.length?confusions.map((c,i)=>`<div class="report-row"><div><div class="row-title">${i+1}. ${escapeHtml(cardName(c.cards[0]))} ↔ ${escapeHtml(cardName(c.cards[1]))}</div><div class="row-meta">두 카드의 차이를 집중해서 복습해 보세요.</div></div><strong>${c.count}회</strong></div>`).join(''):'<div class="empty-state">아직 누적된 혼동 카드가 없습니다.</div>'}</div></section>`;
  }
  async function shareApp(btn){
    const payload={text:'TarotStep에서 타로카드 78장을 문제로 익혀보세요.',url:SHARE_URL};
    try{
      if(navigator.share){await navigator.share(payload);return;}
      await navigator.clipboard.writeText(`TarotStep에서 타로카드 78장을 문제로 익혀보세요. ${SHARE_URL}`);
      const old=btn.textContent; btn.textContent='링크를 복사했습니다'; setTimeout(()=>btn.textContent=old,1600);
    }catch(err){if(err?.name!=='AbortError') console.error('[TarotStep] share failed',err);}
  }
  function renderMy(){
    const view=document.getElementById('myView'); if(!view) return;
    const user=window.TAROT_AUTH_USER;
    const avatar=user?.photoURL?`<img src="${escapeHtml(user.photoURL)}" alt="">`:'<span>🔮</span>';
    const accountName=user?(user.displayName||'TarotStep 학습자'):'게스트로 이용 중';
    const accountDesc=user?(user.email||'Google 계정으로 동기화 중'):'학습 기록은 현재 이 기기에 저장됩니다. 로그인하면 계정에 합쳐져 다른 기기에서도 이어서 학습할 수 있습니다.';
    view.innerHTML=`
      <div class="subpage-title"><div><span>MY TAROTSTEP</span><h2>마이</h2></div></div>
      <div class="account-card">
        <div class="account-profile"><div class="account-avatar">${avatar}</div><div><div class="account-name">${escapeHtml(accountName)}</div><div class="account-email">${escapeHtml(accountDesc)}</div></div></div>
        <button type="button" class="account-action primary" id="authActionBtn">${user?'Google 계정 로그아웃':'Google 로그인하고 기록 저장'}</button>
      </div>
      <section class="my-menu-card">
        <button type="button" class="my-menu-row" id="shareAppBtn"><span class="menu-icon">↗</span><span><b>TarotStep 공유하기</b><small>카카오톡, 메시지 등으로 친구에게 공유</small></span><span class="chevron">›</span></button>
      </section>`;

    document.getElementById('shareAppBtn')?.addEventListener('click',e=>shareApp(e.currentTarget));
    document.getElementById('authActionBtn')?.addEventListener('click',async()=>{
      const actions=window.TAROT_AUTH_ACTIONS;
      if(!actions){alert('로그인 기능을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');return;}
      if(window.TAROT_AUTH_USER) await actions.logout(); else await actions.login();
    });
  }

  ensureUI(); renderReport(); renderMy();
  window.addEventListener('tarotstep:auth-changed',()=>{if(document.querySelector('.app')?.dataset.page==='my') renderMy();});
  window.addEventListener('tarotstep:progress-saved',()=>{if(document.querySelector('.app')?.dataset.page==='report') renderReport();});
})();