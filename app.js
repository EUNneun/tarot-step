const { questions: ALL_QUESTIONS, cardMeta: CARD_META } = window.TAROT_DATA;
const SESSION_SIZE = 10;
const STORAGE_KEY = 'tarotstep_progress_v2';

let session=[], idx=0, correctCount=0, answered=false;
let sessionConfusions={};

function loadProgress(){
  const base={
    xp:0,
    totalAnswered:0,
    totalCorrect:0,
    wrongQueue:{},
    cardStats:{},
    confusionPairs:{},
    confusionReviewDue:{},
    recentQuestionIds:[]
  };
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return saved ? {
      ...base,
      ...saved,
      wrongQueue:saved.wrongQueue||{},
      cardStats:saved.cardStats||{},
      confusionPairs:saved.confusionPairs||{},
      confusionReviewDue:saved.confusionReviewDue||{},
      recentQuestionIds:saved.recentQuestionIds||[]
    } : base;
  } catch(e) { return base; }
}

function saveProgress(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let progress=loadProgress();

function shuffle(arr){
  return [...arr].sort(()=>Math.random()-.5);
}

function isMastered(stat){
  if(!stat) return false;
  const acc = stat.attempts ? stat.correct/stat.attempts : 0;
  return stat.attempts >= 3 && acc >= 0.75 && stat.streak >= 2;
}

function getLevelInfo(){
  const mastered = Object.values(progress.cardStats).filter(isMastered).length;
  let level=1, name='입문', midTarget=2;
  if(mastered >= 78) { level=6; name='마스터'; midTarget=6; }
  else if(mastered >= 65) { level=5; name='고급'; midTarget=6; }
  else if(mastered >= 45) { level=4; name='숙련'; midTarget=5; }
  else if(mastered >= 25) { level=3; name='성장'; midTarget=4; }
  else if(mastered >= 10) { level=2; name='기초'; midTarget=3; }
  return {level,name,mastered,midTarget};
}

function getWeakCardIds(){
  return Object.entries(progress.cardStats)
    .filter(([id,s]) => s.attempts > 0 && !isMastered(s))
    .sort((a,b) => {
      const aa=a[1].correct/a[1].attempts;
      const ba=b[1].correct/b[1].attempts;
      if(aa !== ba) return aa-ba;
      return a[1].streak-b[1].streak;
    })
    .map(([id])=>id);
}

function addUnique(target, candidates, limit, used){
  for(const q of candidates){
    if(target.length >= limit) break;
    if(!used.has(q.id)){
      target.push(q);
      used.add(q.id);
    }
  }
}

function questionTouchesCards(q,cardIds){
  if(!cardIds?.size) return false;
  if(cardIds.has(q.card_id)) return true;
  return Array.isArray(q.card_ids) && q.card_ids.some(id=>cardIds.has(id));
}

function dueConfusionCardIds(){
  const now=Date.now();
  const due=progress.confusionReviewDue||{};
  return Object.entries(progress.confusionPairs||{})
    .filter(([key,count]) => count>0 && (!due[key] || Number(due[key])<=now))
    .sort((a,b)=>b[1]-a[1])
    .slice(0,4)
    .flatMap(([key])=>key.split('|'));
}

function sampleQuestions(preferredCardIds=[]){
  const recent=new Set(progress.recentQuestionIds||[]);
  const used=new Set();
  const picked=[];
  const nonCounsel=q=>q.type!=='오늘의 상담';
  const fresh=q=>!recent.has(q.id);
  const preferred=new Set(preferredCardIds);

  // 사용자는 학습방법을 고르지 않아도 된다. 10문제를 자동 구성한다.
  // 상담 1 + 오답 2 + 헷갈림 2 + 오래 안 본 카드 1 + 취약 2 + 새 카드 2
  const counseling=shuffle(ALL_QUESTIONS.filter(q=>q.type==='오늘의 상담'&&fresh(q)));
  const counselingFallback=shuffle(ALL_QUESTIONS.filter(q=>q.type==='오늘의 상담'));
  addUnique(picked,counseling.length?counseling:counselingFallback,1,used);

  if(preferred.size){
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&questionTouchesCards(q,preferred))),Math.min(7,SESSION_SIZE),used);
  }else{
    const wrongIds=new Set(Object.keys(progress.wrongQueue||{}).filter(id=>progress.wrongQueue[id]>0));
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&wrongIds.has(q.id))),Math.min(picked.length+2,SESSION_SIZE),used);

    const confused=new Set(dueConfusionCardIds());
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&questionTouchesCards(q,confused))),Math.min(picked.length+2,SESSION_SIZE),used);

    const staleIds=Object.entries(progress.cardStats||{})
      .filter(([,s])=>s.attempts>0)
      .sort((a,b)=>(Number(a[1].lastSeenAt)||0)-(Number(b[1].lastSeenAt)||0))
      .slice(0,10).map(([id])=>id);
    const stale=new Set(staleIds);
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&questionTouchesCards(q,stale))),Math.min(picked.length+1,SESSION_SIZE),used);

    const weak=new Set(getWeakCardIds().slice(0,12));
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&questionTouchesCards(q,weak))),Math.min(picked.length+2,SESSION_SIZE),used);

    const seen=new Set(Object.keys(progress.cardStats||{}));
    addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&q.card_id&&!seen.has(q.card_id))),Math.min(picked.length+2,SESSION_SIZE),used);
  }

  // 남는 자리는 최근 출제를 피하면서 현재 레벨에 맞는 문제로 채운다.
  const level=getLevelInfo();
  const targetDifficulty=level.level>=3?'중급':'초급';
  addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q)&&q.difficulty===targetDifficulty)),SESSION_SIZE,used);
  addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q)&&fresh(q))),SESSION_SIZE,used);
  if(picked.length<SESSION_SIZE) addUnique(picked,shuffle(ALL_QUESTIONS.filter(q=>nonCounsel(q))),SESSION_SIZE,used);

  const wrongIds=new Set(Object.keys(progress.wrongQueue||{}).filter(id=>progress.wrongQueue[id]>0));
  const finalSession=shuffle(picked.slice(0,SESSION_SIZE)).map(q=>({...q,isReview:wrongIds.has(q.id)}));
  progress.recentQuestionIds=[...(progress.recentQuestionIds||[]),...finalSession.map(q=>q.id)].slice(-80);
  saveProgress();
  return finalSession;
}

