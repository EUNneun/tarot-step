(()=>{
  const STORAGE_KEY='tarotstep_progress_v2';
  const app=document.querySelector('.app');
  if(!app || document.getElementById('homeDashboard')) return;

  let learningActive=false;
  const MAJOR_NAMES=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const SUITS={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const COURTS={11:'페이지',12:'나이트',13:'퀸',14:'킹'};

  function readProgress(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch{return {};}}
  function cardName(id){if(/^M\d{2}$/.test(id||'')) return MAJOR_NAMES[Number(id.slice(1))]||id;if(/^[WCSP]\d{2}$/.test(id||'')){const suit=SUITS[id[0]]||id[0],no=Number(id.slice(1));if(no===1)return `${suit} 에이스`;if(no>=11)return `${suit} ${COURTS[no]||no}`;return `${suit} ${no}`;}return id||'카드';}
  function cardGlyph(id){if((id||'')[0]==='W')return '✦';if((id||'')[0]==='C')return '♡';if((id||'')[0]==='S')return '◇';if((id||'')[0]==='P')return '☆';return '☾';}
  function isMastered(stat){if(!stat)return false;const attempts=Number(stat.attempts)||0,correct=Number(stat.correct)||0,streak=Number(stat.streak)||0;return attempts>=3&&correct/attempts>=.75&&streak>=2;}
  function levelInfo(p){const mastered=Object.values(p.cardStats||{}).filter(isMastered).length;let level=1,name='입문',nextTarget=10;if(mastered>=78){level=6;name='마스터';nextTarget=78;}else if(mastered>=65){level=5;name='고급';nextTarget=78;}else if(mastered>=45){level=4;name='숙련';nextTarget=65;}else if(mastered>=25){level=3;name='성장';nextTarget=45;}else if(mastered>=10){level=2;name='기초';nextTarget=25;}return {level,name,mastered,nextTarget};}
  function topConfusedCards(p){const counts={};Object.entries(p.confusionPairs||{}).forEach(([key,count])=>{if(!key.includes('|')||Number(count)<=0)return;key.split('|').forEach(id=>counts[id]=(counts[id]||0)+Number(count));});return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,count])=>({id,count}));}
  function accuracyFor(p,id){const s=p.cardStats?.[id];const attempts=Number(s?.attempts)||0;return attempts?Math.round((Number(s.correct)||0)/attempts*100):null;}
  function achievement(done,icon,title,sub){return `<div class="achievement-item${done?' done':''}"><div class="achievement-icon">${icon}</div><b>${title}</b><span>${sub}</span></div>`;}

  const dashboard=document.createElement('section');dashboard.id='homeDashboard';dashboard.className='home-dashboard';document.querySelector('.topbar')?.insertAdjacentElement('afterend',dashboard);

  function renderDashboard(){
    const p=readProgress(),level=levelInfo(p);const total=Number(p.totalAnswered)||0,correct=Number(p.totalCorrect)||0,xp=Number(p.xp)||0;const accuracy=total?Math.round(correct/total*100):0;const levelBase=level.level===1?0:level.level===2?10:level.level===3?25:level.level===4?45:level.level===5?65:78;const levelSpan=Math.max(1,level.nextTarget-levelBase);const levelPct=level.mastered>=78?100:Math.max(0,Math.min(100,Math.round((level.mastered-levelBase)/levelSpan*100)));const remain=Math.max(0,level.nextTarget-level.mastered);const wrongIds=Object.keys(p.wrongQueue||{}).filter(id=>Number(p.wrongQueue[id])>0);const wrongCount=Math.min(10,wrongIds.length);const confused=topConfusedCards(p);const cards=confused.length?confused.map(item=>{const acc=accuracyFor(p,item.id);return `<button type="button" class="confused-card" data-card-id="${item.id}"><div class="mini-tarot">${cardGlyph(item.id)}</div><b>${cardName(item.id)}</b><span>${acc===null?'학습 중':`정답률 ${acc}%`}</span></button>`;}).join(''):'<div class="home-empty">아직 헷갈린 카드가 없어요.<br>문제를 풀면 자동으로 모아드려요.</div>';

    dashboard.innerHTML=`
      <div class="home-status-card"><div class="home-level-ring" style="--level-progress:${levelPct}%"><span><b>Lv.${level.level}</b>${level.name}</span></div><div class="home-status-stats"><div><b>${level.mastered}/78</b><span>숙련 카드</span></div><div><b>${total}</b><span>누적 문제</span></div><div><b>${total?accuracy+'%':'-'}</b><span>정답률</span></div></div><div class="home-next-level">${level.mastered>=78?'78장 모두 숙련했어요!':`다음 레벨까지 ${remain}장의 카드가 더 필요해요.`}</div></div>
      <section class="daily-card"><div class="daily-card-head"><strong>오늘의 학습</strong><span>약 5분</span></div><div class="daily-card-count">10문제</div><div class="daily-card-sub">오늘도 카드의 차이를 하나씩 익혀보세요.</div><button type="button" class="daily-start" id="dailyStartBtn">${learningActive?'학습 이어하기 →':'오늘의 학습 시작 →'}</button></section>
      <div class="home-quick-grid"><button type="button" class="home-quick review" id="wrongReviewBtn" ${wrongCount?'':'disabled'}><span><span class="home-quick-main"><span class="home-quick-icon">↻</span>오답 복습</span><b class="home-quick-count">${wrongCount}문제</b></span><span class="home-quick-arrow">›</span></button><button type="button" class="home-quick counsel" id="counselBtn"><span><span class="home-quick-main"><span class="home-quick-icon">♡</span>오늘의 상담</span><b class="home-quick-count">1문제</b></span><span class="home-quick-arrow">›</span></button></div>
      <section class="home-section"><div class="home-section-head"><h3>최근 헷갈린 카드</h3><span>카드를 누르면 집중 복습</span></div><div class="confused-card-grid">${cards}</div></section>
      <section class="home-section"><div class="home-section-head"><h3>나의 성취</h3><span>${xp} XP</span></div><div class="achievement-grid">${achievement(total>=10,'✓','첫 학습','10문제')}${achievement(total>=100,'✦','100문제','누적 풀이')}${achievement(level.mastered>=10,'★','카드 10장','숙련')}${achievement(total>=10&&accuracy>=80,'♕','80%','정답률')}</div></section>
      <div class="home-quote"><b>오늘의 한마디</b><br>조금씩 쌓인 이해가 결국 해석의 자신감이 됩니다.</div>`;

    dashboard.querySelector('#dailyStartBtn')?.addEventListener('click',()=>{if(learningActive){app.classList.remove('home-dashboard-mode');window.scrollTo({top:0,behavior:'smooth'});}else{learningActive=true;beginSession([], '오늘의 학습');}});
    dashboard.querySelector('#wrongReviewBtn')?.addEventListener('click',()=>startWrongReview());
    dashboard.querySelector('#counselBtn')?.addEventListener('click',()=>startCounseling());
    dashboard.querySelectorAll('[data-card-id]').forEach(btn=>btn.addEventListener('click',()=>{learningActive=true;beginSession([btn.dataset.cardId], `${cardName(btn.dataset.cardId)} 집중 복습 · 10문제`);}));
  }

  function startCustomSession(pool,label,reviewMode=false){if(!pool.length)return;learningActive=true;beginSession([],label);idx=0;correctCount=0;sessionConfusions={};session=shuffle(pool).slice(0,SESSION_SIZE).map(q=>({...q,isReview:reviewMode}));progress.recentQuestionIds=[...(progress.recentQuestionIds||[]),...session.map(q=>q.id)].slice(-80);saveProgress();document.getElementById('lessonLabel').textContent=label;document.getElementById('summary').style.display='none';document.getElementById('quizView').style.display='block';document.querySelector('.footer-action').style.display='grid';refreshStats();render();window.scrollTo({top:0,behavior:'smooth'});}
  function startWrongReview(){const p=readProgress();const ids=new Set(Object.keys(p.wrongQueue||{}).filter(id=>Number(p.wrongQueue[id])>0));const pool=ALL_QUESTIONS.filter(q=>ids.has(q.id));startCustomSession(pool,`오답 복습 · ${Math.min(10,pool.length)}문제`,true);}
  function startCounseling(){
    const all=ALL_QUESTIONS.filter(q=>q.type==='오늘의 상담');
    const recentIds=new Set(progress.recentConsultationIds||[]);
    const recentThemes=new Set(progress.recentConsultationThemes||[]);
    let pool=all.filter(q=>!recentIds.has(q.id)&&(!q.consultation_theme||!recentThemes.has(q.consultation_theme)));
    if(!pool.length) pool=all.filter(q=>!recentIds.has(q.id));
    if(!pool.length) pool=all;
    const selected=shuffle(pool)[0];
    if(!selected)return;
    progress.recentConsultationIds=[...(progress.recentConsultationIds||[]),selected.id].slice(-30);
    const theme=selected.consultation_theme||selected.category||'';
    if(theme) progress.recentConsultationThemes=[...(progress.recentConsultationThemes||[]),theme].slice(-8);
    saveProgress();
    startCustomSession([selected],'오늘의 상담 · 1문제',false);
  }
  function showDashboard(){app.dataset.page='home';app.classList.add('home-dashboard-mode');renderDashboard();document.querySelectorAll('.bottom-nav button[data-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab==='home'));window.scrollTo({top:0,behavior:'smooth'});}

  const wrappedBeginSession=beginSession;beginSession=function(...args){app.classList.remove('home-dashboard-mode');learningActive=true;const result=wrappedBeginSession(...args);const footer=document.querySelector('.footer-action');if(footer&&footer.style.display!=='none')footer.style.display='grid';return result;};
  const wrappedShowSummary=showSummary;showSummary=function(...args){learningActive=false;return wrappedShowSummary(...args);};
  const wrappedRestart=restart;restart=function(...args){learningActive=true;return wrappedRestart(...args);};
  const nav=document.querySelector('.bottom-nav');nav?.addEventListener('click',e=>{const btn=e.target.closest('button[data-tab]');if(!btn)return;if(btn.dataset.tab==='home')showDashboard();else app.classList.remove('home-dashboard-mode');});
  window.TAROTSTEP_HOME={show:showDashboard,render:renderDashboard};showDashboard();
})();