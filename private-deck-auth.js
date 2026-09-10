(()=>{
  const PRIVATE_DECK_EMAIL='limiteun@gamil.com';

  function apply(user){
    const email=String(user?.email||'').trim().toLowerCase();
    window.TAROTSTEP_PRIVATE_DECK=(email===PRIVATE_DECK_EMAIL);
    window.dispatchEvent(new CustomEvent('tarotstep:deck-changed',{detail:{privateDeck:window.TAROTSTEP_PRIVATE_DECK}}));
  }

  apply(window.TAROT_AUTH_USER||null);
  window.addEventListener('tarotstep:auth-changed',e=>apply(e.detail||null));
})();