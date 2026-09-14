(()=>{
  function enhance(){
    if(typeof window.TAROTSTEP_CARD_IMAGE!=='function') return;
    document.querySelectorAll('.advanced-card').forEach(card=>{
      if(card.dataset.imageReady==='1') return;
      const name=card.querySelector('.advanced-card-name')?.textContent?.trim();
      if(!name) return;
      const entries=Object.entries(window.TAROT_DATA?.cardMeta||{});
      let id=entries.find(([,meta])=>meta?.name===name)?.[0];
      if(!id){
        const map={
          '바보':'M00','마법사':'M01','여사제':'M02','여황제':'M03','황제':'M04','교황':'M05','연인':'M06','전차':'M07','힘':'M08','은둔자':'M09','운명의 수레바퀴':'M10','정의':'M11','매달린 사람':'M12','죽음':'M13','절제':'M14','악마':'M15','탑':'M16','별':'M17','달':'M18','태양':'M19','심판':'M20','세계':'M21'
        };
        id=map[name];
        if(!id){
          const m=name.match(/^(완드|컵|소드|펜타클) (에이스|[2-9]|10|페이지|나이트|퀸|킹)$/);
          if(m){
            const suit={완드:'W',컵:'C',소드:'S',펜타클:'P'}[m[1]];
            const rank={에이스:1,페이지:11,나이트:12,퀸:13,킹:14}[m[2]]||Number(m[2]);
            id=`${suit}${String(rank).padStart(2,'0')}`;
          }
        }
      }
      if(!id) return;
      const url=window.TAROTSTEP_CARD_IMAGE(id);
      if(!url) return;
      const glyph=card.querySelector('.advanced-card-glyph');
      if(glyph){
        const img=document.createElement('img');
        img.className='advanced-card-image';
        img.src=url;
        img.alt=name;
        img.loading='lazy';
        img.addEventListener('error',()=>{img.replaceWith(glyph.cloneNode(true));},{once:true});
        glyph.replaceWith(img);
      }
      card.dataset.imageReady='1';
    });
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enhance));
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('load',enhance);
  enhance();
})();