(()=>{
  function total(){return window.TAROT_DATA?.questions?.length||260;}
  function fixLabel(label){return String(label||'').replace(/문제은행\s*\d+/g,`문제은행 ${total()}`);}
  const lesson=document.getElementById('lessonLabel');
  if(lesson) lesson.textContent=fixLabel(lesson.textContent);

  if(typeof window.beginSession==='function'){
    const base=window.beginSession;
    window.beginSession=function(preferredCardIds=[],label){
      const nextLabel=label?fixLabel(label):`오늘의 학습 · 문제은행 ${total()}`;
      return base(preferredCardIds,nextLabel);
    };
  }

  window.TAROTSTEP_QUESTION_COUNT=total();
})();
