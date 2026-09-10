const { questions: ALL_QUESTIONS, cardMeta: CARD_META } = window.TAROT_DATA;
const SESSION_SIZE = 10;
const STORAGE_KEY = 'tarotstep_progress_v2';

let session=[], idx=0, correctCount=0, answered=false;

function loadProgress(){
  const base={
    xp:0,
    totalAnswered:0,
    totalCorrect:0,
    wrongQueue:{},
    cardStats:{},
    recentQuestionIds:[]
  };
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return saved ? {
      ...base,
      ...saved,
      wrongQueue:saved.wrongQueue||{},
      cardStats:saved.cardStats||{},
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

function sampleQuestions(){
  const level = getLevelInfo();
  const wrongIds = new Set(Object.keys(progress.wrongQueue).filter(id => progress.wrongQueue[id] > 0));
  const recent = new Set(progress.recentQuestionIds || []);
  const used = new Set();
  const picked = [];

  // 매 학습 세션에 상담형 문제를 정확히 1문제 포함
  const counselingPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type === '오늘의 상담' && !recent.has(q.id)
  ));
  const counselingFallback = shuffle(ALL_QUESTIONS.filter(q => q.type === '오늘의 상담'));
  addUnique(picked, counselingPool.length ? counselingPool : counselingFallback, 1, used);

  // 1) 지난 오답은 최대 4문제 우선 복습
  const wrongPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type !== '오늘의 상담' && wrongIds.has(q.id)
  ));
  addUnique(picked, wrongPool, Math.min(4, SESSION_SIZE), used);

  // 2) 카드별 정답률이 낮은 취약 카드에서 최대 2문제
  const weakIds = getWeakCardIds().slice(0,12);
  const weakPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type !== '오늘의 상담' && weakIds.includes(q.card_id) && !recent.has(q.id)
  ));
  addUnique(picked, weakPool, Math.min(picked.length+2, SESSION_SIZE), used);

  // 3) 아직 한 번도 풀지 않은 카드도 섞기
  const seenCards = new Set(Object.keys(progress.cardStats));
  const unseenPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type !== '오늘의 상담' && !seenCards.has(q.card_id) && !recent.has(q.id)
  ));
  addUnique(picked, unseenPool, Math.min(picked.length+2, SESSION_SIZE), used);

  // 4) 현재 수준에 따라 초급/중급 비율 조정
  const currentMid = picked.filter(q => q.difficulty === '중급').length;
  const midNeed = Math.max(0, level.midTarget-currentMid);
  const midPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type !== '오늘의 상담' && q.difficulty==='중급' && !recent.has(q.id) && !used.has(q.id)
  ));
  addUnique(picked, midPool, Math.min(picked.length+midNeed, SESSION_SIZE), used);

  const easyPool = shuffle(ALL_QUESTIONS.filter(q =>
    q.type !== '오늘의 상담' && q.difficulty==='초급' && !recent.has(q.id) && !used.has(q.id)
  ));
  addUnique(picked, easyPool, SESSION_SIZE, used);

  // 최근 세션 제외 때문에 부족한 경우 전체 풀에서 채움
  if(picked.length < SESSION_SIZE){
    const fallback = shuffle(ALL_QUESTIONS.filter(q =>
      q.type !== '오늘의 상담' && !used.has(q.id)
    ));
    addUnique(picked, fallback, SESSION_SIZE, used);
  }

  const finalSession = shuffle(picked.slice(0,SESSION_SIZE))
    .map(q => ({...q,isReview:wrongIds.has(q.id)}));

  progress.recentQuestionIds = finalSession.map(q=>q.id);
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
  progress.cardStats[cardId] = s;
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

  const cv=document.getElementById('cardVisual');
  cv.style.display = q.type.startsWith('카드→') ? 'grid':'none';

  const wrap=document.getElementById('choices');
  wrap.innerHTML='';
  q.choices.forEach(c=>{
    const b=document.createElement('button');
    b.className='choice';
    b.innerHTML=`<span class="idx">${c.no}</span><span>${c.text}</span>`;
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
  }

  saveProgress();
  refreshStats();

  document.getElementById('explain').textContent=q.explanation;
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
}

function restart(){
  idx=0;
  correctCount=0;
  session=sampleQuestions();
  document.getElementById('summary').style.display='none';
  document.getElementById('quizView').style.display='block';
  document.querySelector('.footer-action').style.display='block';
  refreshStats();
  render();
}

refreshStats();
session=sampleQuestions();
render();
