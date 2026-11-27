/* Pintura e geometria da Vila Aurora. Todas as posições usam as unidades do mapa. */
function criarPaisagem(scene, renderer, rnd, RUAS, nav) {
  const tempo = {value: 0}, dia = {value: 1};
  const corCeu = {value: new THREE.Color(0x92c8d5)};
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
  const chao=new THREE.Mesh(base,new THREE.MeshLambertMaterial({map:relva,vertexColors:true}));
  chao.position.y=-.018; chao.receiveShadow=true; scene.add(chao);
  const terra=new THREE.MeshLambertMaterial({map:trilha,side:THREE.DoubleSide});
  function geometria(p,uv,idx,colors) {
    const g=new THREE.BufferGeometry();
    g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
    if(uv) g.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
    if(colors) g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    if(idx) g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function caminho(w,d,x,z,parent) {
    const horiz=w>d, length=Math.max(w,d), width=Math.min(w,d), n=Math.ceil(length/.95);
    const p=[],uv=[],idx=[];
    for(let i=0;i<=n;i++){
      const q=i/n*length-length/2;
      for(const side of [-1,1]){
        const e=side*(width*.5+.19*Math.sin(q*.8+x+z)+.09*Math.sin(q*3.1-side))+.13*Math.sin(q*.34);
        const xx=x+(horiz?q:e), zz=z+(horiz?e:q);
        p.push(xx,horiz?.027:.031,zz); uv.push(xx/6,zz/6);
      }
      if(i){const k=i*2;idx.push(k-2,k-1,k,k,k-1,k+1);}
    }
    nav?.via(p); const m=new THREE.Mesh(geometria(p,uv,idx),terra); m.receiveShadow=true; parent.add(m); return m;
  }
  const vertex = 'varying vec3 lugar; varying vec2 coord; void main(){ lugar=(modelMatrix*vec4(position,1.)).xyz; coord=uv; gl_Position=projectionMatrix*viewMatrix*vec4(lugar,1.); }';
  const espelhos=[];
  const agua=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{t:tempo,dia,ceu:corCeu,reflexoLocal:{value:null},pronto:{value:0}},vertexShader:vertex,fragmentShader:`
    uniform samplerCube reflexoLocal; uniform float pronto; uniform float t,dia; uniform vec3 ceu; varying vec3 lugar; varying vec2 coord;
    void main(){
      vec2 p=lugar.xz;
      float margem=abs(coord.x);
      float ond=sin(p.y*7.2+p.x*.41+.8*sin(p.x*2.+t*.15)-t*1.75)+.46*sin(p.x*2.7-p.y*.8+t*1.25);
      vec3 vista=normalize(cameraPosition-lugar);
      float fres=pow(1.-max(0.,vista.y),2.);
      vec3 fundo=mix(vec3(.028,.29,.30),vec3(.28,.65,.54),smoothstep(.18,.98,margem));
      float reflexo=smoothstep(.27,.86,margem+.095*ond)*(.45+.22*sin(p.y*1.34+ond*.3));
      vec3 cor=mix(fundo,vec3(.075,.29,.25),reflexo);
      cor=mix(cor,ceu,.13+.56*fres);
      vec3 n=normalize(vec3(.033*ond,1.,.022*cos(p.y*2.7-t)));
      vec3 refletida=textureCube(reflexoLocal,reflect(-vista,n)).rgb;
      cor=mix(cor,refletida*.80+vec3(.04,.09,.07),pronto*(.12+.32*fres));
      float fil=smoothstep(1.21,1.45,ond)*(.45+.55*sin(p.y*1.1+p.x)*sin(p.y*1.1+p.x));
      float borda=(1.-smoothstep(.012,.07,abs(margem-.93-.019*ond)));
      cor+=vec3(.63,.78,.63)*(fil*.27+borda*.23);
      gl_FragColor=vec4(cor*(.30+.70*dia),1.);
    }`});
  function centroRio(z){return 46+(2.7*Math.sin(z*.075)+1.5*Math.sin(z*.18))*Math.min(1,Math.abs(z)/14);}
  function larguraRio(z){return 2.65+.38*Math.sin(z*.134)+.22*Math.sin(z*.32);}
  const margemMat=new THREE.MeshLambertMaterial({color:0xd0b184,side:THREE.DoubleSide});
  function camadaAgua(V,borda) {
    const p=[],uv=[],idx=[],L=V.L.rio,rio=V.i===0,n=rio?154:88;
    for(let i=0;i<=n;i++){
      const a=i/n*Math.PI*2,z=-97+i/n*195;
      const R=4.7+.54*Math.sin(a*3+.3)+.31*Math.cos(a*5);
      for(let j=0;j<=4;j++){
        const q=j/4,s=q*2-1;
        const x=rio?centroRio(z)+s*(larguraRio(z)+borda):L.x+Math.cos(a)*(R+borda)*q*1.18;
        const zz=rio?z:L.z+Math.sin(a)*(R+borda)*q*.91;
        p.push(x,borda?(rio?.035:.056):(rio?.069:.084),zz); uv.push(rio?s:q,i/n);
        if(i&&j){const k=i*5+j;idx.push(k-6,k-5,k,k-6,k,k-1);}
      }
    }
    const material=borda?margemMat:agua.clone();
    const m=new THREE.Mesh(geometria(p,uv,idx),material);scene.add(m);
    if(!borda){Object.assign(material.uniforms,{t:tempo,dia,ceu:corCeu});espelhos.push({m,L});}
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
    camadaAgua(V,.52);camadaAgua(V,0);
    const pedras=[],p=[],cores=[], flores=[], copas=[],troncos=[];
    const green=[0x70945c,0x90aa63,0x537d56,0xb6bf69], petalas=[0xf5c76d,0xfeefc5,0xcb94ac,0xa6a3dc];
    function folha(x,z,h,w,ang,tom,y=0){
      const dx=Math.cos(ang)*w,dz=Math.sin(ang)*w;
      p.push(x-dx,y,z-dz,x+dx,y,z+dz,x+dz*1.7,y+h,z-dx*1.7);
      const c=tinta(tom);for(let i=0;i<3;i++)cores.push(c.r,c.g,c.b);
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
      if(Math.abs(x-V.cx)<36&&Math.abs(z-V.cz)<36&&(RUAS.some(a=>Math.abs(x-V.cx-a)<1.1||Math.abs(z-V.cz-a)<1.1)||Math.hypot(x-V.cx,z-V.cz)<6))continue;
      const jardim=i%7===0;
      for(let k=0;k<7;k++) {
        const xx=x+(r()-.5)*1.2,zz=z+(r()-.5)*1.2;
        for(let j=0;j<3;j++)folha(xx,zz,.09+r()*.22,.023+r()*.035,r()*6,green[(i+j)%4]);
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
    gm.onBeforeCompile=s=>{s.uniforms.breeze=tempo;s.vertexShader="uniform float breeze;\n"+s.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\n transformed.x+=.14*position.y*sin(breeze*1.6+position.x*.47+position.z*.32);");};
    scene.add(new THREE.Mesh(geometria(p,null,null,cores),gm));
  }
  const sky=new THREE.Mesh(new THREE.SphereGeometry(750,32,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{t:tempo,dia,ceu:corCeu},vertexShader:vertex,fragmentShader:`
  varying vec3 lugar; uniform float t,dia; uniform vec3 ceu;
  float hash(vec2 a){return fract(sin(dot(a,vec2(127.1,311.7)))*43758.5453);}
  float noise2(vec2 p){vec2 a=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(a),hash(a+vec2(1,0)),u.x),mix(hash(a+vec2(0,1)),hash(a+1.),u.x),u.y);}
  void main(){vec3 v=normalize(lugar-cameraPosition);float h=max(.0,v.y);
    vec3 c=mix(mix(ceu,vec3(.98,.83,.68),.5*dia),ceu*vec3(.76,.89,.99),smoothstep(-.03,.55,h));
    vec2 p=v.xz/max(.09,h+.12)*2.1+vec2(t*.012,0.);
    float nube=noise2(p)*.56+noise2(p*2.1)*.29+noise2(p*4.2)*.15;
    c=mix(c,vec3(.99,.94,.81),smoothstep(.58,.74,nube)*smoothstep(.015,.18,h)*dia*.7);
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
  function refletirMargens(){
    const fila=espelhos.filter(e=>!e.pronto);
    for(const e of fila){
      const alvo=new THREE.WebGLCubeRenderTarget(128,{generateMipmaps:false,minFilter:THREE.LinearFilter});
      const cam=new THREE.CubeCamera(.1,160,alvo);cam.position.set(e.L.x,.45,e.L.z);
      const esconder=[];scene.traverse(o=>{if(o.visible&&o.isSprite){o.visible=false;esconder.push(o);}});
      espelhos.forEach(w=>w.m.visible=false);
      try{cam.update(renderer,scene);e.m.material.uniforms.reflexoLocal.value=alvo.texture;e.m.material.uniforms.pronto.value=1;e.pronto=true;}
      finally{espelhos.forEach(w=>w.m.visible=true);esconder.forEach(o=>o.visible=true);}
    }
  }
  return {plantar,cultivar,caminho,centroRio,refletirMargens,tempo,atualizar(t,luz,ceu){tempo.value=t;dia.value=Math.max(0,Math.min(1,luz));corCeu.value.copy(ceu);}};
}

