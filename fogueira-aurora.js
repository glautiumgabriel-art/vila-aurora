/* Três acabamentos para o mesmo centro da praça. */
function criarFogueiraAurora(opcao, fg, caminhos, arte) {
  const {M,box,cyl,cone,esfera,mat,tocha,rnd} = arte;
  const aleatorio = rnd("fogo-aurora-"+opcao);
  const casco = mat(0x69402a), miolo = mat(0xb77b45);
  const ferro = mat(0x353338,{roughness:.44,metalness:.66});
  const bronze = mat(0x9d5831,{roughness:.5,metalness:.52});
  const faixas = [0xac3439,0xdaaa42,0x327a75,0x415990].map(cor=>mat(cor,{side:THREE.DoubleSide}));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), vertical = new THREE.Vector3(0,1,0);
  const {x,z} = fg.position;
  const obstaculo = (nome,dx,dz,w,h) => caminhos.caixa(nome,x+dx,z+dz,w,h);

  function cilindroEntre(p,q,r,material,v=7) {
    a.set(...p); b.set(...q);
    const l = cyl(r,r,a.distanceTo(b),material,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,fg,v);
    l.quaternion.setFromUnitVectors(vertical,b.sub(a).normalize());
    return l;
  }

  function tronco(p,q,r) {
    cilindroEntre(p,q,r,casco);
    for (const [extremo,outro] of [[p,q],[q,p]]) {
      a.set(...extremo); b.set(...outro).sub(a).normalize().multiplyScalar(.022);
      cilindroEntre(a.clone().sub(b).toArray(),a.toArray(),r*.83,miolo);
    }
  }

  function bancos(quantidade,raio,toras) {
    for(let i=0;i<quantidade;i++) {
      const ang = i/quantidade*Math.PI*2+.34, sx=Math.cos(ang), sz=Math.sin(ang);
      const bx=sx*raio, bz=sz*raio, dx=-sz*.76, dz=sx*.76;
      for (const lado of [-1,1]) {
        const px=bx+dx*lado*.77, pz=bz+dz*lado*.77;
        cyl(.15,.18,.30,M.madeiraEsc,px,.19,pz,fg,6);
      }
      if (toras) tronco([bx-dx,.41,bz-dz],[bx+dx,.41,bz+dz],.22);
      else {
        const assento=box(1.67,.17,.47,M.madeira,bx,.43,bz,fg);
        assento.rotation.y=-Math.atan2(dz,dx);
      }
      obstaculo("banco",bx,bz,Math.abs(dx)+.20,Math.abs(dz)+.20);
    }
  }

  function bandeirinhas() {
    const postes = [[-4.6,-2.8],[4.55,-2.8],[4.25,2.9],[-4.25,2.9]];
    for (const [px,pz] of postes) {
      cyl(.065,.10,3.45,M.madeiraEsc,px,1.77,pz,fg,7);
      esfera(.12,M.madeira,px,3.53,pz,fg,7,5);
      obstaculo("poste",px,pz,.12,.12);
    }
    for (const [inicio,fim] of [[0,1],[1,2],[2,3],[3,0]]) {
      const [ax,az]=postes[inicio], [bx,bz]=postes[fim];
      const corda = t => [ax+(bx-ax)*t,3.44-.72*Math.sin(Math.PI*t),az+(bz-az)*t];
      for(let i=0;i<12;i++) cilindroEntre(corda(i/12),corda((i+1)/12),.025,M.madeiraEsc,5);
      for(let i=1;i<=8;i++) {
        const p=corda(i/9-.033), q=corda(i/9+.033);
        const g=new THREE.BufferGeometry();
        g.setAttribute("position",new THREE.Float32BufferAttribute([
          ...p,...q,(p[0]+q[0])/2,(p[1]+q[1])/2-.39,(p[2]+q[2])/2
        ],3));
        g.computeVertexNormals();
        fg.add(new THREE.Mesh(g,faixas[(i+inicio)%faixas.length]));
      }
    }
  }

  let altura, corpo, escala, energia;
  if (opcao===1) {
    cyl(1.30,1.30,.09,M.pedraEsc,0,.087,0,fg,15);
    for(let i=0;i<14;i++) {
      const ang=i*Math.PI/7, r=1.23, d=.24+aleatorio()*.10;
      const pedra=esfera(d,i%3===0?M.pedraEsc:M.pedra,Math.cos(ang)*r,.22,Math.sin(ang)*r,fg,6,4);
      pedra.scale.set(1,.70,1.16); pedra.rotation.y=ang;
    }
    for (const [i,ang] of [0,Math.PI/3,2*Math.PI/3,Math.PI/5].entries()) {
      const dx=Math.cos(ang)*.91,dz=Math.sin(ang)*.91,y=.25+i*.072;
      tronco([-dx,y,-dz],[dx,y+.05,dz],.13);
    }
    bancos(5,3.62,true);
    [altura,corpo,escala,energia]=[.43,1.48,.67,5.3];
    obstaculo("fogueira",0,0,1.42,1.42);
  } else if (opcao===2) {
    for (const [r,rr,h,y,m] of [[1.02,1.15,.22,.16,M.pedraEsc],[.79,.95,.22,.37,M.pedra],[.51,.67,.52,.72,M.pedraEsc],
      [.68,.46,.13,1.03,ferro],[.97,.47,.49,1.31,ferro],[1.02,.99,.11,1.57,bronze],[.82,.56,.08,1.59,M.escuro]]) {
      cyl(r,rr,h,m,0,y,0,fg,10);
    }
    for(let i=0;i<10;i++) {
      const ang=i*Math.PI/5, dx=Math.cos(ang),dz=Math.sin(ang);
      cilindroEntre([dx*.48,1.08,dz*.48],[dx*.99,1.59,dz*.99],.045,bronze,6);
      esfera(.055,bronze,dx*1.018,1.58,dz*1.018,fg,6,4);
    }
    for (const ang of [Math.PI/4,3*Math.PI/4,5*Math.PI/4,7*Math.PI/4]) {
      const dx=Math.cos(ang)*2.72,dz=Math.sin(ang)*2.72;
      tocha(x+dx,z+dz,true,fg.parent).scale.set(.83,.47,.83);
      obstaculo("tocha",dx,dz,.10,.10);
    }
    [altura,corpo,escala,energia]=[1.58,.84,.40,3.35];
    obstaculo("braseiro",0,0,1.08,1.08);
  } else {
    cyl(1.67,1.71,.10,M.pedraEsc,0,.09,0,fg,15);
    for(let nivel=0;nivel<5;nivel++) {
      const r=1.44-nivel*.245, y=.27+nivel*.245, gira=nivel*Math.PI/2+.29;
      for (const lado of [-1,1]) {
        const dx=Math.sin(gira)*r,dz=Math.cos(gira)*r, tx=Math.cos(gira)*r*.70*lado,tz=-Math.sin(gira)*r*.70*lado;
        tronco([tx-dx,y,tz-dz],[tx+dx,y,tz+dz],.16);
      }
    }
    bancos(6,3.80,false);
    bandeirinhas();
    [altura,corpo,escala,energia]=[.94,2.63,.99,7.6];
    obstaculo("fogueira",0,0,1.70,1.70);
  }

  const tintaFogo = color => new THREE.MeshBasicMaterial({color,toneMapped:false,fog:false,side:THREE.DoubleSide});
  const corBrasa = tintaFogo(0xf34413);
  const corLaranja = tintaFogo(0xff8c1a);
  const corOuro = tintaFogo(0xffc63a);
  const corPonta = tintaFogo(0xffe293);
  const chamas = [
    [0,0,1,1,corBrasa], [-.44,.17,.49,.71,corLaranja],
    [.35,.20,.61,.78,corLaranja], [.08,-.33,.53,.85,corLaranja],
    [0,.05,.74,.86,corLaranja], [.03,.23,.53,.70,corOuro],
    [-.15,.36,.29,.49,corPonta]
  ].map(([fx,fz,r,h,material],i)=>{
    const p = new THREE.Group();
    p.position.set(fx*escala,altura,fz*escala); fg.add(p);
    const geo = new THREE.BufferGeometry(), verts = [], idx = [];
    for (const [altura,largura,ox,oz] of [[0,.67,0,0],[.23,1.0,.05,-.08],[.56,.60,-.16,.06],[.8,.24,.15,-.09],[1,0,.42,-.1]]) {
      for(let lado=0;lado<5;lado++){
        const ang=lado/5*Math.PI*2+(lado%2)*.13;
        verts.push((Math.cos(ang)*largura+ox)*r*escala,altura*corpo*h,(Math.sin(ang)*largura+oz)*r*escala);
      }
    }
    for(let faixa=0;faixa<4;faixa++)for(let lado=0;lado<5;lado++){
      const a=faixa*5+lado,b=faixa*5+(lado+1)%5;
      idx.push(a,b,a+5,b,b+5,a+5);
    }
    geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3)); geo.setIndex(idx);
    const chama=new THREE.Mesh(geo,material); p.add(chama);
    chama.castShadow=chama.receiveShadow=false;
    return {p,i};
  });
  const luz=new THREE.PointLight(0xff9a46,energia,opcao===3?15:11,2);
  luz.position.set(0,altura+.45,0); fg.add(luz);
  const brasas = [];
  const n = [22,9,31][opcao-1];
  const particulas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),corPonta,n);
  particulas.frustumCulled=false;
  const p = new THREE.Object3D();
  for(let i=0;i<n;i++) brasas.push([aleatorio(),aleatorio(),aleatorio(),aleatorio()]);
  fg.add(particulas);

  function animar(t, noite) {
    const oscilacao=opcao===2?.045:.15;
    luz.intensity=energia*(noite?1:.16)*(1+oscilacao*Math.sin(t*11)+.04*Math.cos(t*17));
    for (const {p,i} of chamas) {
      const fase=t*(opcao===2?5:8)+i*1.63;
      p.scale.set(1+.06*Math.cos(fase),1+oscilacao*Math.sin(fase),1+.05*Math.sin(fase));
      p.rotation.set(.065*Math.sin(fase),i*.78+t*(opcao===2?.28:.68),.08*Math.cos(fase));
    }
    brasas.forEach(([f,a,r,v],i)=>{
      const u=(t*(.48+v*.24)+f)%1, ang=a*2*Math.PI+u*2;
      const d=escala*(r*.53+u*.68);
      p.position.set(Math.cos(ang)*d,altura+corpo*.51+u*(1.45+r),Math.sin(ang)*d);
      p.scale.setScalar((.032+v*.037)*Math.sin(Math.PI*u));
      p.updateMatrix(); particulas.setMatrixAt(i,p.matrix);
    });
    particulas.instanceMatrix.needsUpdate=true;
  }
  return {animar,luz,chamas:chamas.map(c=>c.p.children[0]),particulas};
}

