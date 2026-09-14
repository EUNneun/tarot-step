(()=>{
  const app=document.querySelector('.app');
  if(!app || document.getElementById('advancedView')) return;

  const STORAGE_KEY='tarotstep_advanced_v1';
  const CARD_NAMES={
    M00:'바보',M01:'마법사',M02:'여사제',M03:'여황제',M04:'황제',M05:'교황',M06:'연인',M07:'전차',M08:'힘',M09:'은둔자',M10:'운명의 수레바퀴',M11:'정의',M12:'매달린 사람',M13:'죽음',M14:'절제',M15:'악마',M16:'탑',M17:'별',M18:'달',M19:'태양',M20:'심판',M21:'세계',
    W01:'완드 에이스',W02:'완드 2',W03:'완드 3',W04:'완드 4',W05:'완드 5',W06:'완드 6',W07:'완드 7',W08:'완드 8',W09:'완드 9',W10:'완드 10',W11:'완드 페이지',W12:'완드 나이트',W13:'완드 퀸',W14:'완드 킹',
    C01:'컵 에이스',C02:'컵 2',C03:'컵 3',C04:'컵 4',C05:'컵 5',C06:'컵 6',C07:'컵 7',C08:'컵 8',C09:'컵 9',C10:'컵 10',C11:'컵 페이지',C12:'컵 나이트',C13:'컵 퀸',C14:'컵 킹',
    S01:'소드 에이스',S02:'소드 2',S03:'소드 3',S04:'소드 4',S05:'소드 5',S06:'소드 6',S07:'소드 7',S08:'소드 8',S09:'소드 9',S10:'소드 10',S11:'소드 페이지',S12:'소드 나이트',S13:'소드 퀸',S14:'소드 킹',
    P01:'펜타클 에이스',P02:'펜타클 2',P03:'펜타클 3',P04:'펜타클 4',P05:'펜타클 5',P06:'펜타클 6',P07:'펜타클 7',P08:'펜타클 8',P09:'펜타클 9',P10:'펜타클 10',P11:'펜타클 페이지',P12:'펜타클 나이트',P13:'펜타클 퀸',P14:'펜타클 킹'
  };
  const CASES=[
    {id:'A001',category:'연애',question:'상대가 나를 어떻게 생각하고 있고, 이 관계는 앞으로 어떻게 흘러갈까요?',context:'연락은 꾸준히 하지만 관계를 명확하게 정의하지 않은 상태입니다. 최근 상대의 연락 텀이 조금 길어졌습니다.',cards:[['현재 관계','P07'],['상대 마음','S02'],['앞으로의 흐름','C02']],rubric:[['카드 개별 의미','펜타클 7의 관망·평가, 소드 2의 결정 회피, 컵 2의 상호적 연결을 각각 짚었는지 봅니다.'],['카드 연결','지금은 판단을 미루고 있지만 관계 자체의 연결 가능성은 남아 있다는 흐름으로 연결했는지 봅니다.'],['단정 조절','“무조건 사귄다”처럼 결과를 확정하지 않고 가능성과 조건을 구분했는지 봅니다.']],model:'현재는 서로 들인 시간과 감정을 점검하며 관계를 지켜보는 단계로 보입니다. 상대는 마음이 없기보다는 결정을 내리는 데 주저하고 있어 명확한 표현을 피할 수 있습니다. 다만 앞으로의 카드가 컵 2이므로 서로의 마음을 확인하고 관계를 맞춰갈 가능성은 있습니다. 상대가 결정을 미루는 이유를 확인하는 대화가 중요해 보입니다.'},
    {id:'A002',category:'재회',question:'헤어진 사람과 다시 이어질 가능성이 있을까요?',context:'두 달 전 크게 다투고 헤어졌습니다. 최근 SNS 반응은 있지만 직접 연락은 없습니다.',cards:[['현재','C05'],['상대 마음','C06'],['결과','M20']],rubric:[['카드 개별 의미','컵 5의 상실감, 컵 6의 과거 회상, 심판의 재평가·재결정을 읽었는지 봅니다.'],['재회 흐름','단순한 그리움과 실제 재결정 가능성을 구분했는지 봅니다.'],['상담 관점','재회 가능성만 말하지 않고 과거 갈등을 다시 평가해야 한다는 조건을 짚었는지 봅니다.']],model:'두 사람 모두 헤어진 뒤의 아쉬움이 아직 남아 있는 흐름입니다. 상대 역시 과거의 좋은 기억이나 익숙함을 떠올릴 가능성이 있습니다. 심판은 과거 관계를 다시 평가하고 결정을 내리는 카드라 재접촉이나 재회의 가능성을 열어둘 수 있습니다. 다만 단순히 그리워서 돌아가는 것이 아니라, 헤어진 원인을 다시 다룰 수 있어야 관계가 달라질 수 있습니다.'},
    {id:'A003',category:'직장',question:'지금 회사에 남는 것이 좋을까요, 이직을 준비하는 것이 좋을까요?',context:'업무는 익숙하지만 성장 정체를 느끼고 있습니다. 당장 확정된 이직 제안은 없습니다.',cards:[['현재','P08'],['문제점','M12'],['조언','W03']],rubric:[['카드 개별 의미','펜타클 8의 숙련, 매달린 사람의 정체·관점 전환, 완드 3의 확장·다음 단계를 읽었는지 봅니다.'],['선택 해석','즉시 퇴사보다 현재 역량을 활용하며 외부 가능성을 확장하는 흐름으로 읽었는지 봅니다.'],['현실성','카드만으로 퇴사 시점을 단정하지 않고 준비 행동으로 연결했는지 봅니다.']],model:'현재 회사에서 쌓은 실력과 경험 자체는 분명한 자산입니다. 다만 매달린 사람은 지금 방식으로는 진전이 잘 느껴지지 않는 정체감을 보여줍니다. 조언의 완드 3은 더 넓은 기회와 다음 단계를 바라보라는 의미가 강하므로, 당장 회사를 그만두기보다는 현재 기반을 유지하면서 이직 시장과 새로운 역할을 적극적으로 탐색하는 쪽이 균형 잡힌 해석입니다.'},
    {id:'A004',category:'인간관계',question:'친한 친구가 요즘 왜 저를 피하는 것처럼 느껴질까요?',context:'예전에는 자주 연락했지만 최근 답장이 짧고 만남도 미뤄지고 있습니다. 직접적인 다툼은 없었습니다.',cards:[['친구 상태','S09'],['나를 보는 마음','C03'],['조언','M09']],rubric:[['감정 구분','소드 9를 “나를 싫어함”이 아니라 친구 자신의 불안·걱정 상태로 구분했는지 봅니다.'],['관계 의미','컵 3을 통해 관계 자체의 호감과 친밀감은 남아 있다고 읽었는지 봅니다.'],['조언','은둔자를 근거로 억지로 캐묻기보다 공간을 주는 방향을 제안했는지 봅니다.']],model:'친구가 거리를 두는 모습은 관계 자체에 대한 거절이라기보다 친구 개인의 걱정이나 심리적 부담이 커진 영향일 수 있습니다. 컵 3을 보면 함께 있을 때의 즐거움과 친밀감 자체는 남아 있는 편입니다. 지금은 이유를 강하게 캐묻기보다 친구가 혼자 생각을 정리할 시간을 주고, 부담 없는 방식으로 관계를 유지하는 것이 좋아 보입니다.'},
    {id:'A005',category:'연애',question:'썸 타는 상대가 적극적으로 다가오는데 믿어도 될까요?',context:'만난 지 3주 정도 됐고 표현이 매우 적극적입니다. 다만 서로에 대해 아직 아는 것이 많지 않습니다.',cards:[['상대 태도','W12'],['숨은 요소','C07'],['조언','M11']],rubric:[['카드 개별 의미','완드 나이트의 빠른 열정, 컵 7의 이상화·가능성 과다, 정의의 사실 확인을 읽었는지 봅니다.'],['균형','상대의 호감을 거짓이라고 단정하지 않으면서 지속성은 확인해야 한다고 해석했는지 봅니다.'],['조언','표현보다 실제 행동과 일관성을 보라는 구체적 기준을 제시했는지 봅니다.']],model:'상대의 적극성 자체는 실제 열정과 호감에서 나올 수 있습니다. 다만 완드 나이트는 속도가 빠른 만큼 지속성을 더 지켜볼 필요가 있고, 컵 7은 기대나 이상화가 실제보다 커질 가능성을 보여줍니다. 지금은 상대를 의심하기보다 말과 행동이 꾸준히 일치하는지, 약속과 태도가 안정적인지를 확인하면서 천천히 판단하는 것이 좋습니다.'},
    {id:'A006',category:'금전',question:'새로운 부업을 시작하면 수익으로 이어질 수 있을까요?',context:'아이디어는 있지만 아직 고객이나 매출은 없습니다. 본업과 병행해야 합니다.',cards:[['기회','P01'],['과정','P02'],['결과 가능성','P08']],rubric:[['현실성','펜타클 에이스를 실제 가능성이 있는 작은 기회로 읽었는지 봅니다.'],['과정','펜타클 2를 본업과 부업의 시간·자원 배분 문제로 연결했는지 봅니다.'],['결과','펜타클 8을 즉시 큰돈보다 반복과 숙련을 통한 점진적 수익화로 해석했는지 봅니다.']],model:'현실적으로 시작해볼 만한 작은 기회는 있습니다. 다만 본업과 병행하는 동안 시간과 에너지를 계속 조절해야 하므로 초반에는 안정적인 운영이 더 중요합니다. 결과의 펜타클 8은 단기간에 큰 수익이 터진다기보다 반복적으로 개선하고 실력을 쌓으면서 점차 수익 구조를 만드는 흐름에 가깝습니다.'}
  ];

  function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{"answers":{},"seen":[]}');}catch{return {answers:{},seen:[]};}}
  function save(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));}
  const state=load();
  let current=0;

  function glyph(id){return id.startsWith('C')?'♡':id.startsWith('S')?'◇':id.startsWith('P')?'☆':id.startsWith('W')?'✦':'☾';}
  function pickNext(){const unseen=CASES.map((x,i)=>[x,i]).filter(([x])=>!state.seen.includes(x.id));current=(unseen.length?unseen[Math.floor(Math.random()*unseen.length)][1]:Math.floor(Math.random()*CASES.length));}

  const view=document.createElement('section');view.id='advancedView';view.className='advanced-view';view.innerHTML='<div id="advancedInner"></div>';app.appendChild(view);

  function ensureEntry(){
    const dashboard=document.getElementById('homeDashboard');if(!dashboard||dashboard.querySelector('#advancedEntry'))return;
    const daily=dashboard.querySelector('.daily-card');if(!daily)return;
    const btn=document.createElement('button');btn.type='button';btn.id='advancedEntry';btn.className='advanced-entry';btn.innerHTML='<span>객관식이 익숙해졌다면</span><b>심화 리딩 연습 →</b><small>3장 조합을 직접 해석하고 모범 리딩과 비교해요</small>';
    btn.addEventListener('click',showAdvanced);daily.insertAdjacentElement('afterend',btn);
  }

  function render(){
    const c=CASES[current],saved=state.answers[c.id]||'';
    document.getElementById('advancedInner').innerHTML=`<div class="advanced-top"><button class="advanced-back" id="advancedBack">← 홈</button><div class="advanced-title">심화 리딩</div><div class="advanced-counter">${current+1} / ${CASES.length}</div></div><article class="advanced-case"><div class="advanced-badge">${c.category} · 3장 조합</div><h2 class="advanced-question">${c.question}</h2><div class="advanced-context">${c.context}</div><div class="advanced-cards">${c.cards.map(([role,id])=>`<div class="advanced-card"><div class="advanced-card-role">${role}</div><div class="advanced-card-glyph">${glyph(id)}</div><div class="advanced-card-name">${CARD_NAMES[id]||id}</div></div>`).join('')}</div><p class="advanced-prompt">카드 각각의 의미를 나열하기보다, 세 장이 어떤 흐름으로 이어지는지 상담하듯 작성해 보세요.</p><textarea id="advancedAnswer" class="advanced-answer" maxlength="1200" placeholder="예: 현재 상황은 …로 보이고, 상대는 …한 상태입니다. 세 카드를 연결하면 …">${saved}</textarea><div class="advanced-length"><span id="advancedLength">${saved.length}</span> / 1200</div><div class="advanced-actions"><button class="advanced-btn secondary" id="saveAdvanced">임시 저장</button><button class="advanced-btn primary" id="reviewAdvanced" ${saved.trim().length<30?'disabled':''}>내 해석 비교하기</button></div><div class="advanced-feedback" id="advancedFeedback"><h3>자가 첨삭 기준</h3><div class="advanced-rubric">${c.rubric.map(([title,text])=>`<div class="advanced-rubric-item"><b>${title}</b><p>${text}</p></div>`).join('')}</div><h3>모범 해석</h3><div class="advanced-model">${c.model}</div><div class="advanced-ai-note"><b>AI 첨삭 연결 준비</b><br>현재는 기준과 모범답안 비교까지 제공됩니다. Firebase 서버 함수가 연결되면 같은 답변으로 카드 이해·연결 해석·과도한 단정 여부를 AI가 개별 첨삭하도록 확장할 수 있습니다.</div></div><button class="advanced-next" id="nextAdvanced">다른 사례 풀기</button></article><div class="advanced-history">저장된 심화 답변 ${Object.keys(state.answers||{}).length}개</div>`;

    const ta=document.getElementById('advancedAnswer');
    ta.addEventListener('input',()=>{document.getElementById('advancedLength').textContent=ta.value.length;document.getElementById('reviewAdvanced').disabled=ta.value.trim().length<30;});
    document.getElementById('advancedBack').addEventListener('click',hideAdvanced);
    document.getElementById('saveAdvanced').addEventListener('click',()=>{state.answers[c.id]=ta.value.trim();save(state);document.getElementById('saveAdvanced').textContent='저장됨';setTimeout(()=>document.getElementById('saveAdvanced').textContent='임시 저장',900);});
    document.getElementById('reviewAdvanced').addEventListener('click',()=>{state.answers[c.id]=ta.value.trim();if(!state.seen.includes(c.id))state.seen.push(c.id);save(state);document.getElementById('advancedFeedback').classList.add('show');document.getElementById('advancedFeedback').scrollIntoView({behavior:'smooth',block:'nearest'});});
    document.getElementById('nextAdvanced').addEventListener('click',()=>{pickNext();render();window.scrollTo({top:0,behavior:'smooth'});});
  }

  function showAdvanced(){pickNext();app.classList.add('advanced-mode');render();window.scrollTo({top:0,behavior:'smooth'});}
  function hideAdvanced(){app.classList.remove('advanced-mode');window.TAROTSTEP_HOME?.show?.();}

  const observer=new MutationObserver(ensureEntry);observer.observe(app,{childList:true,subtree:true});ensureEntry();
  window.TAROTSTEP_ADVANCED={show:showAdvanced};
})();