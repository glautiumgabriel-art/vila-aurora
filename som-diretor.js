/* Trilha original sintetizada, com o mesmo relógio da coreografia. */
function somDaCena(tipo,segundos) {
  const sr=48000, buffer=new AudioBuffer({numberOfChannels:2,length:sr*segundos,sampleRate:sr});
  const L=buffer.getChannelData(0),R=buffer.getChannelData(1);let seed=1307;
  const ru=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
  function nota(quando,dur,freq,amp,pan=0,queda=0,areia=0){
    let fase=0,filtro=0;const a=Math.round(quando*sr),n=Math.round(dur*sr);
    for(let i=0;i<n&&a+i<L.length;i++){
      const t=i/sr,k=i/n,env=Math.min(1,t/.012)*Math.pow(1-k,2.4);
      fase+=2*Math.PI*freq*(1+queda*(1-k))/sr;filtro=filtro*.68+ru()*.32;
      const v=(Math.sin(fase)+.19*Math.sin(fase*2.01)+filtro*areia)*amp*env;
      L[a+i]+=v*(.8-.2*pan);R[a+i]+=v*(.8+.2*pan);
    }
  }
  let vento=0;
  for(let i=0;i<L.length;i++){
    vento=.985*vento+.015*ru();const t=i/sr;
    const amb=vento*(tipo==="chuva"?.60:.16)+.008*Math.sin(2*Math.PI*146.83*t)*Math.sin(t*.55+.8);
    L[i]=amb;R[i]=amb*.9;
  }
  const festa=tipo==="festa";
  const melodia=festa?[392,493.88,587.33,659.25,587.33,493.88,440,523.25]:[293.66,440,392,329.63];
  for(let i=0;i<segundos/(festa?.36:.9);i++){
    nota(.13+i*(festa?.36:.9),festa?.39:.63,melodia[i%melodia.length],festa?.115:.046,Math.sin(i*2));
    if(festa&&i%2===0)nota(.13+i*.36,.19,i%4?164.81:98,.14,0,.55);
  }
  if(tipo==="luta"){
    for(const t of [.88,1.32,2.86,4.67,5.94])nota(t,.22,168,.075,Math.sin(t),1.15,3);
    VilaLuta.impactos.forEach((t,i)=>{nota(t,.26,61,.39,i%2?1:-1,1.62,1.75);nota(t+.026,.32,169,.09,0,.68,1.6);});
    for(const [i,f] of [392,493.88,587.33,783.99].entries())nota(7.18+i*.17,.5,f,.15);
  } else if(tipo==="mutirao"){
    for(let t=1.45;t<7;t+=.72)nota(t,.18,131,.19,-.5,1.4,2.1);
  } else if(tipo==="chuva"){
    for(let i=0;i<135;i++)nota(.02+i*.064,.09,500+Math.abs(ru())*620,.037,ru(),1,2.5);
  }
  if(tipo!=="chuva"){
    // Passarinhos em trinados curtos e a marola da lagoa dão ambiente sem brigar com a melodia.
    for(let i=0;i<(festa?3:9);i++){
      const q=.4+Math.abs(ru())*(segundos-1.3),f=2300+Math.abs(ru())*1900,pan=ru(),n=2+Math.floor(Math.abs(ru())*3);
      for(let k=0;k<n;k++)nota(q+k*.085,.07,f*(1+.06*k),.021,pan,.18);
    }
    let marola=0;
    for(let i=0;i<L.length;i++){marola=.94*marola+.06*ru();const t=i/sr,m=.5+.5*Math.sin(t*2.1+1.3*Math.sin(t*.7)),v=marola*.055*m*m;L[i]+=v;R[i]+=v*.8;}
  }
  // Mixagem: sobe o conjunto para volume de Reel e arredonda os picos sem estourar.
  let soma=0;for(let i=0;i<L.length;i++)soma+=L[i]*L[i]+R[i]*R[i];
  const rms=Math.sqrt(soma/(2*L.length))||1e-6,ganho=Math.min(9,.15/rms);
  for(let i=0;i<L.length;i++){const env=Math.min(1,i/(sr*.07),(L.length-i)/(sr*.38));L[i]=Math.tanh(L[i]*ganho)*.86*env;R[i]=Math.tanh(R[i]*ganho)*.86*env;}
  return buffer;
}

