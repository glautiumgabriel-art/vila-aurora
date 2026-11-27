/* Luta de treino dos bichos no mapa e impactos dos duelos aceitos. */
function criarLutaNoMapa(scene,camera,passeio) {
  const g=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xf6cb82}),22);
  g.frustumCulled=false;g.visible=false;scene.add(g);
  const d=new THREE.Object3D();let elenco=[],chave="",ultimoImpacto="",tremor=0,ctx;
  function habilitar(){ctx??=new AudioContext();ctx.resume().catch(()=>{});}
  window.addEventListener("pointerdown",habilitar,{once:true});
  function atualizar(t,V,bichos,duelo,segredo) {
    g.visible=false;tremor=0;
    if(segredo)return;
    const seg=(t+6)%46;
    const nova=V.i+":"+Math.floor((t+6)/46);
    if(nova!==chave){elenco.forEach(b=>{const a=b.userData.caminhante;if(a){a.rotaExterna=false;a.dueloPose=null;a.golpe=null;a.face=null;a.inicioTreino=null;}});chave=nova;elenco=["lobo","javali"].map(tipo=>bichos.find(b=>b.userData.V===V&&b.userData.tipo===tipo)).filter(Boolean);}
    let tempo,x,z,espelho=1;
    if(duelo){({tempo,x,z,espelho}=duelo);}
    else if(elenco.length===2){
      const par=elenco.map(b=>b.userData.caminhante);if(par.some(a=>!a))return;
      // Os dois chegam ao terreiro pelo mapa. O golpe acontece onde pisaram.
      if(seg<24){
        for(let i=0;i<2;i++){const a=par[i];if(a.treino!==nova){
          a.treino=nova;a.rotaExterna=true;passeio.ir(a,V.cx-17+(i?1:-1),V.cz+18,true);}
          elenco[i].visible=true;}
        const d=Math.hypot(par[0].x-par[1].x,par[0].z-par[1].z);
        if(d>2.9||par.some(a=>a.trilha.length))return;
        const inicio=par[0].inicioTreino??=t;tempo=t-inicio;if(tempo>9){for(const a of par){a.dueloPose=null;a.golpe=null;}return;}
        x=(par[0].x+par[1].x)/2;z=(par[0].z+par[1].z)/2;
        for(let i=0;i<2;i++){const a=par[i],outro=par[1-i],p=VilaLuta.pose(tempo,i===0);
          a.dueloPose=p;a.face=Math.atan2(outro.x-a.x,outro.z-a.z);a.golpe=p.fase==="golpe"?(i?"Attack_Headbutt":"Attack"):null;}
      }else{for(const a of par){a.rotaExterna=false;a.dueloPose=null;a.inicioTreino=null;a.golpe=null;a.face=null;}return;}
    }else return;
    const k=VilaLuta.impactos.findIndex(h=>tempo>=h&&tempo<h+.52);if(k<0)return;
    const u=tempo-VilaLuta.impactos[k],px=x+espelho*[-.64,.75,1.34][k];
    g.visible=true;
    for(let i=0;i<22;i++){const a=i*2.399,r=(1+i%5*.24)*u*2.1;d.position.set(px+Math.cos(a)*r,.68+(2+i%4*.4)*u-4*u*u,z+Math.sin(a)*r);d.scale.setScalar(.075*(1-u/.52));d.updateMatrix();g.setMatrixAt(i,d.matrix);}
    g.instanceMatrix.needsUpdate=true;
    const distancia=Math.hypot(camera.position.x-x,camera.position.z-z);
    if(distancia>42)return;tremor=VilaLuta.efeito(tempo)*.06*(1-distancia/60);
    const id=chave+":"+Math.floor((t-tempo+.1)/3)+":"+k;
    if(id!==ultimoImpacto&&ctx?.state==="running"){ultimoImpacto=id;const o=ctx.createOscillator(),a=ctx.createGain(),s=ctx.currentTime;
      o.type="triangle";o.frequency.setValueAtTime(198,s);o.frequency.exponentialRampToValueAtTime(52,s+.13);
      a.gain.setValueAtTime(.16,s);a.gain.exponentialRampToValueAtTime(.001,s+.19);o.connect(a);a.connect(ctx.destination);o.start(s);o.stop(s+.2);}
  }
  return {atualizar,particulas:g,sacudir(t){camera.position.x+=tremor*Math.sin(t*139);camera.position.y+=tremor*Math.cos(t*157);}};
}

