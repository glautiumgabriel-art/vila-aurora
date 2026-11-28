/* Pintura e geometria da Vila Aurora. Todas as posições usam as unidades do mapa. */
function criarPaisagem(scene, renderer, rnd, RUAS, nav) {
  const tempo = {value: 0}, dia = {value: 1};
  const corCeu = {value: new THREE.Color(0x92c8d5)};
  const dirSol = {value: new THREE.Vector3(.5,.7,.4)}, corNevoa = {value: new THREE.Color(0xc9d5cd)}, faixaNevoa = {value: new THREE.Vector2(60,220)};
  const RUIDO = `float hash(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
  float ruido(vec2 p){vec2 a=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(a),hash(a+vec2(1,0)),u.x),mix(hash(a+vec2(0,1)),hash(a+1.),u.x),u.y);}`;
  let luzDoSol = null;
  const tinta = hex => new THREE.Color(hex).convertSRGBToLinear();
  const rand = rnd("jardins-do-rio");
  function textura(tipo) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d"), grama = tipo === "grama";
    g.fillStyle = grama ? "#829a5f" : "#d6b787"; g.fillRect(0,0,512,512);
    for(let i=0;i<340;i++) {
      const x=rand()*512, y=rand()*512, r=8+rand()*66;
      const rgb=grama ? (i%2?"65,107,66":"179,188,111") : (i%2?"145,104,78":"244,221,166");
      for(const dx of [-512,0,512]) for(const dy of [-512,0,512]) {
        const a=x+dx,b=y+dy;
        if(a+r<0||a-r>512||b+r<0||b-r>512) continue;
        const grad=g.createRadialGradient(a,b,0,a,b,r);
        grad.addColorStop(0,"rgba("+rgb+",.23)"); grad.addColorStop(1,"rgba("+rgb+",0)");
        g.fillStyle=grad; g.fillRect(a-r,b-r,r*2,r*2);
      }
    }
    for(let i=0;i<6800;i++) {
      const x=rand()*512,y=rand()*512;
      g.fillStyle=grama ? (i%3?"#516b4b44":"#d5c88e59") : (i%4?"#866f5650":"#fff0c589");
      g.beginPath(); g.ellipse(x,y,grama?0.6+rand():1+rand()*2,1+rand()*2,i%3-.7,0,Math.PI*2); g.fill();
    }
    const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
    tex.encoding=THREE.sRGBEncoding; tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy()); return tex;
  }
  const relva=textura("grama"), trilha=textura("trilha");
  const base=new THREE.PlaneGeometry(2300,1500,160,120); base.rotateX(-Math.PI/2);
  const pos=base.attributes.position, tons=[],c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i);
    const v=Math.sin(x*.088+Math.cos(z*.19))+Math.sin(z*.077+x*.04);
    c.setRGB(.84+v*.055,.93+v*.018,.78-v*.055); tons.push(c.r,c.g,c.b);
    base.attributes.uv.setXY(i,x/11,z/11);
  }
  base.setAttribute("color",new THREE.Float32BufferAttribute(tons,3));
  const matChao=new THREE.MeshLambertMaterial({map:relva,vertexColors:true});
  matChao.onBeforeCompile=s=>{
    s.vertexShader="varying vec2 vChao;\n"+s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\n vChao=position.xz;");
    s.fragmentShader="varying vec2 vChao;\n"+RUIDO+"\n"+s.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
      float m1=ruido(vChao*.055),m2=ruido(vChao*.21+7.3),m3=ruido(vChao*1.7+3.1);
      diffuseColor.rgb*=mix(vec3(.80,.95,.86),vec3(1.12,1.07,.80),smoothstep(.22,.78,m1*.62+m2*.38));
      diffuseColor.rgb*=.92+.16*m3;`);
  };
  const chao=new THREE.Mesh(base,matChao);
  chao.position.y=-.018; chao.receiveShadow=true; scene.add(chao);
  const terra=new THREE.MeshLambertMaterial({map:trilha,side:THREE.DoubleSide,transparent:true,depthWrite:false});
  terra.onBeforeCompile=s=>{
    s.vertexShader="attribute vec2 beira;varying vec2 vBeira;varying vec2 vTrilha;\n"+s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\n vBeira=beira;vTrilha=(modelMatrix*vec4(position,1.)).xz;");
    s.fragmentShader="varying vec2 vBeira;varying vec2 vTrilha;\n"+RUIDO+"\n"+s.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
      float rb=ruido(vTrilha*2.3)*.6+ruido(vTrilha*6.1)*.4;
      float lado=abs(vBeira.x)+(rb-.5)*.42;
      diffuseColor.a*=(1.-smoothstep(.56,.98,lado))*(1.-smoothstep(.25,.95,vBeira.y+(rb-.5)*.3));
      diffuseColor.rgb*=vec3(.93,.89,.82)*(.90+.16*ruido(vTrilha*.6))*mix(vec3(1.),vec3(.86,.95,.72),smoothstep(.40,.92,lado));`);
  };
  function geometria(p,uv,idx,colors) {
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
    if(uv) g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    if(colors) g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    if(idx) g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function caminho(w,d,x,z,parent) {
    const horiz=w>d, length=Math.max(w,d), width=Math.min(w,d), n=Math.ceil(length/.95);
    const p=[],uv=[],idx=[],bordas=[],via=[],folga=.24;
    for(let i=0;i<=n;i++){
      const q=i/n*length-length/2;
      for(const side of [-1,1]){
        const miolo=side*(width*.5+.19*Math.sin(q*.8+x+z)+.09*Math.sin(q*3.1-side))+.13*Math.sin(q*.34), e=miolo+side*folga;
        const xx=x+(horiz?q:e), zz=z+(horiz?e:q);
        p.push(xx,horiz?.027:.031,zz); uv.push(xx/6,zz/6); bordas.push(side,i===0||i===n?1:0);
        via.push(x+(horiz?q:miolo),horiz?.027:.031,z+(horiz?miolo:q));
      }
      if(i){const k=i*2;idx.push(k-2,k-1,k,k,k-1,k+1);}
    }
    // A navegação dos bichos continua com a largura original; só o desenho ganhou a beira macia.
    nav?.via(via); const g=geometria(p,uv,idx); g.setAttribute("beira",new THREE.Float32BufferAttribute(bordas,2));
    const m=new THREE.Mesh(g,terra); m.receiveShadow=true; m.renderOrder=-6; parent.add(m); return m;
  }
  function trilhaLivre(pontos,parent,{fechado=false,tipo="eixos"}={}) {
    const p=[],uv=[],idx=[],beiras=[];
    for(let i=0;i<pontos.length;i++){
      const a=pontos[i], antes=pontos[i===0&&fechado?pontos.length-2:Math.max(0,i-1)];
      const depois=pontos[i===pontos.length-1&&fechado?1:Math.min(pontos.length-1,i+1)];
      const dx=depois.x-antes.x,dz=depois.z-antes.z,len=Math.hypot(dx,dz)||1;
      for(const lado of [-1,1]){
        const e=lado*(a.r+.22),x=a.x-dz/len*e,z=a.z+dx/len*e;
        p.push(x,.029,z); uv.push(x/6,z/6);
        beiras.push(lado,fechado?0:Math.max(0,1-i/2,1-(pontos.length-1-i)/2));
      }
      if(i){const k=i*2;idx.push(k-2,k-1,k,k,k-1,k+1);}
    }
    nav.trilha(pontos,tipo);
    const g=geometria(p,uv,idx);
    g.setAttribute("beira",new THREE.Float32BufferAttribute(beiras,2));
    const m=new THREE.Mesh(g,terra); m.receiveShadow=true; m.renderOrder=-6; m.userData.trilhaAurora=true; parent.add(m);
  }
  const vertex = 'varying vec3 lugar; varying vec2 coord; void main(){ lugar=(modelMatrix*vec4(position,1.)).xyz; coord=uv; gl_Position=projectionMatrix*viewMatrix*vec4(lugar,1.); }';
  const espelhos=[];
  const agua=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,
    uniforms:{t:tempo,dia,ceu:corCeu,sol:dirSol,nevoaCor:corNevoa,nevoa:faixaNevoa,rio:{value:0},foz:{value:new THREE.Vector4(0,0,0,0)}},vertexShader:vertex,fragmentShader:`
    uniform float t,dia,rio; uniform vec3 ceu,sol,nevoaCor; uniform vec2 nevoa; uniform vec4 foz; varying vec3 lugar; varying vec2 coord;
    ${RUIDO}
    void main(){
      vec2 p=lugar.xz;
      // coord.x = distância à linha d'água em unidades do mapa (negativa dentro da água)
      float d=coord.x;
      if(foz.w>.5&&p.y>foz.z) d=min(d,abs(p.x-foz.x)-foz.y);
      d+=.13*(ruido(p*1.15)-.5)+.035*sin(p.x*3.1+p.y*2.3);
      vec2 corr=vec2(0.,rio>.5?-t*.50:0.);
      float o1=ruido(p*vec2(1.5,.55)+corr+vec2(t*.05,t*.02));
      float o2=ruido(p*vec2(3.2,1.3)+corr*1.6-vec2(t*.04,t*.11));
      float o3=ruido(p*vec2(7.5,3.4)+corr*2.2+vec2(t*.21,0.));
      float fundo=smoothstep(0.,-2.1,d);
      vec3 cor=mix(vec3(.50,.82,.73),vec3(.20,.61,.63),smoothstep(0.,.42,fundo));
      cor=mix(cor,vec3(.085,.375,.455),smoothstep(.34,1.,fundo));
      cor+=(o1*.62+o2*.38-.5)*.085;
      vec3 vista=normalize(cameraPosition-lugar);
      float fres=pow(1.-max(0.,vista.y),3.);
      cor=mix(cor,ceu*1.04+.035,.10+.52*fres);
      vec3 n=normalize(vec3((o1-.5)*.55+(o3-.5)*.25,1.,(o2-.5)*.55));
      float brilho=pow(max(0.,dot(reflect(-normalize(sol),n),vista)),70.);
      float cint=smoothstep(.80,.86,o3)*smoothstep(.50,.72,o1)*smoothstep(.12,.6,fundo);
      cor+=vec3(1.,.95,.80)*(brilho*.75+cint*.16)*dia;
      cor+=vec3(.70,.92,.88)*smoothstep(.66,.72,o2)*smoothstep(.69,.60,o2+.07)*smoothstep(.2,.9,fundo)*.11;
      float esp=ruido(p*5.2+vec2(t*.22,-t*.18));
      float vai=.065*sin(t*1.25+p.x*.85+p.y*.7);
      float linha=1.-smoothstep(.0,.11+.11*esp,abs(d+.08+vai));
      float linha2=(1.-smoothstep(.0,.06,abs(d+.40+vai*1.7+.13*esp)))*.42*step(.38,esp);
      cor=mix(cor,vec3(.95,.99,.97),clamp(linha*.88+linha2,0.,1.));
      float seco=smoothstep(.02,.40,d);
      vec3 praia=mix(vec3(.53,.46,.33),vec3(.80,.72,.55),seco)*(.93+.14*ruido(p*7.));
      float terraFirme=smoothstep(-.03,.05,d-vai*.5);
      cor=mix(cor,praia,terraFirme*(1.-linha*.85));
      float alfa=1.-smoothstep(.40,.88,d+.20*(ruido(p*2.1)-.5));
      alfa*=1.-smoothstep(.972,.998,coord.y);
      cor*=.44+.56*dia;
      cor=mix(cor,nevoaCor,smoothstep(nevoa.x,nevoa.y,length(cameraPosition-lugar))*.92);
      gl_FragColor=vec4(cor,alfa);
    }`});
  function centroRio(z){return 46+(2.7*Math.sin(z*.075)+1.5*Math.sin(z*.18))*Math.min(1,Math.abs(z)/14);}
  function larguraRio(z){return 2.65+.38*Math.sin(z*.134)+.22*Math.sin(z*.32);}
  const BEIRA=1.0;
  function camadaAgua(V) {
    const p=[],uv=[],idx=[],L=V.L.rio,rio=V.i===0,n=rio?154:96;
    for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,z=-97+i/n*195;
      const R=4.7+.54*Math.sin(a*3+.3)+.31*Math.cos(a*5);
      for(let j=0;j<=4;j++){
        const q=j/4,s=q*2-1;
        const x=rio?centroRio(z)+s*(larguraRio(z)+BEIRA):L.x+Math.cos(a)*(R+BEIRA)*q*1.18;
        const zz=rio?z:L.z+Math.sin(a)*(R+BEIRA)*q*.91;
        p.push(x,rio?.069:.084,zz);
        uv.push(rio?Math.abs(s)*(larguraRio(z)+BEIRA)-larguraRio(z):q*(R+BEIRA)-R,rio?i/n:.5);
        if(i&&j){const k=i*5+j;idx.push(k-6,k-5,k,k-6,k,k-1);}
      }
    }
    const material=agua.clone();
    const m=new THREE.Mesh(geometria(p,uv,idx),material);m.renderOrder=-5;scene.add(m);
    Object.assign(material.uniforms,{t:tempo,dia,ceu:corCeu,sol:dirSol,nevoaCor:corNevoa,nevoa:faixaNevoa});
    material.uniforms.rio.value=rio?1:0;
    // Onde o rio entra na lagoa, a margem da lagoa vira água.
    if(!rio&&Math.abs(L.x-centroRio(L.z+3))<8&&L.z>-104&&L.z<98) material.uniforms.foz.value.set(centroRio(L.z+3.5),larguraRio(L.z+3.5),L.z-.5,1);
    espelhos.push({m,L});
    return m;
  }
  function lote(geo,items) {
    if(!items.length) return;
    const mat=new THREE.MeshLambertMaterial({color:0xffffff});
    const m=new THREE.InstancedMesh(geo,mat,items.length),o=new THREE.Object3D();
    items.forEach(([x,y,z,a,b,d,rot,color],i)=>{
      o.position.set(x,y,z);o.scale.set(a,b,d);o.rotation.set(.02,rot,.06*Math.sin(i));o.updateMatrix();
      m.setMatrixAt(i,o.matrix);m.setColorAt(i,tinta(color));
    });
    m.receiveShadow=true; m.castShadow=true; m.frustumCulled=false; scene.add(m);return m;
  }
  function plantar(V) {
    const r=rnd("margens"+V.i),rio=V.i===0,L=V.L.rio;
    nav.lagos.push({rio,x:L.x,z:L.z,centro:centroRio,largura:larguraRio});
    camadaAgua(V);
    const pedras=[],p=[],cores=[], flores=[], copas=[],troncos=[];
    const green=[0x70945c,0x90aa63,0x537d56,0xb6bf69], petalas=[0xf5c76d,0xfeefc5,0xcb94ac,0xa6a3dc];
    function folha(x,z,h,w,ang,tom,y=0){
      const dx=Math.cos(ang)*w,dz=Math.sin(ang)*w;
      p.push(x-dx,y,z-dz,x+dx,y,z+dz,x+dz*1.7,y+h,z-dx*1.7);
      const c=tinta(tom);cores.push(c.r*.66,c.g*.74,c.b*.70,c.r*.66,c.g*.74,c.b*.70,Math.min(1,c.r*1.22+.03),Math.min(1,c.g*1.16+.03),c.b*.92);
    }
    function flor(x,z,h,tom) {
      folha(x,z,h,.014,0,0x477554);
      for(let i=0;i<5;i++){const a=i*1.257;flores.push([x+.049*Math.cos(a),h,z+.049*Math.sin(a),.052,.033,.052,a,tom]);}
      flores.push([x,h+.02,z,.036,.033,.036,0,0xe5aa36]);
    }
    for(let i=0;i<(rio?182:52);i++){
      const a=r()*Math.PI*2,z=r()*191-94,sign=r()<.5?-1:1;
      const R=4.7+.54*Math.sin(a*3+.3)+.31*Math.cos(a*5);
      const x=rio?centroRio(z)+sign*(larguraRio(z)+r()*.55):L.x+Math.cos(a)*(R+.25)*1.18;
      const zz=rio?z:L.z+Math.sin(a)*(R+.25)*.91;
      if(rio&&(Math.abs(zz)<3||Math.hypot((x-44)/1.18,(zz+100)/.91)<5.1))continue;
      if(i%3===0){const s=.17+r()*.37;pedras.push([x,.07,zz,s,.52*s,s*(.6+r()),a,[0xa39d8a,0x85968e,0xb1b29c][i%3===0?Math.floor(r()*3):0]]);}
      for(let k=0;k<10;k++)folha(x+(r()-.5)*.4,zz+(r()-.5)*.4,.32+r()*.55,.035+r()*.03,r()*6,green[k%4]);
      if(i%5===0)flor(x+.2,zz+.1,.5,0xe3b172);
    }
    for(let i=0;i<1250;i++){
      const x=V.cx+(r()-.5)*107,z=V.cz+(r()-.5)*99;
      if(rio&&Math.abs(x-centroRio(z))<larguraRio(z)+.7)continue;
      if(!rio&&Math.hypot((x-L.x)/1.2,z-L.z)<5.8)continue;
      if(V.i===0 ? (nav.emTrilha(x,z)||Math.hypot(x-V.cx,z-V.cz)<6) : Math.abs(x-V.cx)<36&&Math.abs(z-V.cz)<36&&(RUAS.some(a=>Math.abs(x-V.cx-a)<1.1||Math.abs(z-V.cz-a)<1.1)||Math.hypot(x-V.cx,z-V.cz)<6))continue;
      const jardim=i%7===0;
      for(let k=0;k<9;k++) {
        const xx=x+(r()-.5)*1.5,zz=z+(r()-.5)*1.5;
        for(let j=0;j<4;j++)folha(xx+(r()-.5)*.16,zz+(r()-.5)*.16,.08+r()*.20,.016+r()*.022,r()*6,green[(i+j+k)%4]);
        if(jardim&&k<4)flor(xx,zz,.20+r()*.13,petalas[i%4]);
      }
    }
    // Pomar e jardins em grupos assimétricos, com espaço livre para a câmera à beira do rio.
    for(const [dx,dz] of [[-29,-17],[-31,18],[25,24],[16,-26],[-8,28],[33,19],[54,-2],[55,15],[53,25],[42,28],[-32,-25],[27,-29]]){
      if(V.i===1&&dx>49)continue;
      const x=V.cx+dx,z=V.cz+dz,h=1.8+r()*1.0; troncos.push([x,h*.5,z,.18,h,.20,r()*6,0x82664d]);
      const pal=dz===15||dz===28?[0xe5a597,0xf5c4ab,0xd69991]:[0x628a65,0x839f6e,0xa2af75];
      for(let j=0;j<7;j++){const a=j*2.4,rad=j<5?1:.45;copas.push([x+Math.cos(a)*rad,h+.3+(j>4?.92:0),z+Math.sin(a)*rad,1.35+r()*.4,1.25+r()*.45,1.35,a,pal[j%3]]);}
    }
    pedras.forEach(([x,y,z,w,h,d])=>nav.caixa("pedra",x,z,Math.max(w,d),Math.max(w,d)));
    troncos.forEach(([x,y,z])=>nav.caixa("tronco",x,z,.23,.23));
    lote(new THREE.IcosahedronGeometry(1,0),pedras); lote(new THREE.IcosahedronGeometry(1,0),flores);
    lote(new THREE.CylinderGeometry(.8,1,1,6),troncos);lote(new THREE.IcosahedronGeometry(1,1),copas);
    const gm=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
    gm.onBeforeCompile=s=>{s.uniforms.breeze=tempo;s.vertexShader="uniform float breeze;\n"+s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\n float vento=sin(breeze*1.6+position.x*.47+position.z*.32)+.45*sin(breeze*2.9+position.x*1.3-position.z*.9);transformed.x+=.105*position.y*vento;transformed.z+=.05*position.y*cos(breeze*1.15+position.z*.6+position.x*.2);");};
    scene.add(new THREE.Mesh(geometria(p,null,null,cores),gm));
  }
  const sky=new THREE.Mesh(new THREE.SphereGeometry(750,32,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{t:tempo,dia,ceu:corCeu,sol:dirSol},vertexShader:vertex,fragmentShader:`
  varying vec3 lugar; uniform float t,dia; uniform vec3 ceu,sol;
  ${RUIDO}
  float nuvens(vec2 p){return ruido(p)*.54+ruido(p*2.1+3.7)*.29+ruido(p*4.3+9.1)*.17;}
  void main(){vec3 v=normalize(lugar-cameraPosition);float h=max(.0,v.y);vec3 s=normalize(sol);
    float baixo=1.-smoothstep(.10,.55,s.y);
    vec3 horizonte=mix(ceu,mix(vec3(.98,.86,.72),vec3(1.,.72,.46),baixo),(.42+.22*baixo)*dia);
    vec3 c=mix(horizonte,ceu*vec3(.74,.87,1.0),smoothstep(-.03,.58,h));
    float ds=max(0.,dot(v,s));
    c+=vec3(1.,.74,.42)*(pow(ds,5.)*.22+pow(ds,48.)*.42)*dia*(.45+.55*baixo);
    c+=vec3(1.,.96,.86)*smoothstep(.9992,.99975,ds)*dia;
    vec2 p=v.xz/max(.09,h+.12)*2.1+vec2(t*.012,0.);
    float nube=nuvens(p),borda=smoothstep(.56,.72,nube)*smoothstep(.015,.18,h);
    float topo=smoothstep(.0,.10,nube-nuvens(p+s.xz*.16));
    vec3 corNuvem=mix(mix(vec3(.80,.82,.88),vec3(.86,.66,.62),baixo),mix(vec3(1.,.97,.90),vec3(1.,.84,.64),baixo),topo);
    c=mix(c,corNuvem*(.30+.70*dia)+ceu*.12,borda*(.30+.52*dia));
    float estrela=step(.9975,hash(floor(v.xz/(h+.25)*260.)))*smoothstep(.06,.30,h)*smoothstep(.28,.02,dia)*(1.-borda);
    c+=vec3(.85,.90,1.)*estrela*(.55+.45*sin(t*2.+v.x*400.));
    gl_FragColor=vec4(c,1.);
  }`}));
  sky.renderOrder=-100;sky.frustumCulled=false;scene.add(sky);
  function cultivar(g,L){
    const terraArada=new THREE.MeshLambertMaterial({color:0xbc915e,side:THREE.DoubleSide});
    const p=[],uv=[],idx=[],pEspigas=[],cores=[];
    function triangulo(a,b,c,tom){pEspigas.push(...a,...b,...c);const v=tinta(tom);for(let k=0;k<3;k++)cores.push(v.r,v.g,v.b);}
    const r=rnd("trigo"+L.x+":"+L.z);
    for(let row=0;row<6;row++){
      const zz=L.z+(row-2.5)*.69;
      for(let i=0;i<28;i++){
        const x=L.x-5.35+i*.397,k=p.length/3;
        for(const d of [-1,1]){p.push(x,.062,zz+d*(.22+.05*Math.sin(i*.59)));uv.push(x/4,(zz+d*.22)/4);}
        if(i)idx.push(k-2,k-1,k,k,k-1,k+1);
        if(i%7===0&&row===1)continue;
        for(let n=0;n<3;n++){
          const xx=x+(r()-.5)*.33,z=zz+(r()-.5)*.34,h=.34+r()*.28,lean=.05+r()*.10;
          triangulo([xx-.024,.07,z],[xx+.024,.07,z],[xx+lean,h+.13,z+.02],0xbb954d);
          for(let q=0;q<3;q++){
            const y=h-.11+q*.077;
            triangulo([xx+lean-.015,y,z],[xx+lean+.02,y+.05,z+.01],[xx+lean-.07,y+.12,z-.012],0xe1bd65);
            triangulo([xx+lean,y,z],[xx+lean+.052,y+.08,z],[xx+lean+.092,y+.14,z+.022],0xf6d88a);
          }
        }
      }
    }
    const solo=new THREE.Mesh(geometria(p,uv,idx),terraArada);solo.receiveShadow=true;g.add(solo);
    const trigo=new THREE.Mesh(geometria(pEspigas,null,null,cores),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));g.add(trigo);
  }
  // O reflexo por cubo saiu: custava seis desenhos da cena por espelho e borrava em ângulo raso.
  function refletirMargens(){}
  return {plantar,cultivar,caminho,trilhaLivre,centroRio,refletirMargens,tempo,atualizar(t,luz,ceu){
    tempo.value=t;dia.value=Math.max(0,Math.min(1,luz));corCeu.value.copy(ceu);
    if(!luzDoSol) scene.traverse(o=>{if(!luzDoSol&&o.isDirectionalLight&&o.castShadow)luzDoSol=o;});
    if(luzDoSol) dirSol.value.copy(luzDoSol.position).sub(luzDoSol.target.position).normalize();
    const f=scene.fog; if(f){corNevoa.value.copy(f.color); if(f.near!=null) faixaNevoa.value.set(f.near,f.far); else faixaNevoa.value.set(30,30+1.6/Math.max(1e-4,f.density));}
  }};
}

