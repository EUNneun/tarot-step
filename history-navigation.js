(() => {
  const sessionAnswers={};
  const baseRender=render;
  const baseSelect=select;
  const baseBeginSession=beginSession;
  const footer=document.querySelector('.footer-action');
  const nextBtn=document.getElementById('nextBtn');

  const prevBtn=document.createElement('button');
  prevBtn.type='button';
  prevBtn.id='prevBtn';
  prevBtn.className='previous';
  prevBtn.textContent='← 이전';
  footer.insertBefore(prevBtn,nextBtn);

  function clearSessionAnswers(){
    Object.keys(sessionAnswers).forEach(key=>delete sessionAnswers[key]);
  }

  function updateHistoryNavigation(){
    prevBtn.style.display=idx>0?'block':'none';
  }

  render=function(){
    baseRender();
    const q=session[idx];
    const saved=sessionAnswers[q.id];

    if(saved){
      answered=true;
      const buttons=[...document.querySelectorAll('.choice')];
      buttons.forEach((button,i)=>{
        const choice=q.choices[i];
        if(choice.correct) button.classList.add('correct');
        if(choice.no===saved.selectedNo && !choice.correct) button.classList.add('wrong');
        button.setAttribute('aria-disabled','true');
      });

      const fb=document.getElementById('feedback');
      fb.className=saved.feedbackClass;
      document.getElementById('feedbackTitle').textContent=saved.feedbackTitle;
      document.getElementById('explain').textContent=q.explanation;
      fb.style.display='block';

      nextBtn.style.display='block';
      nextBtn.textContent=idx===session.length-1?'학습 결과 보기':'다음 문제';
      document.getElementById('bar').style.width=((idx+1)/session.length*100)+'%';
    }

    updateHistoryNavigation();
  };

  select=function(c,btn,q){
    if(sessionAnswers[q.id]) return;
    baseSelect(c,btn,q);
    sessionAnswers[q.id]={
      selectedNo:c.no,
      feedbackTitle:document.getElementById('feedbackTitle').textContent,
      feedbackClass:document.getElementById('feedback').className
    };
    updateHistoryNavigation();
  };

  prevBtn.onclick=()=>{
    if(idx<=0) return;
    idx--;
    render();
    window.scrollTo({top:0,behavior:'smooth'});
  };

  beginSession=function(...args){
    clearSessionAnswers();
    baseBeginSession(...args);
  };

  render();
})();
