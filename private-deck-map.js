(()=>{
  const map={"C04":"IMG_9007.webp","C02":"IMG_9008.webp","C01":"IMG_9009.webp","C03":"IMG_9010.webp","C05":"IMG_9011.webp","C07":"IMG_9012.webp","C06":"IMG_9013.webp","C08":"IMG_9014.webp","C09":"IMG_9015.webp","C10":"IMG_9016.webp","C11":"IMG_9017.webp","C12":"IMG_9018.webp","C13":"IMG_9019.webp","C14":"IMG_9020.webp","M02":"IMG_9021.webp","M00":"IMG_9022.webp","M01":"IMG_9023.webp","M03":"IMG_9024.webp","M04":"IMG_9025.webp","M05":"IMG_9026.webp","M06":"IMG_9027.webp","M07":"IMG_9028.webp","M09":"IMG_9029.webp","M08":"IMG_9030.webp","M10":"IMG_9031.webp","M11":"IMG_9032.webp","M12":"IMG_9033.webp","M14":"IMG_9034.webp","M15":"IMG_9035.webp","M13":"IMG_9036.webp","M16":"IMG_9037.webp","M18":"IMG_9038.webp","M17":"IMG_9039.webp","M20":"IMG_9040.webp","M21":"IMG_9041.webp","M19":"IMG_9042.webp","P03":"IMG_9043.webp","P02":"IMG_9044.webp","P01":"IMG_9045.webp","P04":"IMG_9046.webp","P05":"IMG_9047.webp","P06":"IMG_9048.webp","P07":"IMG_9049.webp","P09":"IMG_9050.webp","P10":"IMG_9051.webp","P08":"IMG_9052.webp","P12":"IMG_9053.webp","P11":"IMG_9054.webp","P14":"IMG_9055.webp","P13":"IMG_9056.webp","S01":"IMG_9057.webp","S02":"IMG_9058.webp","S03":"IMG_9059.webp","S04":"IMG_9060.webp","S06":"IMG_9061.webp","S05":"IMG_9062.webp","S07":"IMG_9063.webp","S09":"IMG_9064.webp","S08":"IMG_9065.webp","S10":"IMG_9066.webp","S11":"IMG_9067.webp","S12":"IMG_9068.webp","S13":"IMG_9069.webp","S14":"IMG_9070.webp","W01":"IMG_9071.webp","W02":"IMG_9072.webp","W03":"IMG_9073.webp","W04":"IMG_9074.webp","W05":"IMG_9075.webp","W06":"IMG_9076.webp","W07":"IMG_9077.webp","W08":"IMG_9078.webp","W09":"IMG_9079.webp","W10":"IMG_9080.webp","W11":"IMG_9081.webp","W12":"IMG_9082.webp","W13":"IMG_9083.webp","W14":"IMG_9084.webp"};
  const defaultBase='https://raw.githubusercontent.com/sixseeds/tarot-api/main/cards/';
  const suitCode={W:'wa',C:'cu',S:'sw',P:'pe'};
  function defaultUrl(cardId){
    if(/^M\d{2}$/.test(cardId||'')) return `${defaultBase}ar${cardId.slice(1)}.jpg`;
    if(/^[WCSP]\d{2}$/.test(cardId||'')) return `${defaultBase}${suitCode[cardId[0]]}${cardId.slice(1)}.jpg`;
    return '';
  }
  function resolve(cardId){
    if(window.TAROTSTEP_PRIVATE_DECK===true && map[cardId]) return `cards/private/${map[cardId]}`;
    return defaultUrl(cardId);
  }
  window.TAROTSTEP_PRIVATE_DECK_MAP=map;
  window.TAROTSTEP_DEFAULT_CARD_IMAGE=defaultUrl;
  window.TAROTSTEP_CARD_IMAGE=resolve;
})();