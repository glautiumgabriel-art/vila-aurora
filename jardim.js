/* Anexo ao pomar de Pinheiral. Paredes caiadas, telhas de barro e jardins de margem. */
function pomarDaLagoa(scene,nav) {
  const inst=new Map(), materiais=new Map();
  const cubo=new THREE.BoxGeometry(1,1,1),rocha=new THREE.IcosahedronGeometry(1,0),folha=new THREE.IcosahedronGeometry(1,1);
  const vaso=new THREE.CylinderGeometry(.92,.68,1,9), tronco=new THREE.CylinderGeometry(.72,1,1,8);
  let seed=7533;const r=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function item(g,cor,x,y,z,w,h,d,ax=0,ay=0,az=0){
    if(!inst.has(g))inst.set(g,[]);const m=new THREE.Object3D();m.position.set(x,y,z);m.rotation.set(ax,ay,az);m.scale.set(w,h,d);m.updateMatrix();inst.get(g).push([m.matrix,cor]);
  }
  const coresFlor=[0xf3d48b,0xe9a290,0xffeee0,0xb5a5d6];
  function flores(x,z,n,largura,y=0){
    for(let i=0;i<n;i++){
      const xx=x+(r()-.5)*largura,zz=z+(r()-.5)*largura*.54,h=.19+.20*r();
      item(folha,0x55855b,xx,y+.12,zz,.13,.22,.13,.1,r()*6,.24);
      const c=coresFlor[Math.floor(r()*4)];for(let k=0;k<5;k++){const a=k*1.257;item(rocha,c,xx+.057*Math.cos(a),y+h,zz+.057*Math.sin(a),.062,.05,.062);}
      item(rocha,0xe0ae4b,xx,y+h+.022,zz,.042,.04,.042);
    }
  }
  function casa(x,z,cor,telha,porta){
    nav?.caixa("casa do pomar",x,z,2.02,1.81);
    // Frente voltada para o lago (+X). As duas águas do telhado encontram a cumeeira acima da porta.
    item(cubo,cor,x,1.38,z,3.8,2.76,3.4);
    item(cubo,0x918776,x,.15,z,4.03,.30,3.62);
    for(let j=0;j<12;j++){const a=j/12,larg=3.47*(1-a);item(cubo,cor,x,2.75+j*.1,z,3.79,.115,larg);}
    for(const lado of [-1,1]){
      item(cubo,telha,x,3.33,z+lado*.98,4.52,.18,2.48,lado*.55);
      for(let i=0;i<5;i++)item(cubo,telha,x,3.92-i*.282,z+lado*(.1+i*.46),4.61,.09,.19,lado*.55);
      item(cubo,0x87644c,x,2.73,z+lado*1.79,4.2,.12,.12);
    }
    item(cubo,0xb66b53,x-.81,3.9,z-.62,.55,1.42,.57);item(cubo,0x915744,x-.81,4.63,z-.62,.68,.15,.7);
    item(cubo,0x866e53,x+1.921,1.03,z+.40,.1,2.07,.96);
    item(cubo,porta,x+1.992,.96,z+.40,.09,1.82,.78);
    item(rocha,0xdab563,x+2.06,1.03,z+.62,.07,.068,.068);
    for(const dz of [-.86,1.13]){
      const zz=z+dz,yy=dz>0?1.59:1.51;
      item(cubo,0x645d50,x+1.96,yy,zz,.13,.88,.70);
      item(cubo,0xf6d299,x+2.04,yy,zz,.05,.72,.53);
      item(cubo,0x756957,x+2.08,yy,zz,.05,.76,.052);
      item(cubo,0x756957,x+2.08,yy,zz,.05,.05,.60);
      for(const k of [-1,1])item(cubo,porta,x+2.02,yy,zz+k*.47,.1,.85,.21);
      item(cubo,0x976b50,x+2.08,yy-.54,zz,.30,.20,.98);flores(x+2.16,zz,5,.8,yy-.48);
    }
    item(cubo,0xa9a89a,x+2.19,.10,z+.4,.65,.20,1.05);
    for(let i=0;i<4;i++)item(rocha,0xb7ab91,x+2.72+i*.50,.06,z+.4+.11*Math.sin(i),.33,.08,.35,0,r()*6);
    for(const k of [-1,1]){item(vaso,0xb57e60,x+2.3,.23,z+.40+k*.87,.25,.46,.25);flores(x+2.30,z+.40+k*.87,5,.30,.38);}
  }
  casa(35.5,-103.6,0xf0dcb6,0xb16c56,0x729996);
  casa(33.6,-95.9,0xe5cda9,0x8b797d,0x70947c);
  function arvore(x,z,s,rosa=false){
    nav?.caixa("tronco do pomar",x,z,.27*s,.27*s);
    item(tronco,0x826e59,x,1.7*s,z,.23*s,3.4*s,.24*s,0,0,.05);
    for(let k=0;k<5;k++){
      const a=1.3*k,h=(2.1+r()*.43)*s;
      item(tronco,0x87735b,x+Math.cos(a)*.44*s,h,z+Math.sin(a)*.44*s,.098*s,1.55*s,.098*s,.62*Math.sin(a),0,-.62*Math.cos(a));
    }
    for(let k=0;k<27;k++){
      const a=k*2.4,rad=Math.sqrt(r())*1.47*s,h=3.14*s+(1-rad/(1.47*s))*.98*s+(r()-.5)*s;
      const xx=x+Math.cos(a)*rad,zz=z+Math.sin(a)*rad;
      const pal=rosa?[0xc88e89,0xdba29b,0xeab2a3,0xf1c8b9]:[0x527d64,0x668f6b,0x769b71,0x92ab7b];
      const rr=(.49+r()*.58)*s;
      item(folha,pal[k%4],xx,h,zz,rr,rr*.79,rr*1.18,r()*.5,a);
      if(rosa&&k%2===0)for(let j=0;j<8;j++)item(rocha,0xf8d9cb,xx+(r()-.5)*rr*1.4,h+(r()-.5)*rr,zz+rr*.66,.08,.09,.08);
    }
  }
  for(const [x,z,s,rose] of [[38.2,-99.8,1.03,1],[38,-92.3,1.12],[39.5,-108.3,1.2],[48.8,-109.4,1.15,1],[49,-89.2,.95],[48,-111.5,1.04,1],[29,-98,1.32]])arvore(x,z,s,rose);
  for(let i=0;i<58;i++){
    const a=r()*6.283,xx=44+Math.cos(a)*(6.3+r()*2.2),zz=-100+Math.sin(a)*(4.6+r()*2.0);
    if(xx>48.7&&zz>-103&&zz<-94.4)continue;
    flores(xx,zz,7,.76);
    if(i%4===0)item(folha,0x72936c,xx,.29,zz,.61,.47,.65,r()*.3,r()*6);
  }
  for(const [x,z] of [[53.5,-101.4],[54.2,-96.1],[55.4,-95.6],[55,-101.3],[50,-97.2],[51.1,-102.1],[50.8,-95.1]])flores(x,z,18,.95);
  for(const [g,l] of inst){
    const m=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:0xffffff}),l.length);
    l.forEach(([mx,c],i)=>{m.setMatrixAt(i,mx);m.setColorAt(i,new THREE.Color(c).convertSRGBToLinear());});
    m.frustumCulled=false;m.receiveShadow=true;m.castShadow=true;scene.add(m);
  }
}

