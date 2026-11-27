/* O diretor empresta atores do jogo e devolve suas transformações ao sair. */
function criarDiretor(ctx) {
  const {scene,camera,renderer,paisagem,canvas,sol,hemi,amb,lua}=ctx;
  const forja = s => s === "argola" || s === "suporte";
  const eventos=["luta","festa","mutirao","chuva","visita"], duracao=9;
  const nomes={argola:"argola-da-forja",suporte:"suporte-do-pomar",luta:"lobo-e-javali",festa:"festa-das-lanternas",mutirao:"mutirao-do-jardim",chuva:"chuva-no-rio-claro",visita:"visita-ao-pomar"};
  const btn=document.querySelector("#btnDiretor"), painel=document.querySelector("#painelDiretor");
  const status=document.querySelector("#estadoDiretor"), escolha=document.querySelector("#eventoDiretor");
  const palco=new THREE.Group(), notas=new Map(), atores=[], guardados=[];
  palco.visible=false;scene.add(palco);
  const props=new THREE.Group();palco.add(props);
  const locais={argola:[51.6,-99.2,1.57],suporte:[51.6,-99.2,1.57],luta:[51.1,-98.5,1.45],festa:[51.6,-99.2,1.57],mutirao:[51.7,-97.7,1.49],chuva:[52.4,6.8,1.17],visita:[51.5,-97.7,1.52]};
  let tipo=null, inicio=0,ultimoT=0,ultimoFrame=-1,captura=false,abortado=false,congelado=false,salvo,voz,ctxAudio;
  const matCache=new Map();
  function mat(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshLambertMaterial({color}));return matCache.get(color);}
  const madeira=mat(0x855738), pal=[0xd9866e,0xf0cc80,0x70a59a,0xc7a0bb];
  function peca(g,m,x,y,z,p=props){
    const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;
  }
  const partes={argola:new THREE.Group(),suporte:new THREE.Group(),festa:new THREE.Group(),mutirao:new THREE.Group(),visita:new THREE.Group()};
  props.add(...Object.values(partes));
  const lanternas=[],tecidos=[];
  const luzFesta=new THREE.PointLight(0xffae61,1.35,9,2);luzFesta.position.set(-1.1,2.8,1.75);partes.festa.add(luzFesta);
  const luzLilas=new THREE.PointLight(0xe9b5d7,.74,7,2);luzLilas.position.set(2,2,-.4);partes.festa.add(luzLilas);
  const seg=(a,b,m,r,p)=>{
    const d=b.clone().sub(a),bar=peca(new THREE.CylinderGeometry(r,r,d.length(),6),m,0,0,0,p);
    bar.position.copy(a).lerp(b,.5);bar.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return bar;
  };
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const lampadasForja = {};
  for (const nome of ["argola","suporte"]) {
    const grupo=partes[nome], alta=nome==="argola", x=.77, z=.22;
    const ferro=mat(0x59606a), bronze=mat(0xb99051);
    const altura=alta?2.30:.85;
    for(let i=0;i<3;i++) {
      peca(new THREE.BoxGeometry(2.8,.14*(i+1),.52),mat(0x74695c),.05,.07*(i+1),.80-i*.52,grupo);
    }
    if(alta) {
      seg(v(1.30,0,z),v(1.30,2.99,z),madeira,.085,grupo);
      seg(v(1.36,2.91,z),v(x,2.91,z),ferro,.060,grupo);
      peca(new THREE.TorusGeometry(.19,.045,8,32),bronze,x,2.73,z,grupo);
    } else {
      peca(new THREE.CylinderGeometry(.28,.36,.12,8),ferro,x,.28,z,grupo);
      seg(v(x,.30,z),v(x,.62,z),ferro,.083,grupo);
    }
    const vidro=new THREE.MeshStandardMaterial({color:0xffb766,emissive:0xff941e,emissiveIntensity:0});
    peca(new THREE.CylinderGeometry(.19,.17,.42,8),vidro,x,altura,z,grupo);
    for(const y of [altura-.23,altura+.23])
      peca(new THREE.CylinderGeometry(.15,.25,.08,8),ferro,x,y,z,grupo);
    for(const dx of [-.15,.15]) seg(v(x+dx,altura-.21,z+.10),v(x+dx,altura+.21,z+.10),bronze,.023,grupo);
    const luz=new THREE.PointLight(0xffac50,0,5,2);
    luz.position.set(x-.2,altura+.06,z+.25);grupo.add(luz);
    lampadasForja[nome]={vidro,luz};
  }
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

  // Planos por evento: [início, fim, olho0, olho1, mira0, mira1, abertura]. No vertical, a ação fica em profundidade.
  const PLANOS={
    luta:[[0,2.72,[-5.3,1.75,1.5],[-4.7,1.5,1.25],[.2,.65,-.1],[.3,.65,-.1],36],
          [2.72,4.5,[4.2,1.9,4.3],[3.6,1.6,3.9],[-.3,.55,-.1],[-.4,.55,-.1],38],
          [4.5,6.95,[-3.9,1.05,2.3],[-3.1,.9,2.6],[.9,.5,-.1],[1.3,.5,-.1],38],
          [6.95,9,[-4.7,.6,4.0],[-4.4,.7,3.7],[-.5,.85,0],[-.4,.95,0],36]],
    festa:[[0,3.1,[.9,.95,8.8],[.2,1.0,7.6],[0,2.0,-.5],[0,2.15,-.6],40],
           [3.1,6.1,[-3.8,1.3,4.7],[-2.9,1.25,4.9],[.1,1.25,.1],[.1,1.3,.1],38],
           [6.1,9,[1.7,.6,6.9],[.5,.7,6.2],[0,2.0,-.5],[0,2.2,-.6],40]],
    mutirao:[[0,3,[-4.4,2.3,4.5],[-3.8,2.0,4.1],[0,.7,-.3],[0,.7,-.3],40],
             [3,6.1,[2.0,2.9,2.1],[1.7,2.6,1.8],[.15,.3,.05],[.1,.3,.05],38],
             [6.1,9,[4.5,1.25,2.3],[3.9,1.1,2.6],[-.2,.95,-.4],[-.3,1.05,-.4],40]],
    visita:[[0,3.25,[3.9,1.75,1.5],[3.5,1.6,1.4],[-1.5,.85,0],[-.6,.85,0],40],
            [3.25,6.4,[-.5,1.15,3.1],[-.1,1.0,2.7],[.1,.72,.1],[.1,.78,.1],38],
            [6.4,9,[-3.4,.85,3.4],[-2.9,.9,3.0],[.15,1.0,-.1],[.2,1.1,-.1],40]],
    chuva:[[0,3,[1.4,2.3,9.6],[.7,1.95,8.3],[0,1.35,-.4],[0,1.3,-.4],37,0],
           [3,6.2,[3.0,.75,2.6],[2.7,.7,2.3],[0,.55,0],[0,.55,0],38,1],
           [6.2,9,[3.9,.7,3.5],[3.3,.65,3.1],[0,.65,-.2],[0,.7,-.2],40,1]]
  };
  const pt=(a,b,k,o)=>o.set(a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k);
  function plano(t){
    const lista=PLANOS[tipo];if(!lista)return 37;
    const q=lista.find(p=>t<p[1])||lista[lista.length-1],k0=Math.min(1,Math.max(0,(t-q[0])/(q[1]-q[0]))),k=.25*k0+.75*k0*k0*(3-2*k0);
    pt(q[2],q[3],k,olho);pt(q[4],q[5],k,mira);
    if(q[7]&&atores[0])mira.x+=atores[0].position.x,olho.x+=atores[0].position.x*.55;
    return q[6];
  }
  // Pausa de impacto: a pose congela por um instante no golpe e depois alcança o relógio.
  function tempoLuta(t){let a=0;for(const h of VilaLuta.impactos){const u=t-h;if(u>0)a+=u<.085?u:.085*Math.max(0,1-(u-.085)/.45);}return t-a;}

  const vinheta=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,
    vertexShader:"varying vec2 q;void main(){q=position.xy;gl_Position=vec4(position.xy,0.,1.);}",
    fragmentShader:"varying vec2 q;void main(){float r=length(q*vec2(.80,1.));gl_FragColor=vec4(.05,.04,.09,smoothstep(.60,1.30,r)*.44);}"}));
  vinheta.frustumCulled=false;vinheta.renderOrder=9999;palco.add(vinheta);
  const halos=[];
  { const c=document.createElement("canvas");c.width=c.height=128;const g=c.getContext("2d"),gr=g.createRadialGradient(64,64,0,64,64,64);
    gr.addColorStop(0,"rgba(255,226,160,.95)");gr.addColorStop(.28,"rgba(255,176,90,.42)");gr.addColorStop(1,"rgba(255,140,60,0)");g.fillStyle=gr;g.fillRect(0,0,128,128);
    const tex=new THREE.CanvasTexture(c);
    lanternas.forEach(l=>{const h=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));
      h.userData.cena=true;h.position.copy(l.position);h.scale.setScalar(1.5);partes.festa.add(h);halos.push(h);}); }
  function esconder(o){if(o.visible){guardados.push(()=>o.visible=true);o.visible=false;}}
  function emprestar(o){
    o.userData.caminhante?.rig?.soltar();
    const pos=o.position.clone(),rot=o.rotation.clone(),vis=o.visible,parent=o.parent;
    guardados.push(()=>{parent.add(o);o.position.copy(pos);o.rotation.copy(rot);o.visible=vis;});
    palco.add(o);o.visible=true;atores.push(o);
    o.traverse(ch=>{if(ch.userData.cullOculto){ch.visible=true;guardados.push(()=>ch.visible=false);}});
    if(o.userData.vis)esconder(o.userData.vis);if(o.userData.cavalo)esconder(o.userData.cavalo);
  }
  function resolve(s){if(s==="aleatorio")return eventos[Math.floor(Math.random()*eventos.length)];if(!eventos.includes(s) && !forja(s))throw Error("Evento desconhecido.");return s;}
  function preparar(s){
    if(tipo) restaurar();
    const elenco=ctx.elenco(s);if(elenco.length<(s==="chuva" || forja(s)?1:2)||elenco.some(o=>!o))throw Error("Aguarde o carregamento dos personagens.");
    tipo=s;const [x,z,ang]=locais[tipo];palco.position.set(x,0,z);palco.rotation.y=ang;palco.visible=true;
    salvo={ratio:renderer.getPixelRatio(),fov:camera.fov,near:camera.near,sol:sol.position.clone(),alvo:sol.target.position.clone(),
      hemi:hemi.color.clone(),base:hemi.groundColor.clone(),lua:lua.color.clone(),solCor:sol.color.clone(),fog:scene.fog.color.clone(),sn:sol.shadow.camera.left};
    // Guarde os estados antes de emprestar qualquer ator.
    scene.traverse(o=>{if(o.isSprite&&!o.userData.cena)esconder(o);});
    ctx.ocultar().forEach(o=>{if(o&&!elenco.includes(o))esconder(o);});
    elenco.forEach(emprestar);Object.entries(partes).forEach(([k,o])=>o.visible=k===s);
    chuva.visible=s==="chuva";poeira.visible=s==="luta"||s==="festa";poeira.material.color.setHex(s==="luta"?0xd8c49c:0xffffff);congelado=false;
    document.body.classList.add("dir-rodando");painel.close();btn.blur();
    ctx.pararMusica();renderer.setPixelRatio(1);dimensionar();inicio=performance.now();ultimoT=0;ultimoFrame=-1;
    orbitaLuz(x,z); desenhar(0);
  }
  function orbitaLuz(x,z){
    const chave=v(-9,10,9.5),contra=v(7,7.5,-12);palco.updateMatrixWorld(true);palco.localToWorld(chave);palco.localToWorld(contra);
    if(forja(tipo))sol.position.set(x+14,23,z+16);else sol.position.copy(chave);
    sol.target.position.set(x,0,z);
    Object.assign(sol.shadow.camera,{left:-15,right:15,top:15,bottom:-15});sol.shadow.camera.updateProjectionMatrix();
    sol.color.setHex(tipo==="chuva"?0xd6e6ed:0xffd9a6);sol.intensity=tipo==="chuva"?.77:1.5;
    hemi.color.setHex(0xd4e6ff);hemi.groundColor.setHex(0xb0ad84);hemi.intensity=.64;amb.intensity=.36;
    lua.position.copy(contra);lua.color.setHex(tipo==="chuva"?0xbdd2e4:0xffe3bd);lua.intensity=forja(tipo)?.12:tipo==="chuva"?.30:.58;
    scene.background.setHex(tipo==="chuva"?0x9eaeb1:0xa6c9d3);scene.fog.color.setHex(tipo==="chuva"?0xc3cecc:0xc9d5cd).convertSRGBToLinear();
    if(tipo==="festa"){
      sol.color.setHex(0xff9f68);sol.intensity=.62;sol.position.y=7.5;
      hemi.color.setHex(0x93a8e6);hemi.groundColor.setHex(0xa98b96);hemi.intensity=.60;lua.color.setHex(0x9fb6ff);lua.intensity=.55;
      scene.background.setRGB(.38,.39,.62);scene.fog.color.setRGB(.50,.42,.54);luzFesta.visible=luzLilas.visible=true;luzFesta.intensity=1.9;
    }
    if(forja(tipo)){
      sol.intensity=.23;hemi.intensity=.36;amb.intensity=.18;
      scene.background.setRGB(.16,.19,.30);scene.fog.color.setRGB(.21,.22,.29);
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
    scene.fog.color.copy(salvo.fog);hemi.color.copy(salvo.hemi);lua.color.copy(salvo.lua);congelado=false;hemi.groundColor.copy(salvo.base);sol.color.copy(salvo.solCor);
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
        const p=VilaLuta.pose(tempoLuta(t),i===0);VilaLuta.aplicar(o,p,0,0);
        u.play(p.fase==="golpe"?(i===0?"Attack":"Attack_Headbutt"):p.fase==="esquiva"?"Gallop":"Idle");
      }else{
        const f=t*3+i*1.8,chega=VilaLuta.suave(t,.3,3.25);
        let x=(i-(atores.length-1)*.5)*1.19,z=i%2?-.48:0,y=0,yaw=-.12*x,clip="Idle";
        if(tipo==="festa"){x=(i-(atores.length-1)*.5)*1.08+Math.sin(f)*.10;z=(i===1?.55:-.35)+.13*Math.sin(t*1.27+i*1.9);y=.13*Math.max(0,Math.sin(f*1.6));yaw=-.16*x+.36*Math.sin(f*.64);clip=(Math.floor(t/2.3)+i)%3?"Cheer":"Interact";}
        if(forja(tipo)){x=-.49;z=-.12;yaw=.75;clip=t<2?"Interact":"Idle";}
        if(tipo==="visita"){x=i===0?-3.3+chega*2.36:1.15;yaw=i===0?1.13:-1.02;clip=i===0&&t<3.25?"Walking_A":t<6.4?"Interact":"Cheer";}
        if(tipo==="mutirao"){x=i===0?-1.25:1.24;z=-.43;yaw=i===0?1.08:-1.08;clip=t<6.5?(i?"Interact":"PickUp"):"Cheer";}
        if(tipo==="chuva"){x=-1.1+2.2*VilaLuta.suave(t,.2,8.8);yaw=1.58;clip=u.tipo?"Walk":"Walking_A";}
        o.position.set(x,y,z);o.rotation.set(0,yaw,0);u.play(clip);
      }
      u.mixer?.update(dt);
    }
    mudas.forEach((o,i)=>o.scale.y=.09+1.65*VilaLuta.suave(t,1+i*.55,2+i*.55));
    tecidos.forEach((o,i)=>o.rotation.x=.18*Math.sin(t*2.3+i));lanternas.forEach((o,i)=>{o.rotation.z=.11*Math.sin(t*2+i);const pisca=1+.13*Math.sin(t*5.3+i*2.1)+.07*Math.sin(t*11.7+i);o.material.emissiveIntensity=1.45*pisca;halos[i].scale.setScalar(1.45*pisca);});
    if(poeira.visible){
      for(let i=0;i<84;i++){
        const a=i*2.399,b=i%11/11,hit=VilaLuta.impactos[Math.floor(i/28)],u=t-hit;
        if(luta){
          const x=hit<4?-.64:hit<6?.75:1.34,raio=(.5+b)*u*2.3;
          aux.position.set(x+Math.cos(a)*raio,.55+(2.1+b*1.6)*u-4*u*u,Math.sin(a)*raio);
          aux.scale.setScalar(u>=0&&u<.7?.046*(1-u/.7)*(1+b):0);
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
    const golpe=luta?VilaLuta.efeito(t):0,tremor=golpe*.07;
    olho.set(.4,2.35,6.95);mira.set(.26,1.48,0);
    camera.fov=plano(t)-2.4*golpe;camera.near=.2;camera.updateProjectionMatrix();
    olho.x+=tremor*Math.sin(t*129);olho.y+=tremor*Math.cos(t*141);
    if(forja(tipo)){
      const {vidro,luz}=lampadasForja[tipo], brilho=VilaLuta.suave(t,.40,1.22);
      vidro.emissiveIntensity=brilho*1.8;luz.intensity=brilho*3.4;
      olho.set(.38+.30*Math.cos(t*.45),2.35,6.95);mira.set(.26,1.48,0);
    }
    palco.localToWorld(olho);palco.localToWorld(mira);camera.position.copy(olho);camera.lookAt(mira);camera.updateMatrixWorld();
    paisagem.atualizar(t,tipo==="chuva"?.55:tipo==="festa"?.42:.95,scene.background);ctx.ambiente(t);
    renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  }
  function audio(s){if(!notas.has(s))notas.set(s,somDaCena(forja(s)?"festa":s,duracao));return notas.get(s);}
  function ouvir(s){
    ctxAudio??=new AudioContext();ctxAudio.resume().catch(()=>{});
    voz=ctxAudio.createBufferSource();voz.buffer=audio(s);voz.connect(ctxAudio.destination);voz.start();
  }
  function mostrar(){if(!painel.open)painel.showModal();}
  // Conferência de enquadramento: desenha um instante exato e segura a cena até sair().
  function quadro(s,t){if(tipo!==s)preparar(resolve(s));congelado=true;desenhar(t);return tipo;}
  function previa(s){if(captura)return;preparar(resolve(s));ouvir(tipo);}
  function tick(now){
    if(!tipo)return false;if(captura||congelado)return true;
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
  return {previa,gravar,sair,dimensionar,tick,quadro,get ativo(){return tipo;},get gravando(){return captura;}};
}

