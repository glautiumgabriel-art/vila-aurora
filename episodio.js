/* Reconstituição de um achado já concluído. A simulação fornece o elenco e o local. */
function criarEpisodioVila(ctx) {
  const {renderer, scene, camera, sol, hemi, amb, lua, paisagem} = ctx;
  const fps=30, passo=2.4, duracao=48;
  const filme=document.createElement("canvas");
  filme.width=1080; filme.height=1920; filme.id="filmeEpisodio";
  const tinta=filme.getContext("2d",{alpha:false});
  const painel=document.querySelector("#painelDiretor"), sair=document.querySelector("#sairDiretor");
  let sessao=null, ocupado=false, cancelar=false, tocador, trilhaCtx;
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const suave=k=>{k=Math.max(0,Math.min(1,k));return k*k*(3-2*k);};
  function plano(dia) {
    const b=ctx.achado(dia);
    if(!b)throw Error("O jogo ainda não tem um achado concluído para esta data.");
    const especial=b.item==="Amuleto de Âmbar" && b.lugar==="Campo do Norte" && b.quem.nome==="@muryvieira_";
    const nome=b.quem.nome, autor=b.ideia.autor;
    const frases=[
      ["Mistério","Que outro tesouro a vila esconde?"],
      ["Pista","Uma tampa dourada à beira da trilha."],
      ["O pedido","“"+b.ideia.ideia+"”"],
      ["A autoria","Comentário de "+autor],
      ["No mapa","O pedido virou um baú por dia."],
      ["A busca","O esconderijo muda de lugar."],
      ["O terreno","Desta vez, perto de "+b.lugar+"."],
      ["O sinal","O brilho vem da tampa."],
      ["A trilha","Alguém se aproxima a pé."],
      ["O fecho","Falta um passo para descobrir."],
      ["O lugar",b.lugar+" · dia "+b.dia],
      ["O encontro","Quem achou foi "+nome+"."],
      ["Por dentro","O que havia no baú?"],
      ["A recompensa",b.item+"."],
      ["O achado","Raridade no jogo: "+b.rar.n+"."],
      ["O registro",nome+" ficou com o achado."],
      ["Amanhã","Se outro baú aparecesse amanhã…"],
      ["Sua ideia","O que você queria encontrar?"],
      ["A escolha","Comente o seu próximo tesouro."],
      ["Entre na vila","Jogue em vila.ihfc.com.br"]
    ];
    return {dia:b.dia,lugar:b.lugar,x:b.x,z:b.z,quem:nome,autor,item:b.item,raridade:b.rar.n,achado:b.achado,
      comentario:b.ideia.ideia,especial,slug:"bau-"+b.item.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-dia-"+b.dia,
      cenas:frases.map(([capitulo,texto],i)=>({inicio_s:+(i*passo).toFixed(1),fim_s:+((i+1)*passo).toFixed(1),capitulo,texto})),fps,duracao};
  }
  const vistas=[
    [1.0,1.3,2.8,.1,.6],[-1.2,1.1,2.5,0,.55],[-3.5,2.1,4.6,-.5,.75],[1.1,2.5,3.2,0,.6],
    [4.6,6.1,6.2,0,.75],[-2.1,5.3,2.2,0,.4],[3.9,4.5,5.2,-.7,.7],[-1.4,.9,2.7,0,.62],
    [-3,1.1,3.8,-1.1,1.0],[1.3,1.5,3.1,0,.57],[-3,2.4,4.7,-.6,.75],[-2.8,1.6,2.4,-.8,1.0],
    [.9,1.45,2.3,0,.65],[1.2,1.8,2.7,0,.84],[-1.7,1.5,2.4,0,1.12],[-2.4,1.4,3.4,-.65,1.0],
    [3.5,2.5,5.3,-.5,.7],[-1.9,2.6,3.5,0,.8],[2.7,1.6,3.6,-.4,.9],[-1.1,1.8,3.7,-.35,.9]
  ];
  function preparar(p){
    const ator=ctx.ator(p.quem);
    if(!ator || ator.userData.provisorio || !ator.userData.mixer)throw Error("Aguarde o avatar de "+p.quem+".");
    const grupo=new THREE.Group();scene.add(grupo);grupo.position.set(p.x,0,p.z);
    const bau=ctx.modeloBau();grupo.add(bau);
    const tampa=bau.userData.tampa;
    const fundo=new THREE.Mesh(new THREE.BoxGeometry(.99,.018,.65),new THREE.MeshStandardMaterial({color:0x24180d,roughness:1}));
    fundo.position.y=.604;bau.add(fundo);
    const gema=new THREE.Group();grupo.add(gema);
    // A joia é exibida apenas quando a recompensa da simulação é o amuleto.
    const fio=new THREE.Mesh(new THREE.TorusGeometry(.22,.016,8,36),new THREE.MeshStandardMaterial({color:0xbd9650,metalness:.55,roughness:.34}));
    const pedra=new THREE.Mesh(new THREE.OctahedronGeometry(.14),new THREE.MeshStandardMaterial({color:0xc65c08,emissive:0x6e2300,emissiveIntensity:.20,metalness:.15,roughness:.40}));
    pedra.position.y=-.23;gema.add(fio,pedra);
    const ocultos=[];
    function ocultar(o){if(o && o!==ator && o.visible){o.visible=false;ocultos.push(o);}}
    ctx.ocultar().forEach(ocultar);scene.traverse(o=>{if(o.isSprite)ocultar(o);});
    const cam=camera.clone(); cam.aspect=9/16;cam.fov=41;cam.near=.08;cam.updateProjectionMatrix();
    const salvarLuz=l=>({obj:l,cor:l.color.clone(),i:l.intensity,pos:l.position.clone()});
    const salvo={ratio:renderer.getPixelRatio(),tamanho:renderer.getSize(new THREE.Vector2()),fundo:scene.background.clone(),
      fog:scene.fog.color.clone(),exposicao:renderer.toneMappingExposure,luzes:[sol,hemi,amb,lua].map(salvarLuz),alvo:sol.target.position.clone(),
      parent:ator.parent,pos:ator.position.clone(),rot:ator.rotation.clone(),vis:ator.visible,ocultos};
    grupo.add(ator);ator.visible=true;ator.traverse(o=>{if(o.userData.cullOculto&&!o.visible){o.visible=true;(salvo.restaurarOcultos??=[]).push(o);}});
    sol.color.setHex(0xffddae);sol.intensity=1.08;sol.position.set(p.x+12,22,p.z+10);sol.target.position.set(p.x,0,p.z);
    renderer.toneMappingExposure=.78;hemi.intensity=.58;amb.intensity=.31;lua.intensity=.24;scene.background.setHex(0xbcd6db);scene.fog.color.setHex(0xcadad8);
    renderer.setPixelRatio(1);renderer.setSize(1080,1920,false);
    sessao={p,cam,grupo,ator,tampa,gema,salvo,anterior:0,fundo};ctx.pararMusica();
    document.querySelector("#mapBox").append(filme);document.body.classList.add("dir-rodando","episodio-rodando");painel.close();
  }
  function texto(t,fonte,cor,x,y,largura){
    tinta.font=fonte;tinta.fillStyle=cor;tinta.textAlign="left";
    const linhas=[];let linha="";
    for(const palavra of t.split(" ")){const teste=linha?linha+" "+palavra:palavra;
      if(linha && tinta.measureText(teste).width>largura){linhas.push(linha);linha=palavra;}else linha=teste;}
    linhas.push(linha);linhas.forEach((s,i)=>tinta.fillText(s,x,y+i*80,largura));return linhas.length;
  }
  function desenhar(t){
    const {p,cam,grupo,ator,tampa,gema}=sessao;
    const i=Math.min(19,Math.floor((t+.000001)/passo)),u=t/passo-i,vista=vistas[i],s=p.cenas[i];
    const marcha=suave((t-16)/12),abertura=suave((t-28.8)/2.2);
    ator.position.set(-3.3+2.5*marcha,0,-.55+.35*marcha);ator.rotation.set(0,1.28,0);
    ator.userData.play(t>=16 && t<27?"Walking_A":t<31?"Interact":t<38?"Cheer":"Idle");
    ator.userData.mixer.update(Math.max(0,Math.min(.1,t-sessao.anterior)));sessao.anterior=t;
    tampa.position.y=.72+.25*abertura;tampa.position.z=-.31*abertura;tampa.rotation.x=-1.1*abertura;
    gema.visible=p.item==="Amuleto de Âmbar" && t>=31.2;gema.position.set(.02,.73+abertura*.70+.04*Math.sin(t*2.3),.07);
    gema.rotation.y=.45*Math.sin(t*1.65);
    const olho=V(vista[0]+.95*Math.sin((u-.5)*1.48),vista[1]+.20*u,vista[2]-.55*u);
    let miraX=vista[3],miraY=vista[4],miraZ=0;
    if(i===3 || i===5){
      const ang=(i===3?-.95:.4)+1.28*u, raio=i===3?3.9:4.9;
      olho.set(Math.sin(ang)*raio,(i===3?2.0:4.3)+.38*u,Math.cos(ang)*raio);
    }
    if(i===8 || i===11 || i===15){
      const lado=i===8?1:-1, dist=i===11?3.7:4.3;
      olho.set(ator.position.x+2.5+.65*u,1.75+.12*u,ator.position.z+lado*(dist-.55*u));
      miraX=ator.position.x+.05;miraY=1.12;miraZ=ator.position.z;
    }
    cam.position.copy(olho.add(grupo.position));cam.lookAt(p.x+miraX,miraY,p.z+miraZ);
    paisagem.atualizar(t,.9,scene.background);ctx.ambiente(t);renderer.shadowMap.needsUpdate=true;renderer.render(scene,cam);
    const papel=i%2===1;
    const g=tinta,marfim="#fff1ce",verde="#173c34",ouro="#edb85e";
    if(papel){
      g.fillStyle=marfim;g.fillRect(0,0,1080,1920);
      g.save();g.strokeStyle="#e6d7b5";g.lineWidth=3;
      for(let k=0;k<5;k++){g.beginPath();g.moveTo(0,75+27*k);g.bezierCurveTo(300,-50+39*k,560,200+21*k,1080,65+19*k);g.stroke();}g.restore();
      g.fillStyle=verde;g.fillRect(66,373,948,4);
      texto("CADERNO DE ACHADOS", "750 35px Nunito",verde,68,352,850);
      texto(s.capitulo,"600 97px Fredoka",verde,64,489,945);
      // Janela horizontal mostra o detalhe escolhido no enquadramento vertical original.
      g.drawImage(ctx.canvas,0,488,1080,860,64,543,952,758);
      g.fillStyle=verde;g.fillRect(66,1344,93,8);texto(s.texto,"750 65px Nunito",verde,67,1450,920);
    }else{
      g.drawImage(ctx.canvas,0,0);
      const grad=g.createLinearGradient(0,1050,0,1920);grad.addColorStop(0,"rgba(9,25,23,0)");grad.addColorStop(.55,"rgba(9,25,23,.84)");grad.addColorStop(1,"rgba(9,25,23,.99)");
      g.fillStyle=grad;g.fillRect(0,1050,1080,870);
      g.fillStyle=verde;g.fillRect(58,332,310,66);texto("VILA AURORA","750 33px Nunito",marfim,79,378,270);
      texto(s.capitulo.toLocaleUpperCase("pt-BR"),"750 37px Nunito",ouro,62,1320,930);
      texto(s.texto,"600 72px Fredoka",marfim,60,1426,935);
    }
    if(i===19)texto("Comente sua ideia para o próximo baú.","700 39px Nunito",verde,67,1650,930);
  }
  function limpar(){
    if(!sessao)return;const {ator,grupo,salvo,gema,fundo}=sessao;
    salvo.parent.add(ator);ator.position.copy(salvo.pos);ator.rotation.copy(salvo.rot);ator.visible=salvo.vis;
    salvo.ocultos.forEach(o=>o.visible=true);salvo.restaurarOcultos?.forEach(o=>o.visible=false);
    scene.remove(grupo);fundo.geometry.dispose();fundo.material.dispose();gema.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});
    scene.background.copy(salvo.fundo);scene.fog.color.copy(salvo.fog);sol.target.position.copy(salvo.alvo);
    for(const l of salvo.luzes){l.obj.color.copy(l.cor);l.obj.intensity=l.i;l.obj.position.copy(l.pos);}
    renderer.toneMappingExposure=salvo.exposicao;renderer.setPixelRatio(salvo.ratio);renderer.setSize(salvo.tamanho.x,salvo.tamanho.y,false);
    sessao=null;filme.remove();document.body.classList.remove("dir-rodando","episodio-rodando");ctx.redimensionar();ctx.voltarMusica();
    sair.textContent="Encerrar prévia";if(!painel.open)painel.showModal();
  }
  async function executar(gravar,dia){
    if(ocupado)throw Error("Já existe uma sessão do episódio.");ocupado=true;cancelar=false;
    let out;
    try{
      const p=plano(dia);
      await Promise.all([document.fonts.load("600 72px Fredoka"),document.fonts.load("750 65px Nunito")]);
      trilhaCtx??=new AudioContext({sampleRate:48000});const r=await fetch("./musica/episodio-bau-"+(p.especial?"ambar":"diario")+".m4a");
      if(!r.ok)throw Error("Trilha local indisponível.");
      const bytes=await r.arrayBuffer();
      preparar(p);desenhar(0);
      if(!gravar){
        const faixa=await trilhaCtx.decodeAudioData(bytes);await trilhaCtx.resume();tocador=trilhaCtx.createBufferSource();tocador.buffer=faixa;tocador.connect(trilhaCtx.destination);
        tocador.start();sessao.inicio=trilhaCtx.currentTime;return;
      }
      const m=await import("./lib/mediabunny.min.mjs");
      const codec=await m.getFirstEncodableVideoCodec(["avc"],{width:1080,height:1920,bitrate:9500000});
      if(!codec)throw Error("Use um navegador local com codificador H.264.");
      out=new m.Output({format:new m.Mp4OutputFormat({fastStart:"in-memory"}),target:new m.BufferTarget()});
      const video=new m.CanvasSource(filme,{codec,bitrate:9500000,keyFrameInterval:2.4});
      const trilha=new m.Input({formats:[m.MP4],source:new m.BufferSource(bytes)});
      const pista=await trilha.getPrimaryAudioTrack();
      const som=new m.EncodedAudioPacketSource("aac");out.addVideoTrack(video,{frameRate:fps});out.addAudioTrack(som);await out.start();
      const config=await pista.getDecoderConfig();
      for await(const pacote of new m.EncodedPacketSink(pista).packets())await som.add(pacote,{decoderConfig:config});
      som.close();trilha.dispose();
      for(let n=0;n<fps*duracao;n++){
        if(cancelar)throw Error("Gravação cancelada.");desenhar(n/fps);await video.add(n/fps,1/fps);
        if(n%300===0)console.info("Episódio · quadro "+n);
        if(n%15===0){sair.textContent="Cancelar · "+Math.floor(100*n/(fps*duracao))+"%";await new Promise(resolve=>setTimeout(resolve,0));}
      }
      video.close();await out.finalize();const a=document.createElement("a"),url=URL.createObjectURL(new Blob([out.target.buffer],{type:"video/mp4"}));
      a.href=url;a.download="vila-aurora_"+p.slug+"_v1.mp4";a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return p;
    }catch(e){if(out?.state==="started")await out.cancel();throw e;}
    finally{if(gravar||sessao?.inicio===undefined){limpar();ocupado=false;}}
  }
  function parar(){cancelar=true;if(sessao?.inicio!==undefined){tocador.stop();limpar();ocupado=false;}}
  function tick(){if(!sessao)return false;if(sessao.inicio!==undefined){const t=trilhaCtx.currentTime-sessao.inicio;if(t>=duracao)parar();else desenhar(t);}return true;}
  return {plano,pronto:dia=>{const b=ctx.achado(dia),a=b&&ctx.ator(b.quem.nome);return !!a?.userData.mixer&&!a.userData.provisorio;},gravar:dia=>executar(true,dia),previa:dia=>executar(false,dia),parar,tick,get ativo(){return !!sessao;},get ocupado(){return ocupado;}};
}
