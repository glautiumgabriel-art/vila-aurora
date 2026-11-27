/* As duas silhuetas aproximam-se, erram o primeiro golpe e trocam de iniciativa. */
const VilaLuta = (() => {
  const clamp = x => Math.min(1, Math.max(0, x));
  function suave(t,a,b){const x=clamp((t-a)/(b-a));return x*x*(3-2*x);}
  function arco(t,a,b){return Math.sin(Math.PI*clamp((t-a)/(b-a)));}
  const impactos=[3.12,4.94,6.23];
  function pose(t,vence){
    const salto=arco(t,.98,1.65), esq=arco(t,1.24,1.97), rev=arco(t,2.75,3.58);
    const contra=arco(t,4.53,5.38), fim=arco(t,5.76,6.61);
    if(vence){
      const festejo=arco(t,7.29,7.78)+.75*arco(t,7.87,8.36);
      return {x:-1.35+salto*1.14-.32*arco(t,2.98,3.96)+contra*1.11+fim*1.51+.36*suave(t,6.05,6.53),
        y:.30*salto+.21*contra+.49*fim+.43*festejo,z:.13*salto,
        tilt:.20*arco(t,.55,.97)-.22*salto+.23*rev-.3*fim-.23*festejo,roll:0,
        yaw:Math.PI/2-.64*suave(t,6.93,7.5),fase:salto+contra+fim>.03?"golpe":t>6.9?"vitoria":rev>.22?"impacto":"guarda"};
    }
    return {x:1.17+.35*esq-rev*1.48+.35*suave(t,4.91,5.2)+.35*suave(t,6.22,6.75),
      z:-.61*esq+.10*rev,y:.33*esq+.18*rev+.24*arco(t,4.92,5.45)+.42*arco(t,6.22,6.83),
      tilt:-.27*esq+.26*rev-.32*arco(t,4.93,5.55),roll:1.33*suave(t,6.27,6.93)-.12*arco(t,6.95,7.32),
      yaw:-Math.PI/2-.26*esq,fase:t>6.24?"queda":rev>.1?"golpe":esq>.05?"esquiva":contra>.5?"impacto":"guarda"};
  }
  function aplicar(obj,p,x,z,espelho=1){
    obj.position.set(x+p.x*espelho,p.y,z+p.z);
    obj.rotation.set(p.tilt,p.yaw*espelho,p.roll,"YXZ");
  }
  function efeito(t){return impactos.reduce((v,hit)=>v+(t>=hit?Math.exp(-(t-hit)*17):0),0);}
  return {pose,aplicar,efeito,impactos,suave,arco};
})();

