/* Pés em contato ficam ancorados em coordenadas de mundo até a próxima passada. */
function criarPassada(g,tipo,nav) {
  let dobrarAncas=null,restaurarAncas=null;
  const pele=!!g.userData.mixer, corpo=new THREE.Group(), pes=[], v=new THREE.Vector3();
  const textura=criarPassada.sombra||(criarPassada.sombra=(()=>{
    const c=document.createElement("canvas");c.width=c.height=64;const p=c.getContext("2d"),d=p.createRadialGradient(32,32,0,32,32,32);
    d.addColorStop(0,"rgba(28,21,18,.48)");d.addColorStop(.55,"rgba(34,28,20,.27)");d.addColorStop(1,"rgba(35,25,16,0)");
    p.fillStyle=d;p.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);
  })());
  const material=criarPassada.mat||(criarPassada.mat=new THREE.MeshBasicMaterial({map:textura,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  const sombra=new THREE.Mesh(criarPassada.plano||(criarPassada.plano=new THREE.PlaneGeometry(1,1)),material);
  const antiga=g.children.slice();g.add(corpo);antiga.forEach(o=>corpo.add(o));g.add(sombra);
  sombra.rotation.x=-Math.PI/2;sombra.renderOrder=1;
  const tam=({galinha:.27,ovelha:.6,goblin:.34,aranha:.72,lobo:.68,javali:.78,esqueleto:.4})[tipo]||.6;
  sombra.scale.set(tam*2.3,tam*3,1);sombra.position.y=.012;
  if(!pele){
    // Os modelos simples antigos olham para +X, exceto o goblin e o esqueleto.
    const lateral=!["goblin","esqueleto","filhote"].includes(tipo);
    const indices={filhote:[11,12,13,14],ovelha:[2,3,4,5],galinha:[4,5],goblin:[0,1],aranha:[2,3,4,5,6,7,8,9],javali:[4,5,6,7],lobo:[4,5,6,7]}[tipo]||[];
    const pernas=indices.map(i=>antiga[i]).filter(Boolean);
    corpo.rotation.y=lateral?-Math.PI/2:0;
    const par=tipo==="galinha"||tipo==="goblin";
    const geo=criarPassada.haste||(criarPassada.haste=new THREE.BoxGeometry(1,1,1));
    const lote=pernas.length?new THREE.InstancedMesh(geo,pernas[0].material,pernas.length*3):null;
    if(lote){lote.instanceMatrix.setUsage(THREE.DynamicDrawUsage);lote.frustumCulled=false;lote.castShadow=true;g.add(lote);}
    pernas.forEach((o,i)=>{
      const x=tipo==="galinha"?(i?-.083:.083):lateral?-o.position.z:o.position.x;
      const z=tipo==="galinha"?0:lateral?o.position.x:o.position.z;
      const aranha=tipo==="aranha",h={galinha:.24,goblin:.48,ovelha:.49,filhote:.19,javali:.41,lobo:.45,aranha:.48}[tipo]||.4;
      const largura=tipo==="galinha"?.041:aranha?.052:tipo==="goblin"?.14:.105;
      const ext=aranha?Math.sign(x)*.32:0,px=x+ext;
      const fase=par?i*.5:((Math.floor(i/2)+i%2)%2)*.5;
      corpo.remove(o);
      const coxa=new THREE.Object3D(),canela=new THREE.Object3D(),pe=new THREE.Object3D();
      const sola=largura*.6;pe.scale.set(largura*(aranha?1:1.22),sola,largura*(tipo==="galinha"?2.8:1.6));
      const indice=i*3,matriz=new THREE.Matrix4();
      pes.push({x:px,z,fase,ler:out=>{lote.getMatrixAt(indice+2,matriz);return out.set(0,-.5,0).applyMatrix4(matriz).applyMatrix4(g.matrixWorld);},posicionar(local,sentado,balanco){
        const quadril=new THREE.Vector3(aranha?x*.5:x,h+balanco-sentado*h*(z<=0?.48:.20),z);
        const joelho=quadril.clone().lerp(local,.52);joelho.z+=((z<0||par)?1:-1)*h*(.27+sentado*.35);if(aranha){joelho.x+=ext;joelho.y+=.30;}
        function haste(m,a,b){v.copy(b).sub(a);m.scale.set(largura,v.length(),largura);m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(criarPassada.cima,v.normalize());}
        haste(coxa,quadril,joelho);haste(canela,joelho,local);pe.position.copy(local);pe.position.y+=sola/2;
        coxa.updateMatrix();canela.updateMatrix();pe.updateMatrix();lote.setMatrixAt(indice,coxa.matrix);lote.setMatrixAt(indice+1,canela.matrix);lote.setMatrixAt(indice+2,pe.matrix);lote.instanceMatrix.needsUpdate=true;
      }});
    });
  } else {
    // Uma amostra real de sola por membro. A correção alcança tanto o pé IK
    // como a cadeia deformadora do GLB, sem duplicar o avanço do clipe.
    const nomes=o=>o.name.toLowerCase().replace(/[^a-z]/g,"");
    const esq=tipo==="esqueleto"||tipo==="gigante",grupos=esq?["l","r"]:["frontl","frontr","backl","backr"];
    const modelos=[];g.traverse(o=>{if(o.isSkinnedMesh)modelos.push(o);});
    g.userData.play("Idle");g.userData.mixer.update(.35);g.updateMatrixWorld(true);
    // Posição e pesos inteiros dos GLBs compactados usam normalização na GPU.
    function escala(attr){if(!attr.normalized)return 1;const A=attr.array;return A instanceof Int16Array?32767:A instanceof Uint16Array?65535:A instanceof Int8Array?127:255;}
    function pontoDaPele(m,k){
      const {position,skinIndex,skinWeight}=m.geometry.attributes,sk=m.skeleton;
      const origem=new THREE.Vector3().fromBufferAttribute(position,k).divideScalar(escala(position)).applyMatrix4(m.bindMatrix);
      const partes=[];
      for(let q=0;q<4;q++){const w=skinWeight.array[k*4+q]/escala(skinWeight);if(!w)continue;
        const i=skinIndex.array[k*4+q];partes.push([sk.bones[i],origem.clone().applyMatrix4(sk.boneInverses[i]),w]);}
      const tmp=new THREE.Vector3();return out=>{out.set(0,0,0);for(const [osso,p,w] of partes)out.addScaledVector(tmp.copy(p).applyMatrix4(osso.matrixWorld),w);return out;};
    }
    if(!esq){
      const lados=[];
      for(const lado of ["l","r"]){const nomesOsso=new Map();g.traverse(o=>nomesOsso.set(nomes(o),o));
        const junta=["backleg","backupperleg","backlowerleg"].map(k=>nomesOsso.get(k+lado));
        const fim=nomesOsso.get("backlowerleg"+lado+"end"),casco=nomesOsso.get("ikbackleg"+lado);
        if(fim&&casco&&junta.every(Boolean))lados.push({junta,fim,casco,rot:junta.map(o=>o.quaternion.clone()),pos:casco.position.clone()});}
      let aplicado=false;
      restaurarAncas=()=>{if(!aplicado)return;for(const l of lados){
        l.junta.forEach((o,i)=>o.quaternion.copy(l.rot[i]));l.casco.position.copy(l.pos);}
        aplicado=false;};
      dobrarAncas=s=>{if(s<.002)return;const eixo=new THREE.Vector3(1,0,0).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
        for(const l of lados){const de=l.fim.getWorldPosition(new THREE.Vector3());l.pos.copy(l.casco.position);
          l.junta.forEach((o,i)=>{l.rot[i].copy(o.quaternion);const local=eixo.clone().applyQuaternion(o.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
            o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(local,[-.98,1.82,-.8][i]*s));o.updateWorldMatrix(false,true);});
          const desloc=l.fim.getWorldPosition(new THREE.Vector3()).sub(de),dest=l.casco.getWorldPosition(new THREE.Vector3()).add(desloc);
          l.casco.position.copy(l.casco.parent.worldToLocal(dest));l.casco.updateWorldMatrix(false,true);
        }aplicado=true;};
    }
    for(const [i,id] of grupos.entries()){
      const lado=id.slice(-1),frente=id.startsWith("front");
      const ossos=esq?["foot"+lado]:["ik"+(frente?"front":"back")+"leg"+lado,(frente?"front":"back")+"lowerleg"+lado];
      const nomesPe=esq?["foot"+lado,"toes"+lado]:[ossos[0],(frente?"ff":"ffb")+lado];
      let melhor=null,min=Infinity;const ajustar=new Set();
      for(const m of modelos){const sk=m.skeleton,ind=m.geometry.attributes.skinIndex,peso=m.geometry.attributes.skinWeight;
        const pertencem=sk.bones.map(o=>nomesPe.includes(nomes(o)));
        sk.bones.forEach(o=>{if(ossos.includes(nomes(o)))ajustar.add(o);});
        for(let k=0;k<ind.count;k++){let total=0;for(let q=0;q<4;q++)if(pertencem[ind.array[k*4+q]])total+=peso.array[k*4+q]/escala(peso);if(total<.995)continue;
          const ler=pontoDaPele(m,k);ler(v);if(v.y<min){melhor=ler;min=v.y;}}
      }
      if(!melhor)continue;
      const ler=melhor;
      const repouso=g.worldToLocal(ler(new THREE.Vector3()));
      const alvos=[...ajustar].map(o=>({o,base:o.position.clone()}));
      pes.push({natural:new THREE.Vector3(),alvo:new THREE.Vector3(),ajuste:0,apoio:false,x:repouso.x,z:repouso.z,y:repouso.y,fase:(esq?i:(i===1||i===2?1:0))*.5,ler,
        restaurar(){if(this.corrigido){alvos.forEach(({o,base})=>o.position.copy(base));this.corrigido=false;}},
        posicionar(local){this.corrigido=true;const ponto=ler(new THREE.Vector3()),d=g.localToWorld(local.clone()).sub(ponto);
          for(const item of alvos){const o=item.o;item.base.copy(o.position);const origem=o.getWorldPosition(new THREE.Vector3());o.position.copy(o.parent.worldToLocal(origem.add(d)));o.updateWorldMatrix(false,true);}
        }});
    }
  }
  const cadencias=criarPassada.cadencias||(criarPassada.cadencias=new Map());
  // Velocidade longitudinal dos pés no trecho baixo do clipe, na escala real do ator.
  function velocidadeDoClipe(nome){
    const chave=tipo+":"+nome;if(cadencias.has(chave))return cadencias.get(chave);
    const c=KAYKIT.clipes(tipo==="gigante"?"Barbarian":tipo).find(c=>c.name.replace(/^.*\|/,"")===nome);
    if(!c||!pes.length)return 1.4;
    const dt=c.duration/40,amostras=pes.map(()=>[]),velocidades=[];
    g.userData.play(nome,1);g.userData.mixer.update(.26);
    for(let i=0;i<=40;i++){g.userData.mixer.update(dt);g.updateMatrixWorld(true);pes.forEach((p,j)=>{p.ler(v);amostras[j].push([v.y,v.z]);});}
    for(const arr of amostras){const baixo=Math.min(...arr.map(k=>k[0]));
      for(let j=1;j<arr.length;j++){const vel=(arr[j-1][1]-arr[j][1])/dt;if(arr[j][0]<baixo+.07&&vel>.08)velocidades.push(vel);}}
    velocidades.sort((a,b)=>a-b);const valor=velocidades[Math.floor(velocidades.length*.60)]||1.4;
    cadencias.set(chave,valor);return valor;
  }
  const humano=["esqueleto","gigante"].includes(tipo);
  const andar=humano?"Walking_A":"Walk",correr=humano?"Running_A":"Gallop";
  const vAnda=pele?velocidadeDoClipe(andar):1,vCorre=pele?velocidadeDoClipe(correr):1;
  if(pele){g.userData.play("Idle",1);g.userData.mixer.update(.30);}
  function apoioDoClipe(dt){
    if(!pes.length)return;
    // Desce o conjunto até a primeira sola alcançar a superfície sob ela.
    corpo.position.y=0;g.updateWorldMatrix(true,true);let altura=Infinity;
    for(const p of pes){p.ler(p.natural);p.piso=nav.piso(p.natural.x,p.natural.z);
      p.folga=p.natural.y-p.piso;altura=Math.min(altura,p.folga);}
    corpo.position.y=-altura;g.updateWorldMatrix(true,true);
    let quantidade=0;
    for(const p of pes){p.natural.y-=altura;p.folga-=altura;p.ajuste=Math.max(0,p.ajuste-dt);
      p.erro=p.apoio?Math.hypot(p.natural.x-p.alvo.x,p.natural.z-p.alvo.z):0;
      p.proximo=p.apoio?(p.folga<.060&&p.erro<.105):(p.folga<.024&&p.ajuste===0);
      if(p.proximo)quantidade++;}
    if(!quantidade){
      // Transfere o peso ao outro membro ANTES de liberar a última pata apoiada.
      // Uma pata que continua em contato conserva a mesma âncora inclusive na curva.
      let melhor=null,menor=Infinity;
      for(const p of pes){const custo=(p.apoio?1:0)+p.folga+p.erro+p.ajuste;
        if(custo<menor){menor=custo;melhor=p;}}
      melhor.proximo=true;
    }
    for(const p of pes){
      if(p.proximo&&!p.apoio){p.alvo.copy(p.natural);p.alvo.y=nav.piso(p.alvo.x,p.alvo.z);p.ajuste=0;}
      if(!p.proximo&&p.apoio){p.ajuste=.09;p.saida=p.alvo.clone();}
      p.apoio=p.proximo;
      if(p.apoio)p.posicionar(g.worldToLocal(p.alvo.clone()));
      else if(p.ajuste>0){const u=1-p.ajuste/.09,q=p.saida.clone().lerp(p.natural,.15+.85*u);
        q.y=Math.max(q.y,nav.piso(q.x,q.z)+.012+.04*Math.sin(Math.PI*u));p.posicionar(g.worldToLocal(q));}
    }
  }
  let ciclo=0,sentado=0,tempo=0;
  const passada={ovelha:.51,galinha:.26,goblin:.58,aranha:.52,lobo:.71,javali:.80,esqueleto:.75}[tipo]||.55;
  function atualizar(a,dt,dist,virada){
    tempo+=dt;const corre=a.vel>1.85, passo=passada*(corre?1.32:1);
    const avanco=dist+Math.abs(virada)*tam*.64;ciclo+=avanco/passo;
    const senta=a.modo==="sentado"?1:0;sentado+=(senta-sentado)*(1-Math.exp(-5*dt));
    const balanco=Math.sin(ciclo*Math.PI*4)*Math.min(.036,a.vel*.022)+.007*Math.sin(tempo*2.3);
    if(pele){pes.forEach(p=>p.restaurar());restaurarAncas?.();
      const velocidade=dt>0?avanco/dt:0;
      const clipe=a.modo==="sentado"&&humano?"Sit_Floor_Idle":velocidade<.04?"Idle":corre?correr:andar;
      g.userData.play(a.golpe||clipe,velocidade<.04||a.golpe?1:Math.max(.12,velocidade/(corre?vCorre:vAnda)));
      g.userData.mixer.update(dt);
      corpo.rotation.x=(humano?0:-sentado*.24)+(a.dueloPose?.tilt||0)*.65;
      corpo.rotation.z=(a.dueloPose?.roll||0)*.65;
      dobrarAncas?.(sentado);apoioDoClipe(dt);return;
    }else{corpo.position.y=balanco-sentado*tam*.37;corpo.rotation.x=sentado*-.15;}
    g.updateWorldMatrix(true,true);
    for(const p of pes){
      const f=(ciclo+p.fase)%1;
      const neutro=g.localToWorld(new THREE.Vector3(p.x,0,p.z));
      if(!p.alvo){p.alvo=neutro.clone();p.apoio=true;}
      // Finaliza o último passo inclusive ao frear antes de uma esquina.
      if(p.apoio&&pes.some(outro=>outro!==p&&outro.apoio)&&((avanco>.00001&&f>.55&&p.ultimoCiclo!==Math.floor(ciclo+p.fase))||p.alvo.distanceTo(neutro)>passo*.54)){
        p.ultimoCiclo=Math.floor(ciclo+p.fase);p.apoio=false;p.inicio=p.alvo.clone();p.progresso=0;
        p.fim=g.localToWorld(new THREE.Vector3(p.x,0,p.z+passo*.22*Math.min(1,a.vel/.45)));
      }
      if(!p.apoio){p.progresso+=Math.max(dt*2.8,avanco/(passo*.45));const u=Math.min(1,p.progresso),s=u*u*(3-2*u);
        p.alvo.copy(p.inicio).lerp(p.fim,s);p.alvo.y=nav.piso(p.alvo.x,p.alvo.z)+Math.sin(u*Math.PI)*passo*(corre?.25:.18);
        if(u>=1){p.apoio=true;p.pouso=ciclo;p.alvo.y=nav.piso(p.alvo.x,p.alvo.z);}
      }else p.alvo.y=nav.piso(p.alvo.x,p.alvo.z);
      p.posicionar(g.worldToLocal(p.alvo.clone()),sentado,balanco);
    }
  }
  return {pes,atualizar,corpo,sombra,soltar(){
    if(pele){pes.forEach(p=>p.restaurar());restaurarAncas?.();corpo.position.y=0;corpo.rotation.set(0,0,0);}
  }};
}
criarPassada.cima=new THREE.Vector3(0,1,0);