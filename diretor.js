/* O diretor empresta atores do jogo e devolve suas transformações ao sair. */
function criarDiretor(ctx) {
  const {scene,camera,renderer,paisagem,canvas,sol,hemi,amb,lua}=ctx;
  const eventos=["luta","festa","mutirao","chuva","visita"], duracao=9;
  const nomes={luta:"lobo-e-javali",festa:"festa-das-lanternas",mutirao:"mutirao-do-jardim",chuva:"chuva-no-rio-claro",visita:"visita-ao-pomar"};
  const btn=document.querySelector("#btnDiretor"), painel=document.querySelector("#painelDiretor");
  const status=document.querySelector("#estadoDiretor"), escolha=document.querySelector("#eventoDiretor");
  const palco=new THREE.Group(), notas=new Map(), atores=[], guardados=[];
  palco.visible=false;scene.add(palco);
  const props=new THREE.Group();palco.add(props);
  const locais={luta:[51.1,-98.5,1.45],festa:[51.6,-99.2,1.57],mutirao:[51.7,-97.7,1.49],chuva:[52.4,6.8,1.17],visita:[51.5,-97.7,1.52]};
  let tipo=null, inicio=0,ultimoT=0,ultimoFrame=-1,captura=false,abortado=false,salvo,voz,ctxAudio;
  const matCache=new Map();
  function mat(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshLambertMaterial({color}));return matCache.get(color);}
  const madeira=mat(0x855738), pal=[0xd9866e,0xf0cc80,0x70a59a,0xc7a0bb];
  function peca(g,m,x,y,z,p=props){
    const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
  }
  const partes={festa:new THREE.Group(),mutirao:new THREE.Group(),visita:new THREE.Group()};
  props.add(...Object.values(partes));
  const lanternas=[],tecidos=[];
  const luzFesta=new THREE.PointLight(0xffae61,1.35,9,2);luzFesta.position.set(-1.1,2.8,1.75);partes.festa.add(luzFesta);
  const luzLilas=new THREE.PointLight(0xe9b5d7,.74,7,2);luzLilas.position.set(2,2,-.4);partes.festa.add(luzLilas);
  const seg=(a,b,m,r,p)=>{
    const d=b.clone().sub(a),bar=peca(new THREE.CylinderGeometry(r,r,d.length(),6),m,0,0,0,p);
    bar.position.copy(a).lerp(b,.5);bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return bar;
  };
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  // Um varal em arco deixa o centro livre para os rostos.
  for(const x of [-3.05,3.05])peca(new THREE.CylinderGeometry(.057,.092,4,8),madeira,x,2,-1.2,partes.festa);
  let ant=v(-3.05,4,-1.2);
  for(let i=1;i<=16;i++){
    const k=i/16,x=-3.05+6.1*k,y=4-.63*Math.sin(k*Math.PI),p=v(x,y,-1.2);
    seg(ant,p,madeira,.018,partes.festa);ant=p;
    if(i===16)break;
    if(i%4===0){
      const lamp=peca(new THREE.SphereGeometry(.19,10,7),new THREE.MeshStandardMaterial({color:0xffcf83,emissive:0xd57b28,emissiveIntensity:.6}),x,y-.21,-1.2,partes.festa);
      lamp.scale.y=1.24;peca(new THREE.CylinderGeometry(.09,.09,.05,8),madeira,x,y-.43,-1.2,partes.festa);lanternas.push(lamp);
    }else{
      const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([-.14,0,0,.14,0,0,.02,-.32,.05],3));g.computeVertexNormals();
      const m=mat(pal[i%4]);m.side=THREE.DoubleSide;tecidos.push(peca(g,m,x,y-.02,-1.2,partes.festa));
    }
  }
  const caixa=peca(new THREE.BoxGeometry(1.5,.26,.75),madeira,0,.15,0,partes.mutirao);
  const mudas=[];
  for(let i=0;i<7;i++){
    const x=-.62+i*.2,z=.09*Math.sin(i*3);
    const folha=peca(new THREE.IcosahedronGeometry(.14,0),mat(i%2?0xa1ba70:0x78a167),x,.40,z,partes.mutirao);
    folha.scale.y=1.7;mudas.push(folha);
  }
  const cesto=peca(new THREE.CylinderGeometry(.33,.25,.39,9),mat(0xbc8860),0,.25,.17,partes.visita);
  for(let i=0;i<7;i++)peca(new THREE.IcosahedronGeometry(.10,1),mat(i%2?0xebba68:0xcd6b49),.19*Math.cos(i),.50,.17+.16*Math.sin(i),partes.visita);
  const poeira=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff}),84);
  const aux=new THREE.Object3D();poeira.frustumCulled=false;palco.add(poeira);
  for(let i=0;i<84;i++)poeira.setColorAt(i,new THREE.Color([0xfce6a0,0xf3aa64,0xb7d5aa,0xe8a89c][i%4]));
  const pingos=new Float32Array(220*6),gg=new THREE.BufferGeometry();
  gg.setAttribute("position",new THREE.BufferAttribute(pingos,3));
  const chuva=new THREE.LineSegments(gg,new THREE.LineBasicMaterial({color:0xaac8d2,transparent:true,opacity:.59}));chuva.frustumCulled=false;palco.add(chuva);
  function esconder(o){if(o.visible){guardados.push(()=>o.visible=true);o.visible=false;}}
  function emprestar(o){
    o.userData.caminhante?.rig?.soltar();
    const pos=o.position.clone(),rot=o.rotation.clone(),vis=o.visible,parent=o.parent;
    guardados.push(()=>{parent.add(o);o.position.copy(pos);o.rotation.copy(rot);o.visible=vis;});
    palco.add(o);o.visible=true;atores.push(o);
    o.traverse(ch=>{if(ch.userData.cullOculto){ch.visible=true;guardados.push(()=>ch.visible=false);}});
    if(o.userData.vis)esconder(o.userData.vis);if(o.userData.cavalo)esconder(o.userData.cavalo);
  }
  function resolve(s){if(s==="aleatorio")return eventos[Math.floor(Math.random()*eventos.length)];if(!eventos.includes(s))throw Error("Evento desconhecido.");return s;}
  function preparar(s){
    if(tipo) restaurar();
    const elenco=ctx.elenco(s);if(elenco.length<(s==="chuva"?1:2)||elenco.some(o=>!o))throw Error("Aguarde o carregamento dos personagens.");
    tipo=s;const [x,z,ang]=locais[tipo];palco.position.set(x,0,z);palco.rotation.y=ang;palco.visible=true;
    salvo={ratio:renderer.getPixelRatio(),fov:camera.fov,near:camera.near,sol:sol.position.clone(),alvo:sol.target.position.clone(),
      hemi:hemi.color.clone(),base:hemi.groundColor.clone(),solCor:sol.color.clone(),fog:scene.fog.color.clone(),sn:sol.shadow.camera.left};
    // Guarde os estados antes de emprestar qualquer ator.
    scene.traverse(o=>{if(o.isSprite)esconder(o);});
    ctx.ocultar().forEach(o=>{if(o&&!elenco.includes(o))esconder(o);});
    elenco.forEach(emprestar);Object.entries(partes).forEach(([k,o])=>o.visible=k===s);
    chuva.visible=s==="chuva";poeira.visible=s==="luta"||s==="festa";
    document.body.classList.add("dir-rodando");painel.close();btn.blur();
    ctx.pararMusica();renderer.setPixelRatio(1);dimensionar();inicio=performance.now();ultimoT=0;ultimoFrame=-1;
    orbitaLuz(x,z); desenhar(0);
  }
  function orbitaLuz(x,z){
    sol.position.set(x+14,23,z+16);sol.target.position.set(x,0,z);
    Object.assign(sol.shadow.camera,{left:-15,right:15,top:15,bottom:-15});sol.shadow.camera.updateProjectionMatrix();
    sol.color.setHex(tipo==="chuva"?0xd6e6ed:0xffdfb0);sol.intensity=tipo==="chuva"?.77:1.45;
    hemi.color.setHex(0xd9edff);hemi.groundColor.setHex(0xa8ae86);hemi.intensity=.66;amb.intensity=.37;lua.intensity=.12;
    scene.background.setHex(tipo==="chuva"?0x9eaeb1:0xa6c9d3);scene.fog.color.setHex(tipo==="chuva"?0xc3cecc:0xc9d5cd).convertSRGBToLinear();
    if(tipo==="festa"){
      sol.color.setHex(0xffb473);sol.intensity=.65;sol.position.y=10;
      hemi.color.setHex(0xa3b9e9);hemi.groundColor.setHex(0xb69a9b);hemi.intensity=.62;
      scene.background.setRGB(.51,.53,.68);scene.fog.color.setRGB(.55,.47,.52);luzFesta.visible=luzLilas.visible=true;
    }
    scene.fog.near=13;scene.fog.far=tipo==="chuva"?57:104;renderer.toneMappingExposure=.95;
  }
  function dimensionar(){
    if(!tipo)return false;
    const altura=captura?1920:Math.min(1152,Math.max(480,innerHeight)),largura=captura?1080:Math.round(altura*9/16);
    renderer.setSize(largura,altura,false);camera.aspect=9/16;camera.fov=37;camera.updateProjectionMatrix();return true;
  }
  function restaurar(){
    if(!tipo)return;
    if(voz){try{voz.stop();}catch{}voz=null;}
    palco.visible=false;for(const f of guardados.reverse())f();guardados.length=0;atores.length=0;
    scene.fog.color.copy(salvo.fog);hemi.color.copy(salvo.hemi);hemi.groundColor.copy(salvo.base);sol.color.copy(salvo.solCor);
    sol.target.position.copy(salvo.alvo);sol.position.copy(salvo.sol);const r=-salvo.sn;
    Object.assign(sol.shadow.camera,{left:-r,right:r,top:r,bottom:-r});sol.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
    camera.fov=salvo.fov;camera.near=salvo.near;renderer.setPixelRatio(salvo.ratio);tipo=null;document.body.classList.remove("dir-rodando");
    ctx.redimensionar();ctx.voltarMusica();
  }
  const mira=new THREE.Vector3(),olho=new THREE.Vector3();
  function desenhar(t){
    const dt=Math.min(.10,Math.max(0,t-ultimoT));ultimoT=t;const luta=tipo==="luta";
    for(let i=0;i<atores.length;i++){
      const o=atores[i],u=o.userData;
      if(luta){
        const p=VilaLuta.pose(t,i===0);VilaLuta.aplicar(o,p,0,0);
        u.play(p.fase==="golpe"?(i===0?"Attack":"Attack_Headbutt"):p.fase==="esquiva"?"Gallop":"Idle");
      }else{
        const f=t*3+i*1.8,chega=VilaLuta.suave(t,.3,3.25);
        let x=(i-(atores.length-1)*.5)*1.19,z=i%2?-.48:0,y=0,yaw=-.12*x,clip="Idle";
        if(tipo==="festa"){y=.12*Math.max(0,Math.sin(f*1.6));x+=Math.sin(f)*.19;z+=.32*Math.sin(t*1.27+i*1.9);yaw+=.40*Math.sin(f*.64);clip=(Math.floor(t/2.3)+i)%3?"Cheer":"Interact";}
        if(tipo==="visita"){x=i===0?-3.3+chega*2.36:1.15;yaw=i===0?1.13:-1.02;clip=i===0&&t<3.25?"Walking_A":t<6.4?"Interact":"Cheer";}
        if(tipo==="mutirao"){x=i===0?-1.25:1.24;z=-.43;yaw=i===0?1.08:-1.08;clip=t<6.5?(i?"Interact":"PickUp"):"Cheer";}
        if(tipo==="chuva"){x=-1.1+2.2*VilaLuta.suave(t,.2,8.8);yaw=1.58;clip=u.tipo?"Walk":"Walking_A";}
        o.position.set(x,y,z);o.rotation.set(0,yaw,0);u.play(clip);
      }
      u.mixer?.update(dt);
    }
    mudas.forEach((o,i)=>o.scale.y=.09+1.65*VilaLuta.suave(t,1+i*.55,2+i*.55));
    tecidos.forEach((o,i)=>o.rotation.x=.18*Math.sin(t*2.3+i));lanternas.forEach((o,i)=>o.rotation.z=.11*Math.sin(t*2+i));
    if(poeira.visible){
      for(let i=0;i<84;i++){
        const a=i*2.399,b=i%11/11,hit=VilaLuta.impactos[Math.floor(i/28)],u=t-hit;
        if(luta){
          const x=hit<4?-.64:hit<6?.75:1.34,raio=(.5+b)*u*2.3;
          aux.position.set(x+Math.cos(a)*raio,.55+(2.1+b*1.6)*u-4*u*u,Math.sin(a)*raio);
          aux.scale.setScalar(u>=0&&u<.7?.065*(1-u/.7)*(1+b):0);
        }else{
          const alt=4.9-((t*(.62+b*.3)+i*.31)%4.9);
          aux.position.set(Math.sin(i*14.3)*2.55+.37*Math.sin(t*2+i),alt,Math.cos(i*3.4)*1.65);
          aux.scale.set(.039,.02,.056);
        }
        aux.rotation.set(t*2+i,a,t*4);aux.updateMatrix();poeira.setMatrixAt(i,aux.matrix);
      }
      poeira.instanceMatrix.needsUpdate=true;
    }
    if(chuva.visible){
      for(let i=0;i<220;i++){const k=i*6,x=6*Math.sin(i*17.1),y=6-((t*6.9+i*.39)%6),z=5*Math.cos(i*12.3);pingos.set([x,y,z,x-.035,y-.22,z+.02],k);}
      gg.attributes.position.needsUpdate=true;
    }
    const u=t/duracao,camX=.78-1.36*u,altura=luta?2.65-.41*u:2.81+.30*Math.cos(t*.46);
    const triunfo=luta?VilaLuta.suave(t,7.08,8.42):0;
    const dist=luta?13.3-1.0*Math.sin(Math.PI*u)-4.7*triunfo:12.5-1.59*Math.sin(Math.PI*u);
    camera.near=.35;camera.updateProjectionMatrix();
    const tremor=luta?VilaLuta.efeito(t)*.057:0;
    olho.set(camX+(luta?2.8*(1-triunfo):0)+tremor*Math.sin(t*129),altura+tremor*Math.cos(t*141),dist);
    mira.set(luta?.20-.97*triunfo:.02,luta?1.13-.19*triunfo:1.65,-.25);
    palco.localToWorld(olho);palco.localToWorld(mira);camera.position.copy(olho);camera.lookAt(mira);camera.updateMatrixWorld();
    paisagem.atualizar(t,tipo==="chuva"?.55:tipo==="festa"?.42:.95,scene.background);ctx.ambiente(t);
    renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  }
  function audio(s){if(!notas.has(s))notas.set(s,somDaCena(s,duracao));return notas.get(s);}
  function ouvir(s){
    ctxAudio??=new AudioContext();ctxAudio.resume().catch(()=>{});
    voz=ctxAudio.createBufferSource();voz.buffer=audio(s);voz.connect(ctxAudio.destination);voz.start();
  }
  function mostrar(){if(!painel.open)painel.showModal();}
  function previa(s){if(captura)return;preparar(resolve(s));ouvir(tipo);}
  function tick(now){
    if(!tipo)return false;if(captura)return true;
    const t=(now-inicio)/1000;if(t>=duracao){restaurar();mostrar();}else if(Math.floor(t*60)!==ultimoFrame){ultimoFrame=Math.floor(t*60);desenhar(t);}return true;
  }
  async function gravar(s){
    if(captura)return;const id=resolve(s);captura=true;abortado=false;let out;
    try{
      if(!window.VideoEncoder)throw Error("Abra o jogo local no Chrome ou Edge para gravar.");
      const m=await import("./lib/mediabunny.min.mjs");
      const vc=await m.getFirstEncodableVideoCodec(["avc","vp9"],{width:1080,height:1920,bitrate:10500000});
      const ac=await m.getFirstEncodableAudioCodec(["aac","opus"],{numberOfChannels:2,sampleRate:48000,bitrate:128000});
      if(!vc||!ac)throw Error("O navegador não oferece os codecs de vídeo e áudio necessários.");
      preparar(id);out=new m.Output({format:new m.Mp4OutputFormat({fastStart:"in-memory"}),target:new m.BufferTarget()});
      const video=new m.CanvasSource(canvas,{codec:vc,bitrate:10500000,keyFrameInterval:1});
      const som=new m.AudioBufferSource({codec:ac,bitrate:128000});
      out.addVideoTrack(video,{frameRate:60});out.addAudioTrack(som);await out.start();
      await som.add(audio(id));som.close();
      for(let i=0;i<duracao*60;i++){
        if(abortado)throw Error("Gravação cancelada.");
        desenhar(i/60);await video.add(i/60,1/60);
        if(i%15===0){document.querySelector("#sairDiretor").textContent="Cancelar · "+Math.round(i/(duracao*60)*100)+"%";await new Promise(r=>setTimeout(r,0));}
      }
      video.close();await out.finalize();const blob=new Blob([out.target.buffer],{type:"video/mp4"}),link=document.createElement("a");
      const nome="vila-aurora_"+nomes[id]+"_"+new Date().toISOString().replace(/[:.]/g,"-")+".mp4";
      link.href=URL.createObjectURL(blob);link.download=nome;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),60000);
      status.textContent="MP4 salvo nos downloads · 1080 × 1920 · 60 fps";return nome;
    }catch(e){if(out?.state==="started")await out.cancel();status.textContent=e.message;throw e;}
    finally{captura=false;restaurar();document.querySelector("#sairDiretor").textContent="Encerrar prévia";mostrar();}
  }
  function sair(){if(captura){abortado=true;return;}restaurar();mostrar();}
  btn.addEventListener("click",mostrar);document.querySelector("#fecharDiretor").onclick=()=>painel.close();
  document.querySelector("#previaDiretor").onclick=()=>{try{previa(escolha.value);}catch(e){status.textContent=e.message;}};
  document.querySelector("#gravarDiretor").onclick=()=>gravar(escolha.value).catch(()=>{});
  document.querySelector("#sairDiretor").onclick=sair;
  window.addEventListener("keydown",e=>{if(e.key==="Escape"&&tipo){e.preventDefault();sair();}});
  return {previa,gravar,sair,dimensionar,tick,get ativo(){return tipo;},get gravando(){return captura;}};
}

