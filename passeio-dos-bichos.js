function criarPasseioDosBichos(nav,rnd) {
  let seq=0;
  const especies={
    javali:[.94,1.32],lobo:[.91,1.63],galinha:[.36,.76],goblin:[.48,1.22],aranha:[.99,1.09],
    gigante:[1.65,1.25],filhote:[.84,1.02],esqueleto:[.47,1.11],ovelha:[.68,.94],fantasma:[.55,.93]
  };
  function adicionar(g,V,tipo,local,op={}){
    const [r,ritmo]=especies[tipo]||[.60,1.20],id=seq++;
    const a={id,g,V,tipo,r,ritmo,local,rand:rnd("passos"+id),vel:0,yaw:0,espera:id%5*.16,
      modo:"parado",trilha:[],turno:0,bloqueio:0,rotaExterna:!!op.externa,sombrio:!!op.sombrio,invasaoVi:op.invasaoVi};
    const livre=!nav.proibida(local.x,local.z,r+.04,a)&&!nav.perto(local.x,local.z,r,a,.06);
    const p=livre?local:nav.ponto(a,local.x,local.z,true);
    if(!p)return null;
    a.x=p.x;a.z=p.z;g.position.set(a.x,nav.piso(a.x,a.z),a.z);g.rotation.y=0;
    if(tipo!=="fantasma"&&!op.semRig)a.rig=criarPassada(g,tipo,nav);
    a.velMax=ritmo;g.userData.caminhante=a;nav.atores.add(a);return a;
  }
  function ir(a,x,z,correr=false,trafego=true){
    a.meta={x,z};a.trilha=nav.rota(a,x,z,trafego);if(trafego&&!a.trilha.length)a.trilha=nav.rota(a,x,z,false);a.velMax=a.ritmo*(correr?2.4:1);a.espera=0;return a.trilha.length>0;
  }
  function escolher(a){
    const {V,rand}=a;let ponto;
    if(a.tipo==="javali"&&a.turno%4===1&&V.i===0)ponto={x:V.cx-32,z:V.cz+8};
    else if(a.tipo==="lobo"&&V.i===0&&a.turno%4===1)ponto={x:53,z:0};
    else if(a.tipo==="galinha"&&a.turno%5===3&&V.portasBichos?.length){
      const ps=V.portasBichos;ponto=ps.reduce((p,q)=>Math.hypot(q.x-a.x,q.z-a.z)<Math.hypot(p.x-a.x,p.z-a.z)?q:p);
    }else{const raio=a.tipo==="ovelha"?3.5:a.tipo==="galinha"?6:10;
      ponto={x:a.local.x+(rand()-.5)*2*raio,z:a.local.z+(rand()-.5)*2*raio};}
    a.turno++;if(!ir(a,ponto.x,ponto.z,a.turno%4===0))a.espera=1+rand()*2;
  }
  function avancar(a,dt){
    let dist=0,giro=0;
    if(a.dueloSombrio||a.derrotadoAte){
      a.vel=0; a.modo="parado";
      a.rig?.atualizar(a,dt,0,0);
      if(a.tipo==="fantasma")a.g.userData.play?.(a.golpe||"Flying_Idle");
      return;
    }
    if(!a.trilha.length){
      a.espera-=dt;if(a.espera<=0&&!a.rotaExterna)escolher(a);
    }
    if(a.trilha.length){
      const p=a.trilha[0],dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);
      const delta=d>.0001?Math.atan2(Math.sin(Math.atan2(dx,dz)-a.yaw),Math.cos(Math.atan2(dx,dz)-a.yaw)):0;
      giro=Math.sign(delta)*Math.min(Math.abs(delta),dt*3.8);a.yaw+=giro;
      const acel=3.5,alvo=Math.min(a.velMax,Math.sqrt(2*acel*d))*Math.max(0,Math.cos(delta));
      a.vel+=Math.sign(alvo-a.vel)*Math.min(Math.abs(alvo-a.vel),acel*dt);
      const passo=Math.min(d,a.vel*dt);
      const x=a.x+(d?dx/d:0)*passo,z=a.z+(d?dz/d:0)*passo;
      if(nav.segmento(a,a.x,a.z,x,z,true)){
        a.x=x;a.z=z;dist=passo;a.bloqueio=0;
        if(d-passo<.001){a.trilha.shift();if(!a.trilha.length){a.espera=1.6+2.8*a.rand();a.vel=0;}}
      }else{a.vel=Math.max(0,a.vel-acel*dt);a.bloqueio+=dt;
        if(a.bloqueio>.24+(a.id%4)*.075){a.bloqueio=0;a.trilha=nav.rota(a,a.meta.x,a.meta.z,true);if(!a.trilha.length)a.espera=.45+a.rand();}}
    }else {a.vel=0;if(a.face!=null){const d=Math.atan2(Math.sin(a.face-a.yaw),Math.cos(a.face-a.yaw));giro=Math.sign(d)*Math.min(dt*3.8,Math.abs(d));a.yaw+=giro;}}
    a.modo=dist>.00001?(a.vel>a.ritmo*1.34?"correndo":"andando"):a.trilha.length?"parado":a.turno%3===2?"sentado":"parado";
    a.g.position.set(a.x,nav.piso(a.x,a.z),a.z);a.g.rotation.y=a.yaw;
    a.rig?.atualizar(a,dt,dist,giro);
    if(a.tipo==="fantasma"){a.g.position.y+=.48+.12*Math.sin(a.id+a.x);a.g.userData.play?.("Flying_Idle");}
  }
  function habitat(V,t,f){
    const L=V.L;
    if(t==="ovelha")return {x:L.campo.x+(f-2)*.82,z:L.campo.z};
    if(t==="galinha"||t==="lobo")return {x:L.campo.x+(t==="lobo"?-10:9),z:L.campo.z+f*.45};
    return {x:L.floresta.x+3,z:L.floresta.z+3+f*.8};
  }
  function passo(g,V,t,dt){
    const a=g.userData.caminhante||adicionar(g,V,t,habitat(V,t,g.userData.fase||0));if(a)avancar(a,dt);
  }
  function seguir(g,V,tipo,inicio,destino,dt,op={}){
    const a=g.userData.caminhante||adicionar(g,V,tipo,inicio,{externa:true,semRig:op.semRig,sombrio:op.sombrio,invasaoVi:op.invasaoVi});if(!a)return;
    if(a.dueloSombrio||a.derrotadoAte){avancar(a,dt);return a;}
    a.proximaBusca=(a.proximaBusca||0)-dt;
    const d=Math.hypot(a.x-destino.x,a.z-destino.z);
    if(a.proximaBusca<=0&&d>(op.folga||.45)&&(!a.trilha.length||Math.hypot(a.meta.x-destino.x,a.meta.z-destino.z)>1.4)){
      ir(a,destino.x,destino.z,d>8);a.proximaBusca=1.5+a.rand();}
    a.face=op.face;a.golpe=d<2?op.golpe:null;avancar(a,dt);return a;
  }
  function retirar(g){nav.atores.delete(g.userData.caminhante);}
  return {adicionar,avancar,ir,passo,seguir,retirar};
}