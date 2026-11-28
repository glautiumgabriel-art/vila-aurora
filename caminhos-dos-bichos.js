/* Navegação no plano da vila. As caixas vêm dos mesmos modelos que compõem o mapa. */
function criarCaminhosDosBichos() {
  const vias=new Map(),pracadas=[],cacheArestas=new Map(),setores=new Map(), casas=[], pontes=[], lagos=[], atores=new Set();
  const chave=(x,z)=>x+4096*z, setor=v=>Math.floor(v/6);
  function caixa(tipo,x,z,w,h,dinamica=false) {
    cacheArestas.clear();const b={tipo,x,z,w,h};
    for(let i=setor(x-w-2);i<=setor(x+w+2);i++) for(let j=setor(z-h-2);j<=setor(z+h+2);j++){
      const k=chave(i,j); if(!setores.has(k)) setores.set(k,[]); setores.get(k).push(b);
    }
    if(dinamica) casas.push(b);
  }
  function limparCasas(){
    cacheArestas.clear();const antigos=new Set(casas);casas.length=0;
    for(const [k,bs] of setores) if(bs.some(b=>antigos.has(b))) setores.set(k,bs.filter(b=>!antigos.has(b)));
  }
  function volume(tipo,box,dinamica=false){
    if(box.isEmpty())return;
    const {min:a,max:b}=box, x=(a.x+b.x)/2,z=(a.z+b.z)/2,w=(b.x-a.x)/2,h=(b.z-a.z)/2;
    if(dinamica&&(tipo==="home_A"||tipo==="home_B")){
      // Fachada +Z, corredor curto da soleira até o abrigo interno.
      const porta=Math.min(.66,w*.64), lado=(w-porta)/2;
      for(const s of [-1,1])caixa("casa",x+s*(porta+lado),z,lado,h,true);
      caixa("casa",x,z-h*.58,w,h*.42,true);
    } else caixa(tipo,x,z,w,h,dinamica);
  }
  function modelo(tipo,obj){
    if(tipo==="grain"||tipo.startsWith("flag"))return;
    obj.updateWorldMatrix(true,true);
    volume(tipo,new THREE.Box3().setFromObject(obj));
  }
  function instancias(tipo,mesh,dinamica){
    if(!/^(wall|fence|home_A|home_B|tent|tree_A|tree_B|trees_[LM]|rock_[ABC]|hills_[ABC]|mont_[ABC])$/.test(tipo))return;
    const m=new THREE.Matrix4(),g=mesh.geometry; if(!g.boundingBox)g.computeBoundingBox();
    for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);volume(tipo,g.boundingBox.clone().applyMatrix4(m),dinamica);}
  }
  function construirPonte(scene,x,z){
    const w=4.5,h=1.65,trechos=24,verts=[],cores=[];
    const altura=u=>.03+.48*Math.max(0,1-u*u);
    const raiz=new THREE.Group();scene.add(raiz);
    const madeira=[0x9a724d,0xb48a5f,0xa47b52,0xbf9369],c=new THREE.Color();
    function tabua(a,b,cor){
      const ya=altura(a/w),yb=altura(b/w);
      for(const [xx,yy,zz] of [[a,ya,-h],[a,ya,h],[b,yb,h],[a,ya,-h],[b,yb,h],[b,yb,-h]]){
        verts.push(x+xx,yy,z+zz);c.setHex(cor);cores.push(c.r,c.g,c.b);}
    }
    for(let i=0;i<trechos;i++)tabua(-w+2*w*i/trechos,-w+2*w*(i+1)/trechos,madeira[i%4]);
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));geo.setAttribute("color",new THREE.Float32BufferAttribute(cores,3));geo.computeVertexNormals();
    const deck=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));raiz.add(deck);deck.receiveShadow=true;
    const mat=new THREE.MeshLambertMaterial({color:0x6d4e38}),box=new THREE.BoxGeometry(1,1,1),mats=[],eixo=new THREE.Vector3(0,1,0);
    function barra(a,b,largura){const d=b.clone().sub(a),o=new THREE.Object3D();o.position.copy(a).lerp(b,.5);o.scale.set(largura,d.length(),largura);o.quaternion.setFromUnitVectors(eixo,d.normalize());o.updateMatrix();mats.push(o.matrix);}
    for(const lado of [-1,1]){let anterior;for(let i=0;i<=6;i++){const dx=w*(i/3-1),base=new THREE.Vector3(x+dx,altura(dx/w)-.12,z+lado*h),topo=base.clone();topo.y+=.99;
      barra(base,topo,.15);if(anterior)barra(anterior,topo,.13);anterior=topo;}}
    const rails=new THREE.InstancedMesh(box,mat,mats.length);mats.forEach((m,i)=>rails.setMatrixAt(i,m));rails.castShadow=true;raiz.add(rails);
    pontes.push({x,z,w,h:h-.10,linha:Array.from({length:97},(_,i)=>altura(i/48-1))});
  }
  function ponte(x,z,r){return pontes.find(b=>Math.abs(x-b.x)<=b.w+.18&&Math.abs(z-b.z)+r<=b.h);}
  function via(p){
    for(let i=0;i+11<p.length;i+=6){const a=p.slice(i,i+12),xs=[a[0],a[3],a[6],a[9]],zs=[a[2],a[5],a[8],a[11]];
      for(let xx=setor(Math.min(...xs));xx<=setor(Math.max(...xs));xx++)for(let zz=setor(Math.min(...zs));zz<=setor(Math.max(...zs));zz++){
        const k=chave(xx,zz);if(!vias.has(k))vias.set(k,[]);vias.get(k).push(a);}
    }
  }
  const trilhas=new Map();
  function trilha(pontos,tipo){
    for(let i=1;i<pontos.length;i++){
      const a=pontos[i-1],b=pontos[i],dx=b.x-a.x,dz=b.z-a.z,len2=dx*dx+dz*dz;
      if(!len2) continue;
      const r=Math.max(a.r,b.r),s={a,b,dx,dz,len2,tipo};
      for(let x=setor(Math.min(a.x,b.x)-r);x<=setor(Math.max(a.x,b.x)+r);x++)
        for(let z=setor(Math.min(a.z,b.z)-r);z<=setor(Math.max(a.z,b.z)+r);z++){
          const k=chave(x,z); if(!trilhas.has(k)) trilhas.set(k,[]); trilhas.get(k).push(s);
        }
    }
  }
  function limparTrilhas(tipo){
    for(const [k,ss] of trilhas){
      const resto=ss.filter(s=>s.tipo!==tipo);
      if(resto.length) trilhas.set(k,resto); else trilhas.delete(k);
    }
  }
  function emTrilha(x,z){
    const ss=trilhas.get(chave(setor(x),setor(z)));
    if(!ss) return false;
    for(const s of ss){
      const {a,b,dx,dz,len2}=s;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len2));
      if((x-a.x-dx*t)**2+(z-a.z-dz*t)**2<=(a.r+t*(b.r-a.r))**2) return true;
    }
    return false;
  }
  function custoSolo(x,z){return emTrilha(x,z)||x*x+z*z<5.8**2?.75:1.42;}
  function custoTrecho(x,z,xx,zz){
    const d=Math.hypot(xx-x,zz-z), n=Math.max(1,Math.ceil(d/.95));
    let custo=0;
    for(let i=0;i<n;i++){const t=(i+.5)/n;custo+=custoSolo(x+(xx-x)*t,z+(zz-z)*t);}
    return custo*d/n;
  }
  function piso(x,z){
    const b=ponte(x,z,0);
    if(!b){
      let y=-.018;for(const c of pracadas)if((c.x-x)**2+(c.z-z)**2<5.8**2)y=.04;
      const vs=vias.get(chave(setor(x),setor(z)));if(vs)for(const a of vs){
        const dx=a[6]-a[0],dz=a[8]-a[2],u=dx===0?(z-a[2])/dz:(a[6]===a[9]?(x-a[0])/dx:(z-a[2])/dz);
        if(u>=0&&u<=1){const horizontal=a[0]===a[3],q=horizontal?z:x;
          const j=horizontal?2:0,v1=a[j]+u*(a[6+j]-a[j]),v2=a[3+j]+u*(a[9+j]-a[3+j]);if(q>=Math.min(v1,v2)&&q<=Math.max(v1,v2))y=Math.max(y,a[1]);}
      }return emTrilha(x,z)?Math.max(y,.029):y;}
    const u=Math.max(0,Math.min(96,((x-b.x)/b.w+1)*48)),i=Math.floor(u);
    return b.linha[i]+(b.linha[Math.min(96,i+1)]-b.linha[i])*(u-i);
  }
  let vilasProtegidas=[];
  function protegerVilas(vilas){vilasProtegidas=vilas;cacheArestas.clear();}
  function proibida(x,z,r,a){
    if(a?.sombrio&&vilasProtegidas.some(V=>V.i!==a.invasaoVi&&(V.cx-x)**2+(V.cz-z)**2<(45+r)**2))return "raio de vila";
    const bs=setores.get(chave(setor(x),setor(z)));
    if(bs) for(const b of bs){const dx=Math.max(0,Math.abs(x-b.x)-b.w),dz=Math.max(0,Math.abs(z-b.z)-b.h);
      if(dx*dx+dz*dz<r*r)return b.tipo;}
    for(const l of lagos) if(l.rio ? Math.abs(z+.0)<99&&Math.abs(x-l.centro(z))<l.largura(z)+r+.06 : Math.hypot((x-l.x)/1.18,(z-l.z)/.91)<5.57+r/.91){
      if(!ponte(x,z,r))return "água";
    }
    return null;
  }
  function perto(x,z,r,dono,folga=0){
    for(const b of atores){if(b===dono||!b.g.parent)continue;
      if((b.x-x)**2+(b.z-z)**2<(r+b.r+folga)**2)return true;}
    return false;
  }
  function livre(a,x,z,trafego=false){return !proibida(x,z,a.r+.025,a)&&(!a.desvio||a.desvio(x,z))&&(!trafego||!perto(x,z,a.r,a,.04));}
  function segmento(a,x,z,xx,zz,trafego){
    const n=Math.max(1,Math.ceil(Math.hypot(xx-x,zz-z)/.24));
    for(let i=1;i<=n;i++)if(!livre(a,x+(xx-x)*i/n,z+(zz-z)*i/n,trafego))return false;
    return true;
  }
  function ponto(a,x,z,trafego){
    const X=Math.round(x),Z=Math.round(z);
    for(let n=0;n<=16;n++) for(let i=-n;i<=n;i++) for(let j=-n;j<=n;j++){
      if(Math.max(Math.abs(i),Math.abs(j))!==n)continue;
      if(livre(a,X+i,Z+j,trafego))return {x:X+i,z:Z+j};
    }
    return null;
  }
  // A* de oito vizinhos com teste das diagonais e simplificação por visada.
  function rota(a,tx,tz,trafego=false,preferirTrilhas=false){
    const fim=livre(a,tx,tz,trafego)?{x:tx,z:tz}:ponto(a,tx,tz,trafego);if(!fim)return [];
    const d=Math.hypot(a.x-fim.x,a.z-fim.z);
    const preferir=preferirTrilhas&&d>3.2&&Math.abs(a.x)<43&&Math.abs(a.z)<43&&Math.abs(fim.x)<43&&Math.abs(fim.z)<43;
    const direto=segmento(a,a.x,a.z,fim.x,fim.z,trafego);
    if(direto&&(!preferir||custoTrecho(a.x,a.z,fim.x,fim.z)<=d*.86))return [fim];
    let inicio=null;
    for(let n=0;n<=2&&!inicio;n++)for(let i=-n;i<=n&&!inicio;i++)for(let j=-n;j<=n&&!inicio;j++){
      const x=Math.round(a.x)+i,z=Math.round(a.z)+j;
      if(livre(a,x,z,trafego)&&segmento(a,a.x,a.z,x,z,trafego))inicio={x,z};
    }
    if(!inicio)return direto?[fim]:[];
    const fila=[],custos=new Map(),dirs=[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    function incluir(x,z,g,p){
      const k=chave(x,z);if((custos.get(k)??Infinity)<=g)return;
      custos.set(k,g);const v={x,z,g,p,f:g+(preferir?.75:1)*Math.hypot(fim.x-x,fim.z-z)};
      let i=fila.length;fila.push(v);while(i){const pai=(i-1)>>1;if(fila[pai].f<=v.f)break;fila[i]=fila[pai];i=pai;}fila[i]=v;
    }
    incluir(inicio.x,inicio.z,0,null);
    for(let n=0;fila.length&&n<3200;n++){
      const atual=fila[0],last=fila.pop();if(fila.length){let i=0;while(2*i+1<fila.length){
        let j=2*i+1;if(j+1<fila.length&&fila[j+1].f<fila[j].f)j++;if(last.f<=fila[j].f)break;fila[i]=fila[j];i=j;}fila[i]=last;}
      if(atual.g!==custos.get(chave(atual.x,atual.z)))continue;
      if(Math.abs(atual.x-fim.x)<=1&&Math.abs(atual.z-fim.z)<=1&&segmento(a,atual.x,atual.z,fim.x,fim.z,trafego)){
        const passos=[];for(let p=atual;p;p=p.p)passos.push(p);passos.reverse();passos.push(fim);
        const saida=[];let origem=a,i=0;while(i<passos.length){let j=i,custo=custoTrecho(origem.x,origem.z,passos[i].x,passos[i].z);
          while(j+1<passos.length){
            const p=passos[j],q=passos[j+1], acrescimo=preferir?custoTrecho(p.x,p.z,q.x,q.z):0;
            if(preferir&&custoTrecho(origem.x,origem.z,q.x,q.z)>(custo+acrescimo)*1.035+.05)break;
            if(!segmento(a,origem.x,origem.z,q.x,q.z,trafego))break;
            custo+=acrescimo;j++;
          }
          origem=passos[j];saida.push({x:origem.x,z:origem.z});i=j+1;}return saida;
      }
      for(let dir=0;dir<dirs.length;dir++){const [dx,dz]=dirs[dir];const x=atual.x+dx,z=atual.z+dz,g=atual.g+(dx&&dz?Math.SQRT2:1)*(preferir?custoSolo((x+atual.x)/2,(z+atual.z)/2):1);
        if((custos.get(chave(x,z))??Infinity)<=g)continue;
        const perfil=a.sombrio?a.r+":sombrio:"+(a.invasaoVi??"fora"):a.r;
        let cache=cacheArestas.get(perfil);if(!cache){cache=new Map();cacheArestas.set(perfil,cache);}
        const k=chave(atual.x,atual.z)*8+dir;let ok=cache.get(k);
        if(ok===undefined){ok=segmento(a.desvio?{...a,desvio:null}:a,atual.x,atual.z,x,z,false);cache.set(k,ok);}
        if(ok&&(!a.desvio||a.desvio(x,z))&&(!trafego||(!perto(x,z,a.r,a,.05)&&!perto(x-dx*.5,z-dz*.5,a.r,a,.05))))incluir(x,z,g,atual);}
    }
    return direto?[fim]:preferir?rota(a,tx,tz,trafego,false):[];
  }
  return {via,trilha,emTrilha,limparTrilhas,protegerVilas,pracadas,construirPonte,modelo,instancias,caixa,limparCasas,lagos,pontes,piso,proibida,atores,perto,ponto,rota,segmento};
}