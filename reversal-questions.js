(()=>{
  if(!window.TAROT_DATA || !Array.isArray(window.TAROT_DATA.questions)) return;
  const notes=window.TAROTSTEP_REVERSAL_NOTES;
  if(!notes) return;

  const major=['바보','마법사','여사제','여황제','황제','교황','연인','전차','힘','은둔자','운명의 수레바퀴','정의','매달린 사람','죽음','절제','악마','탑','별','달','태양','심판','세계'];
  const suits={W:'완드',C:'컵',S:'소드',P:'펜타클'};
  const courts={11:'페이지',12:'나이트',13:'퀸',14:'킹'};
  const ids=[...Array.from({length:22},(_,i)=>`M${String(i).padStart(2,'0')}`),...['W','C','S','P'].flatMap(s=>Array.from({length:14},(_,i)=>`${s}${String(i+1).padStart(2,'0')}`))];

  function name(id){
    if(id[0]==='M') return major[Number(id.slice(1))]||id;
    const n=Number(id.slice(1));
    return `${suits[id[0]]} ${courts[n]||n}`;
  }

  function choiceIds(index){
    const len=ids.length;
    const picks=[ids[index],ids[(index+13)%len],ids[(index+31)%len],ids[(index+53)%len]];
    return [...new Set(picks)].slice(0,4);
  }

  const existing=new Set(window.TAROT_DATA.questions.map(q=>q.id));
  ids.forEach((id,index)=>{
    const qid=`RQ${String(index+1).padStart(3,'0')}`;
    if(existing.has(qid) || !notes[id]) return;
    const candidates=choiceIds(index);
    const correctNo=(index%4)+1;
    const ordered=[];
    let wrongIndex=1;
    for(let no=1;no<=4;no++){
      const cid=no===correctNo?id:candidates[wrongIndex++];
      ordered.push({no,value_id:cid,text:notes[cid]?.k||name(cid),correct:no===correctNo});
    }
    window.TAROT_DATA.questions.push({
      id:qid,
      type:'카드→역방향 키워드',
      category:'역방향 기본',
      difficulty:'초급',
      prompt:`${name(id)} 역방향의 핵심 의미로 가장 적절한 것은?`,
      card_id:id,
      correct_no:correctNo,
      explanation:`${name(id)} 역방향 핵심: ${notes[id].k}. ${notes[id].d} 정방향의 뜻을 단순히 반대로 뒤집기보다, 정방향 에너지가 막히거나 과해지거나 내면화된 흐름으로 구분해 기억하세요.`,
      tags:'역방향,카드기본,객관식,자동채점',
      reversed:true,
      choices:ordered
    });
  });
})();