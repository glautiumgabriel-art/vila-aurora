/* Percursos de moradores no navegador do mapa, independentes da câmera. */
function criarRotinaDosMoradores(nav,vila,nVilas,casaDe,lugarDe,rotaEntreVilas) {
  const moradores=new Map(), reservas=new Map(), postos=new Map();
  const etapas=["casa","trabalho","exploracao","exploracao","visita"];
  const intervalo=0.1, velocidade=3.35, espaco=1.2, passo=5.7;
  let ticks=null, ultimo=0, proximo=0, cadastro=null, horarios=new Map();

  function grade(V){
    let pontos=postos.get(V.i);
    if(!pontos){
      pontos=[];
      for(let i=-10;i<=10;i++)for(let j=-10;j<=10;j++){
        const x=V.cx+i*passo,z=V.cz+j*passo;
        pontos.push({x,z,raio:Math.hypot(x-V.cx,z-V.cz)});
      }
      postos.set(V.i,pontos);
    }
    return pontos;
  }
  function distancia(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
  function posicaoValida(a,p){
    return !nav.proibida(p.x,p.z,a.r+.025)&&![...reservas.values()].some(v=>v.a!==a&&Math.abs(p.x-v.x)<passo&&Math.abs(p.z-v.z)<passo&&distancia(p,v)<passo-.05);
  }
  function opcoes(a,V,k,indice){
    if(k==="casa")return [{x:a.casa.x,z:a.casa.z+2.4,chave:"casa:"+a.id,raio:0}];
    if(k==="exploracao"){
      const ang=a.rumo+indice*.67, raio=indice===2?31:45;
      return [{x:V.cx+raio*Math.cos(ang),z:V.cz+raio*Math.sin(ang),raio,chave:"exploracao:"+a.id}];
    }
    const ordem=["praca","campo","floresta","mercado","mina","ferraria","capela","torre","taverna","muralha"];
    const principal=V.L[lugarDe[a.profissao]||"praca"];
    return ordem.filter(nome=>V.L[nome]).map(nome=>{
      const L=V.L[nome], chave=V.i+":"+nome;
      let ocupacao=0;
      for(const p of reservas.values())if(p.a!==a&&p.chave===chave)ocupacao++;
      return {x:L.x,z:L.z,chave,lugar:L,nome,ocupacao,peso:ocupacao*28+(k==="trabalho"&&L===principal?-65:0)+(k==="visita"?distancia(L,{x:V.cx,z:V.cz})*.35:0)};
    }).filter(p=>p.ocupacao<(p.nome==="praca"?5:3)).sort((a,b)=>a.peso-b.peso);
  }
  function plano(a,V,k,indice,inicio,reservaAmpla=false){
    const pontos=grade(V);
    for(const op of opcoes(a,V,k,indice)){
      const candidatos=pontos.filter(p=>k==="exploracao"?p.raio>27&&p.raio<(reservaAmpla?55:op.raio+7):k==="visita"?p.raio<30:p.raio<38)
        .map(p=>({p,nota:(p.x-op.x)**2+(p.z-op.z)**2}))
        .sort((a,b)=>a.nota-b.nota);
      const max=reservaAmpla?Infinity:k==="exploracao"?90:k==="casa"?260:34;
      for(const {p,nota} of candidatos){
        if(nota>max||!posicaoValida(a,p))continue;
        const destino={x:p.x,z:p.z,lugar:op.lugar,V,k,a,chave:op.chave};
        if(inicio){
          if([...moradores.values()].some(b=>b!==a&&b.destino&&distancia(b,p)<espaco))continue;
          return {destino,trilha:[]};
        }
        const de=Array.from({length:nVilas()},(_,i)=>vila(i)).reduce((mais,P)=>
          Math.hypot(P.cx-a.x,P.cz-a.z)<Math.hypot(mais.cx-a.x,mais.cz-a.z)?P:mais,V);
        const marcos=de!==V?rotaEntreVilas(de,V).pts.slice(1,-1):[];
        function seguir(alvos){
          const pos={...a}, trilha=[];
          for(const alvo of alvos){
            if(distancia(pos,alvo)<.02)continue;
            const trecho=nav.rota(pos,alvo.x,alvo.z,false,true);
            if(!trecho.length)return null;
            trilha.push(...trecho);Object.assign(pos,trecho.at(-1));
          }
          return distancia(pos,destino)<.1?trilha:null;
        }
        const trilha=seguir([...marcos,destino])??seguir([destino]);
        if(trilha)return {destino,trilha};
      }
    }
    return null;
  }
  function escolher(a,indice,inicio=false){
    let k=etapas[indice], V=a.V;
    if(k==="visita"){
      const vizinhas=Array.from({length:nVilas()},(_,i)=>vila(i)).filter(v=>v!==V)
        .sort((x,y)=>Math.hypot(x.cx-V.cx,x.cz-V.cz)-Math.hypot(y.cx-V.cx,y.cz-V.cz));
      if(vizinhas.length)V=vizinhas[a.ordem%Math.min(2,vizinhas.length)];else k="exploracao";
    }
    let escolha=plano(a,V,k,indice,inicio);
    escolha??=plano(a,a.V,"exploracao",indice===2?2:3,inicio,inicio);
    if(!escolha)return false;
    Object.assign(a,escolha,{indice});
    reservas.set(a.id,a.destino);
    if(inicio){a.x=a.destino.x;a.z=a.destino.z;a.anteriorX=a.x;a.anteriorZ=a.z;}
    return true;
  }
  function configurar(lista){
    if(cadastro===lista)return;
    cadastro=lista;
    const atuais=new Set(), grupos=new Map();
    lista.forEach((m,i)=>{
      const casa=casaDe(i), V=casa.vila; atuais.add(m.id);
      if(!grupos.has(V.i))grupos.set(V.i,[]);
      const grupo=grupos.get(V.i);
      let a=moradores.get(m.id);
      if(!a||a.V!==V){
        reservas.delete(m.id);
        a={id:m.id,V,casa,profissao:m.profissao,r:.36,rumo:grupo.length*2.399963,
          ordem:grupo.length,ang:0,trilha:[],andando:false,rever:0};
        moradores.set(m.id,a);
      }
      grupo.push(a);
    });
    for(const id of moradores.keys())if(!atuais.has(id)){moradores.delete(id);reservas.delete(id);}
    horarios=new Map();
    for(const grupo of grupos.values())grupo.forEach((a,i)=>horarios.set(a.id,i*600/grupo.length));
  }
  function concentraria(x,z,vizinhos){
    const raio2=16.000001;
    if(vizinhos.length<6)return false;
    const aqui={x,z}, pontos=[aqui,...vizinhos];
    function cheio(cx,cz){
      if((cx-x)**2+(cz-z)**2>raio2)return false;
      let n=1;
      for(const p of vizinhos)if((p.x-cx)**2+(p.z-cz)**2<=raio2&&++n>6)return true;
      return false;
    }
    if(cheio(x,z))return true;
    for(let i=0;i<pontos.length;i++)for(let j=i+1;j<pontos.length;j++){
      const a=pontos[i],b=pontos[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
      if(d===0||d>8)continue;
      const h=Math.sqrt(Math.max(0,16-d*d/4)),cx=(a.x+b.x)*.5,cz=(a.z+b.z)*.5;
      if(cheio(cx-h*dz/d,cz+h*dx/d)||cheio(cx+h*dz/d,cz-h*dx/d))return true;
    }
    return false;
  }
  function mover(a,dt,t){
    a.anteriorX=a.x;a.anteriorZ=a.z;a.andando=false;
    const alvo=a.trilha[0];
    if(!alvo)return;
    const d=distancia(a,alvo), rumo=d>0?Math.atan2(alvo.x-a.x,alvo.z-a.z):a.ang;
    const avanco=Math.min(d,dt*velocidade);
    const vizinhos=[...moradores.values()].filter(b=>b!==a&&b.destino&&Math.abs(b.x-a.x)<8.4&&Math.abs(b.z-a.z)<8.4);
    const perto=vizinhos.filter(b=>distancia(a,b)<2.8);
    const curvas=a.travado&&t-a.travado>2?[0,.48,-.48,.92,-.92,1.35,-1.35,1.83,-1.83,2.4,-2.4]:[0,.48,-.48,.92,-.92,1.35,-1.35];
    for(const curva of curvas){
      const ang=rumo+curva, x=a.x+Math.sin(ang)*avanco,z=a.z+Math.cos(ang)*avanco;
      if(!nav.segmento(a,a.x,a.z,x,z,false))continue;
      if(perto.some(b=>{
        const atual=distancia(a,b), d=Math.hypot(x-b.x,z-b.z);
        const bx=b.anteriorX??b.x,bz=b.anteriorZ??b.z;
        return d<espaco+.035&&d<atual || Math.hypot(x-bx,z-bz)<espaco&&d<atual;
      }))continue;
      if(concentraria(x,z,vizinhos.filter(b=>Math.hypot(x-b.x,z-b.z)<8)))continue;
      a.x=x;a.z=z;a.ang=ang;a.andando=avanco>0;
      if(curva===0){
        a.travado=0;
        if(d-avanco<.015)a.trilha.shift();
      }else a.travado||=t;
      return;
    }
    a.travado||=t;
    if(t-a.travado>1.7&&t>=(a.desviarEm||0)){
      a.desviarEm=t+2.4+(a.ordem%5)*.32;
      const dOrig=new Map(vizinhos.map(b=>[b,distancia(a,b)]));
      const desvio=(x,z)=>!vizinhos.some(b=>Math.hypot(b.x-x,b.z-z)<Math.min(espaco+.22,dOrig.get(b)-.05));
      const origem={...a,desvio},ref=a.destino;
      const rota=nav.rota(origem,ref.x,ref.z,false,true);
      if(rota.length&&distancia(rota.at(-1),ref)<.1)a.trilha=rota;
    }
  }
  function atualizar(lista,t,emLuta){
    if(ticks==null){
      ticks=t;proximo=t;ultimo=t;
    }
    if(t+1e-5<proximo)return;
    configurar(lista);
    const dt=Math.min(.24,Math.max(0,t-ultimo));
    ultimo=t;proximo=t+intervalo;
    for(const a of moradores.values()){
      const fase=Math.floor(((t-ticks+horarios.get(a.id))%600)/120);
      if(!a.destino){escolher(a,fase,true);continue;}
      if(a.indice!==fase&&t>=a.rever){
        escolher(a,fase);a.rever=t+3.6;
      }
      if(nav.proibida(a.x,a.z,a.r+.025)){
        const p=nav.ponto(a,a.x,a.z,false);
        if(p&&![...moradores.values()].some(b=>b!==a&&b.destino&&distancia(b,p)<espaco)){
          a.x=p.x;a.z=p.z;a.trilha=[];a.indice=-1;a.rever=t;
        }
      }
      if(!emLuta?.has(a.id))mover(a,dt,t);
    }
  }
  function estado(m,e,t){
    const a=moradores.get(m.id);
    if(!a?.destino||e.emEvento)return e;
    const d=a.destino, k=d.k, andando=a.andando||a.trilha.length>0;
    const f=Math.min(1,Math.max(0,(t-ultimo)/intervalo));
    const x=a.anteriorX+(a.x-a.anteriorX)*f,z=a.anteriorZ+(a.z-a.anteriorZ)*f;
    const casa=k==="casa", trabalho=k==="trabalho", visita=k==="visita";
    const descansando=casa&&!andando&&!!e.dentro&&["casa","tenda"].includes(e.dentro.tipo);
    const posto=trabalho&&!andando&&e.chave==="trab"&&e.lugar===d.lugar&&!e.dentro;
    const fora=Math.hypot(x-a.V.cx,z-a.V.cz)>25;
    return {...e,x,z,ang:a.ang,y:nav.piso(x,z),andando:a.andando,
      dentro:descansando?e.dentro:null,lugar:d.lugar||a.casa,visita:visita?d.V:null,
      chave:casa?(descansando?"dorme":"lazer"):trabalho?"trab":k,
      modo:a.andando?"andar":posto&&e.modo!=="andar"?e.modo:"parado",
      explorando:k==="exploracao"||visita||fora,
      social:!descansando&&!m.discreto,
      acao:posto?e.acao:casa?(andando?"voltando para casa":"descansando perto de casa"):
        trabalho?(andando?"indo para o trabalho":"trabalhando em "+d.lugar.nome):
        visita?(andando?"viajando para "+d.V.nome:"visitando "+d.V.nome):
        andando?"explorando os arredores":"observando os arredores"};
  }
  function diagnostico(){
    return [...moradores.values()].filter(a=>a.destino).map(a=>({id:a.id,x:a.x,z:a.z,
      k:a.destino.k,vi:a.destino.V.i,casa:a.V.i,fase:a.indice,restantes:a.trilha.length,
      alvo:a.trilha[0]||null,destino:{x:a.destino.x,z:a.destino.z},andando:a.andando}));
  }
  return {atualizar,estado,diagnostico};
}
