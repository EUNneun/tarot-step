(()=>{
  function cleanLabel(label){return String(label||'').replace(/\s*·\s*문제은행\s*\d+/g,'').trim();}
  const lesson=document.getElementById('lessonLabel');
  if(lesson) lesson.textContent=cleanLabel(lesson.textContent)||'오늘의 학습';

  if(typeof window.beginSession==='function'){
    const base=window.beginSession;
    window.beginSession=function(preferredCardIds=[],label){
      const nextLabel=cleanLabel(label||'오늘의 학습')||'오늘의 학습';
      return base(preferredCardIds,nextLabel);
    };
  }
})();
