(()=>{
  const digitBatchim={0:true,1:true,2:false,3:true,4:false,5:false,6:true,7:true,8:true,9:false};
  const digitRieul={1:true,7:true,8:true};
  function jongInfo(raw){
    const s=String(raw||'').trim();
    if(!s) return {has:false,rieul:false};
    const ch=s[s.length-1];
    if(/[0-9]/.test(ch)) return {has:digitBatchim[ch]===true,rieul:digitRieul[ch]===true};
    const code=ch.charCodeAt(0);
    if(code>=0xAC00&&code<=0xD7A3){
      const jong=(code-0xAC00)%28;
      return {has:jong!==0,rieul:jong===8};
    }
    return {has:false,rieul:false};
  }
  function choose(word,pair){
    const j=jongInfo(word);
    if(pair==='이/가') return j.has?'이':'가';
    if(pair==='은/는') return j.has?'은':'는';
    if(pair==='을/를') return j.has?'을':'를';
    if(pair==='과/와') return j.has?'과':'와';
    if(pair==='으로/로') return j.has&&!j.rieul?'으로':'로';
    return '';
  }
  function normalize(text){
    if(typeof text!=='string'||!text) return text;
    let out=text;
    const rules=[['이/가','이|가'],['은/는','은|는'],['을/를','을|를'],['과/와','과|와'],['으로/로','으로|로']];
    for(const [pair,alts] of rules){
      const re=new RegExp("([가-힣A-Za-z0-9]+)([’”\"']?)("+alts+")(?=[\\s,.!?·:;)]|$)",'g');
      out=out.replace(re,(m,word,quote)=>word+quote+choose(word,pair));
    }
    return out;
  }
  const questions=window.TAROT_DATA?.questions||[];
  for(const q of questions){
    q.prompt=normalize(q.prompt);
    q.explanation=normalize(q.explanation);
    if(Array.isArray(q.choices)) for(const choice of q.choices) choice.text=normalize(choice.text);
  }
  window.TAROTSTEP_KOREAN_GRAMMAR={normalize,choose};
})();
