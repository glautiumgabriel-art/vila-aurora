/* Luta de treino dos bichos no mapa e impactos dos duelos aceitos. */
function criarLutaNoMapa(scene,camera,passeio) {
  const g=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xf6cb82}),22);
  g.frustumCulled=false;g.visible=false;scene.add(g);
  const d=new THREE.Object3D();let elenco=[],chave="",ultimoImpacto="",tremor=0,ctx;
  const confrontos=new Set(), ocupados=new Set(), descanso=new WeakMap(), reaparecem=new Set();
  const registro=[], visitantes=new Map(), moradoresEmLuta=new Set();
  let buscarEm=0;
  function registrar(ev){ registro.push(ev); if(registro.length>64)registro.shift(); }
  function encontrosSombrios(t,nav,moradores,duelo,roteiro){
    for(const [a,ate] of visitantes)if(t>=ate&&!ocupados.has(a.g)&&!reaparecem.has(a)){
      nav.atores.delete(a);a.g.removeFromParent();visitantes.delete(a);
    }
    for(const a of reaparecem){
      if(t<a.derrotadoAte)continue;
      if(!a.g.parent){reaparecem.delete(a);continue;}
      a.invasaoVi=undefined;
      const p=nav.ponto(a,roteiro.casa.x,roteiro.casa.z,true);
      if(!p)continue;
      a.x=p.x; a.z=p.z; a.vel=0; a.trilha=[]; a.derrotadoAte=0; a.espera=0;
      a.g.position.set(a.x,nav.piso(a.x,a.z),a.z);
      nav.atores.add(a); a.g.visible=true; reaparecem.delete(a);
      descanso.set(a.g,t+10);
      if(a.recolhido)visitantes.set(a,t+90);
      registrar({evento:"reapareceu",tempo:t,monstro:a.tipo,id:a.id,x:a.x,z:a.z});
    }
    const distancia=(a,b)=>(a.position.x-b.position.x)**2+(a.position.z-b.position.z)**2;
    if(!duelo&&t>=buscarEm){
      buscarEm=t+.2;
      const pode=b=>b.visible&&b.parent&&!ocupados.has(b)&&t>=(descanso.get(b)||0);
      const bichos=[...nav.atores].filter(a=>!a.sombrio&&pode(a.g));
      for(const monstro of nav.atores){
        const m=monstro.g;
        if(!monstro.sombrio||!pode(m))continue;
        let alvo=null, id=null, melhor=2.5**2;
        for(const [nome,b] of moradores){
          if(!pode(b))continue;
          const d=distancia(b,m);
          if(d<melhor){melhor=d;alvo=b;id=nome;}
        }
        for(const a of bichos){
          if(ocupados.has(a.g))continue;
          const d=distancia(a.g,m);
          if(d<melhor){melhor=d;alvo=a.g;id=null;}
        }
        if(!alvo)continue;
        const nomeAlvo=id||alvo.userData.caminhante.tipo;
        const venceu=roteiro.forca(m)>roteiro.forca(alvo,id);
        const x=(m.position.x+alvo.position.x)*.5,z=(m.position.z+alvo.position.z)*.5;
        const a=alvo.userData.caminhante;
        const par=[{b:m,a:monstro,contra:alvo,vence:venceu},{b:alvo,a,contra:m,vence:!venceu}];
        for(const k of par){
          ocupados.add(k.b);
          k.local=k.b.position.clone();
          k.face=Math.atan2(k.contra.position.x-k.local.x,k.contra.position.z-k.local.z);
          if(k.a){k.a.dueloSombrio=true;k.a.vel=0;}
        }
        if(id!=null)moradoresEmLuta.add(id);
        confrontos.add({par,monstro,nomeAlvo,id,venceu,inicio:t,x,z});
        registrar({evento:"inicio",tempo:t,monstro:monstro.tipo,id:monstro.id,oponente:nomeAlvo,distancia:Math.sqrt(melhor)});
      }
    }
    let efeito=null;
    for(const luta of confrontos){
      const {par,monstro,nomeAlvo,id,venceu,inicio,x,z}=luta;
      const tempo=t-inicio;
      if(tempo>=8.8||par.some(k=>!k.b.parent)){
        for(const k of par){
          ocupados.delete(k.b); descanso.set(k.b,t+18);
          if(k.a){k.a.dueloSombrio=false;k.a.dueloPose=null;k.a.golpe=null;k.a.face=null;}
          if(!k.a)k.b.rotation.z=0;
        }
        if(!venceu){
          if(monstro.invasaoVi!=null)monstro.recolhido=true;
          monstro.g.visible=false; monstro.derrotadoAte=t+60; monstro.trilha=[];
          nav.atores.delete(monstro); reaparecem.add(monstro);
        }else {
          const perdedor=par[1].a;
          if(perdedor){const {face}=par[1];passeio.ir(perdedor,perdedor.x-5*Math.sin(face),perdedor.z-5*Math.cos(face),true);}
        }
        if(id!=null)moradoresEmLuta.delete(id);
        confrontos.delete(luta);
        registrar({evento:"fim",tempo:t,inicio,duracao:tempo,monstro:monstro.tipo,id:monstro.id,oponente:nomeAlvo,vencedor:venceu?monstro.tipo:nomeAlvo});
        continue;
      }
      for(const k of par){
        const p=VilaLuta.pose(tempo,k.vence), tipo=k.a?.tipo;
        const ataque=p.fase==="golpe"?roteiro.ataque(tipo):null;
        if(k.a){
          k.a.dueloPose=p;k.a.golpe=ataque;
          k.b.rotation.y=k.face;
          if(tipo==="fantasma"){k.b.rotation.z=p.roll*.65;k.b.position.y=k.local.y+p.y*.45;}
        }else{
          k.b.visible=true;k.b.position.copy(k.local);
          k.b.position.y+=p.y*.45;k.b.rotation.set(p.tilt*.5,k.face,p.roll*.65,"YXZ");
          k.b.userData.play?.(ataque||({queda:"Death_A",impacto:"Hit_A",vitoria:"Cheer",esquiva:"Walking_Backwards",guarda:"Blocking"})[p.fase]||"Idle");
        }
      }
      efeito??={tempo,x,z,espelho:venceu?1:-1};
    }
    return efeito;
  }
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
  return {atualizar,encontrosSombrios,moradoresEmLuta:()=>moradoresEmLuta,registroSombrio:()=>registro.slice(),particulas:g,sacudir(t){camera.position.x+=tremor*Math.sin(t*139);camera.position.y+=tremor*Math.cos(t*157);}};
}

