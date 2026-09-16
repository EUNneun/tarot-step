(()=>{
  const notes=window.TAROTSTEP_REVERSAL_NOTES;
  if(!notes) return;

  function esc(v){
    return String(v??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function inject(){
    const detail=document.querySelector('#cardLibraryView .card-detail');
    if(!detail || detail.querySelector('.card-reversal-block')) return;
    const id=document.querySelector('#cardLibraryView .card-detail-head > span')?.textContent?.trim();
    const note=notes[id];
    const base=detail.querySelector('.card-base-block');
    if(!note || !base) return;

    const section=document.createElement('section');
    section.className='card-note-block card-reversal-block';
    section.innerHTML=`<h3>역방향 해석</h3><div class="card-keywords"><span>${esc(note.k).replaceAll(' · ','</span><span>')}</span></div><p style="margin-top:10px">${esc(note.d)}</p><p style="margin-top:8px;color:var(--muted);font-size:11px">역방향은 단순히 정방향의 반대라기보다, 에너지가 막히거나 과해지거나 내면화된 흐름으로 함께 읽어보세요.</p>`;
    base.insertAdjacentElement('afterend',section);
  }

  function bind(){
    const target=document.getElementById('cardLibraryView');
    if(!target) return false;
    new MutationObserver(inject).observe(target,{childList:true,subtree:true});
    inject();
    return true;
  }

  if(!bind()){
    const observer=new MutationObserver(()=>{
      if(bind()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();