function updateCardStat(cardId, isCorrect){
  const s = progress.cardStats[cardId] || {attempts:0,correct:0,streak:0};
  s.attempts += 1;
  if(isCorrect){
    s.correct += 1;
    s.streak += 1;
  } else {
    s.streak = 0;
  }
  s.lastSeenAt = Date.now();
  progress.cardStats[cardId] = s;
}

function isTarotCardId(value){
  return typeof value === 'string' && /^[MWCSP]\d{2}$/.test(value);
}

function getPairKey(cardA, cardB){
  return [cardA,cardB].sort().join('|');
}

function recordConfusion(q, choice){
  const correctId=q.card_id;
  const selectedId=choice.value_id;
  if(!isTarotCardId(correctId) || !isTarotCardId(selectedId) || correctId===selectedId) return;

  const key=getPairKey(correctId,selectedId);
  progress.confusionPairs[key]=(progress.confusionPairs[key]||0)+1;
  progress.confusionReviewDue=progress.confusionReviewDue||{};
  progress.confusionReviewDue[key]=Date.now()+(24*60*60*1000);

  if(!sessionConfusions[key]){
    sessionConfusions[key]={count:0,correctId,selectedId};
  }
  sessionConfusions[key].count += 1;
}

const MAJOR_NAMES=[
  '바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자',
  '운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'
];
const SUIT_NAMES={W:'완드',C:'컵',S:'소드',P:'펜타클'};
const COURT_NAMES={11:'페이지',12:'나이트',13:'퀸',14:'킹'};

function getCardName(cardId){
  if(!isTarotCardId(cardId)) return cardId || '카드';
  if(cardId[0]==='M'){
    return MAJOR_NAMES[Number(cardId.slice(1))] || cardId;
  }
  const suit=SUIT_NAMES[cardId[0]] || cardId[0];
  const no=Number(cardId.slice(1));
  if(no===1) return `${suit} 에이스`;
  if(no>=2 && no<=10) return `${suit} ${no}`;
  return `${suit} ${COURT_NAMES[no] || no}`;
}

function getCardKeywords(cardId){
  const keywordQuestion=ALL_QUESTIONS.find(q =>
    q.card_id===cardId &&
    q.type==='카드→키워드' &&
    Array.isArray(q.choices)
  );
  const correctChoice=keywordQuestion?.choices.find(c => c.correct);
  return correctChoice?.text || '';
}

function getCardDifference(cardA, cardB){
  const nameA=getCardName(cardA);
  const nameB=getCardName(cardB);
  const keywordsA=getCardKeywords(cardA);
  const keywordsB=getCardKeywords(cardB);

  if(keywordsA && keywordsB){
    return `<b>${nameA}</b>는 ${escapeHtml(keywordsA)}에 가깝고,<br><b>${nameB}</b>는 ${escapeHtml(keywordsB)}에 가깝습니다.`;
  }
  return `${nameA}와 ${nameB}의 핵심 의미를 다시 비교해 보세요.`;
}

function escapeHtml(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function cardImageUrl(cardId){
  return typeof window.TAROTSTEP_CARD_IMAGE==='function' ? window.TAROTSTEP_CARD_IMAGE(cardId) : '';
}

function defaultCardImageUrl(cardId){
  return typeof window.TAROTSTEP_DEFAULT_CARD_IMAGE==='function' ? window.TAROTSTEP_DEFAULT_CARD_IMAGE(cardId) : '';
}

function questionShowsCardBeforeAnswer(q){
  if(!q || q.type==='오늘의 상담' || !isTarotCardId(q.card_id)) return false;
  if(String(q.type||'').startsWith('카드→')) return true;
  const cardName=getCardName(q.card_id);
  return Boolean(cardName && String(q.prompt||'').includes(cardName));
}

function renderCardVisual(q,revealAnswer=false){
  const cv=document.getElementById('cardVisual');
  if(!cv) return;
  cv.innerHTML='';
  cv.classList.remove('is-visible','is-answer');

  if(!q || q.type==='오늘의 상담' || !isTarotCardId(q.card_id)){
    cv.style.display='none';
    return;
  }

  const shouldShow=questionShowsCardBeforeAnswer(q) || revealAnswer;
  if(!shouldShow){
    cv.style.display='none';
    return;
  }

  const url=cardImageUrl(q.card_id);
  const fallback=defaultCardImageUrl(q.card_id);
  if(!url){
    cv.style.display='none';
    return;
  }

  const img=document.createElement('img');
  img.src=url;
  img.alt=getCardName(q.card_id);
  img.loading='eager';
  if(fallback && fallback!==url){
    img.onerror=()=>{ img.onerror=null; img.src=fallback; };
  }
  cv.appendChild(img);
  cv.style.display='grid';
  cv.classList.add('is-visible');
  if(revealAnswer && !questionShowsCardBeforeAnswer(q)) cv.classList.add('is-answer');
}

function refreshStats(){
  const level = getLevelInfo();
  const acc = progress.totalAnswered
    ? Math.round(progress.totalCorrect/progress.totalAnswered*100)+'%'
    : '-';

  document.getElementById('xp').textContent=progress.xp+' XP';
  document.getElementById('solvedCount').textContent='누적 '+progress.totalAnswered+'문제';
  document.getElementById('currentLevel').textContent=`Lv.${level.level} ${level.name}`;
  document.getElementById('masteryStat').textContent=`숙련 ${level.mastered}/78 · 정답률 ${acc}`;
}

function render(){
  const q=session[idx];
  answered=false;
  document.getElementById('typePill').textContent=q.type;
  document.getElementById('levelPill').textContent=q.difficulty;
  document.getElementById('reviewPill').style.display=q.isReview?'inline-flex':'none';
  document.getElementById('question').textContent=q.prompt;
  document.getElementById('qnum').textContent='QUESTION '+String(idx+1).padStart(2,'0');
  document.getElementById('progressText').textContent=`${idx+1} / ${session.length}`;
  document.getElementById('bar').style.width=((idx)/session.length*100)+'%';
  document.getElementById('feedback').style.display='none';
  document.getElementById('nextBtn').style.display='none';

  renderCardVisual(q,false);

  const wrap=document.getElementById('choices');
  wrap.innerHTML='';
  q.choices.forEach(c=>{
    const b=document.createElement('button');
    b.className='choice';
    b.innerHTML=`<span class="idx">${c.no}</span><span>${escapeHtml(c.text)}</span>`;
    b.onclick=()=>select(c,b,q);
    wrap.appendChild(b);
  });
}

function select(c,btn,q){
  if(answered) return;
  answered=true;

  const buttons=[...document.querySelectorAll('.choice')];
  buttons.forEach((b,i)=>{
    const ch=q.choices[i];
    if(ch.correct) b.classList.add('correct');
  });

  progress.totalAnswered += 1;
  const relatedCardIds = q.card_ids || [q.card_id];
  relatedCardIds.forEach(cardId => updateCardStat(cardId, c.correct));

  const fb=document.getElementById('feedback');
  const title=document.getElementById('feedbackTitle');

  if(c.correct){
    btn.classList.add('correct');
    fb.className='feedback good';
    const earned = q.isReview ? 15 : 10;
    title.textContent=q.isReview ? `복습 성공! +${earned} XP` : `정답이에요 ✓ +${earned} XP`;
    correctCount++;
    progress.totalCorrect += 1;
    progress.xp += earned;
    if(q.isReview) delete progress.wrongQueue[q.id];
  } else {
    btn.classList.add('wrong');
    fb.className='feedback bad';
    title.textContent='조금 헷갈렸어요 · 0 XP';
    progress.wrongQueue[q.id] = (progress.wrongQueue[q.id] || 0) + 1;
    recordConfusion(q,c);
  }

  saveProgress();
  refreshStats();

  document.getElementById('explain').textContent=q.explanation;
  renderCardVisual(q,true);
  fb.style.display='block';
  document.getElementById('nextBtn').style.display='block';
  document.getElementById('nextBtn').textContent=idx===session.length-1?'학습 결과 보기':'다음 문제';
  document.getElementById('bar').style.width=((idx+1)/session.length*100)+'%';
}

document.getElementById('nextBtn').onclick=()=>{
  if(idx<session.length-1){
    idx++;
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  } else showSummary();
};

function renderConfusionSummary(){
  const section=document.getElementById('confusionSection');
  const list=document.getElementById('confusionList');
  const reviewBtn=document.getElementById('confusionReviewBtn');
  const entries=Object.entries(sessionConfusions)
    .sort((a,b) => {
      const totalDiff=(progress.confusionPairs[b[0]]||0)-(progress.confusionPairs[a[0]]||0);
      return totalDiff || b[1].count-a[1].count;
    });

  if(!entries.length){
    section.style.display='none';
    reviewBtn.style.display='none';
    list.innerHTML='';
    return;
  }

  section.style.display='block';
  reviewBtn.style.display='block';
  list.innerHTML=entries.map(([key,info])=>{
    const [cardA,cardB]=key.split('|');
    const total=progress.confusionPairs[key]||info.count;
    const sessionText=info.count>1 ? `이번 학습 ${info.count}회 · ` : '';
    return `
      <div class="confusion-card">
        <div class="confusion-top">
          <div class="confusion-pair">${escapeHtml(getCardName(cardA))} <span>↔</span> ${escapeHtml(getCardName(cardB))}</div>
          <div class="confusion-count">${sessionText}누적 ${total}회</div>
        </div>
        <div class="confusion-difference">${getCardDifference(cardA,cardB)}</div>
      </div>
    `;
  }).join('');
}

function showSummary(){
  document.getElementById('quizView').style.display='none';
  document.querySelector('.footer-action').style.display='none';
  const s=document.getElementById('summary');
  s.style.display='block';

  const pct=Math.round(correctCount/session.length*100);
  document.getElementById('scorePct').textContent=pct+'%';

  const wrongLeft=Object.keys(progress.wrongQueue).length;
  const level=getLevelInfo();
  const acc=progress.totalAnswered
    ? Math.round(progress.totalCorrect/progress.totalAnswered*100)
    : 0;

  document.getElementById('scoreDetail').textContent=
    `${session.length}문제 중 ${correctCount}문제 정답 · 누적 ${progress.totalAnswered}문제 · 복습대기 ${wrongLeft}문제`;
  document.getElementById('levelSummary').textContent=
    `현재 Lv.${level.level} ${level.name} · 숙련 카드 ${level.mastered}/78 · 누적 정답률 ${acc}%`;

  document.getElementById('scoreRing').style.background=
    `conic-gradient(var(--primary) 0 ${pct}%,#E8E2F5 ${pct}% 100%)`;

  renderConfusionSummary();
}

function beginSession(preferredCardIds=[],label='오늘의 학습'){
  idx=0;
  correctCount=0;
  sessionConfusions={};
  session=sampleQuestions(preferredCardIds);
  document.getElementById('lessonLabel').textContent=label;
  document.getElementById('summary').style.display='none';
  document.getElementById('quizView').style.display='block';
  document.querySelector('.footer-action').style.display='block';
  refreshStats();
  render();
  window.scrollTo({top:0,behavior:'smooth'});
}

function startConfusionReview(){
  const preferredCardIds=[...new Set(
    Object.keys(sessionConfusions).flatMap(key => key.split('|'))
  )];
  if(!preferredCardIds.length) return;
  beginSession(preferredCardIds,'헷갈린 카드 복습 · 10문제');
}

function restart(){
  beginSession();
}

document.getElementById('confusionReviewBtn').onclick=startConfusionReview;

refreshStats();
session=sampleQuestions();
render();

window.addEventListener('tarotstep:deck-changed',()=>renderCardVisual(session?.[idx],answered));
