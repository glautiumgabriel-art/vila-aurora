/* Traçados da Vila Aurora. O mesmo eixo alimenta a malha e a navegação. */
function criarRuasAurora(opcao, paisagem, nav) {
  const linha = (w, pontos) => ({w, pontos: pontos.map(([x,z]) => new THREE.Vector3(x,0,z))});
  const traçados = [
    [
      linha(4.9, [[-42,0],[-33,0],[0,0],[34,0],[51,0]]),
      linha(2.9, [[0,-43],[0,-38],[-.5,-32],[-2,-27],[-7,-23],[-14,-18],[-14,0],[-14,7],[-14,15],[-16,23]]),
      linha(2.9, [[17,-23],[15,-17],[14,-6],[14,0],[14,9],[14,17],[13,24],[8,28],[1,32],[0,38],[0,43]]),
    ],
    [
      linha(3.5, Array.from({length:49},(_,i) => {
        const a = i/48*Math.PI*2;
        return [Math.cos(a)*8.55,Math.sin(a)*8.55];
      })),
      // Conselho de 28/11 (GPT e Gemini): os raios entram até a borda da praça (raio 5.8) e ganham curva leve.
      linha(3.9, [[-5.3,0],[-8.25,0],[-18,.7],[-29,-.6],[-38,0],[-42,0]]),
      linha(3.9, [[5.3,0],[8.25,0],[19,-.7],[30,.6],[40,0],[51,0]]),
      linha(3.9, [[0,-5.3],[0,-8.25],[.8,-18],[-.7,-29],[0,-39],[0,-43]]),
      linha(3.9, [[0,5.3],[0,8.25],[-.8,18],[.7,29],[0,39],[0,43]]),
    ],
    [
      linha(3.1, [[-42,0],[-34,0],[-29,-2.3],[-21,-1.6],[-15,1.1],[-8,1.7],[-4,.15]]),
      linha(3.3, [[4,0],[10,1.4],[15,.6],[22,-.8],[29,-1.2],[35,-.75],[39.5,0],[51,0]]),
      linha(2.8, [[0,-43],[0,-39.5],[.4,-32],[-3.1,-26],[-2.7,-19],[-.2,-13],[1.8,-8],[.9,-4]]),
      linha(2.7, [[.6,4],[1.6,8],[-.9,13],[-2.8,19],[-2.3,25],[1.3,31],[.5,36],[0,39.5],[0,43]]),
      linha(1.6, [[-23,-1],[-20,-5],[-16,-7],[-13,-5.7],[-8,1.7]]),
      linha(1.6, [[15,.6],[15.1,5],[16.3,9],[15.5,14],[12.3,17.8],[7.2,19.8],[2,21],[-2.8,19]]),
    ],
  ][opcao-1];
  const principais = [];
  let acessos;

  function amostra({w,pontos}, i) {
    const fechado = pontos[0].distanceTo(pontos.at(-1)) < .01;
    const caminho = new THREE.CatmullRomCurve3(fechado?pontos.slice(0,-1):pontos,fechado,"centripetal");
    const n = Math.ceil(caminho.getLength()/.60);
    return caminho.getSpacedPoints(n).map(({x,z},j) => {
      const f = opcao===3 ? 1+.19*Math.sin(j*.23+i)+.13*Math.sin(j*.53-i) : 1+.085*Math.sin(j*.54)+.04*Math.sin(j*.21+i);
      const largura = fechado && j===n ? w : w*f;
      return {x,z,r:largura/2};
    });
  }

  function construir(grupo) {
    for (const [i,trajeto] of traçados.entries()) {
      const pontos = amostra(trajeto,i);
      const fechado = Math.hypot(pontos[0].x-pontos.at(-1).x,pontos[0].z-pontos.at(-1).z)<.01;
      paisagem.trilhaLivre(pontos,grupo,{fechado});
      principais.push(...pontos);
    }
  }

  function ligarPortas(V, casas, grupo) {
    if (acessos) {
      for (const malha of [...acessos.children]) { malha.geometry.dispose(); acessos.remove(malha); }
      nav.limparTrilhas("soleiras");
    } else {
      acessos = new THREE.Group();
      grupo.add(acessos);
    }
    const prova = [];
    for (const casa of casas) {
      const porta = {x:casa.x,z:casa.z+1.63};
      const pe = {x:casa.x,z:casa.z+2.08,r:.32};
      const candidatos = principais.map(p=>({p,d:Math.hypot(pe.x-p.x,pe.z-p.z)})).sort((a,b)=>a.d-b.d);
      let trilha = [];
      for (const {p} of candidatos.slice(0,24)) {
        if (nav.proibida(p.x,p.z,pe.r)) continue;
        const rota = nav.rota(pe,p.x,p.z,false,false);
        if (!rota.length || Math.hypot(rota.at(-1).x-p.x,rota.at(-1).z-p.z)>.05) continue;
        trilha = [porta,pe,...rota];
        break;
      }
      if (trilha.length) {
        const pontos = [];
        for (let i=1;i<trilha.length;i++) {
          const a=trilha[i-1], b=trilha[i], n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.38));
          if (!pontos.length) pontos.push({...a,r:.52});
          for (let j=1;j<=n;j++) pontos.push({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n,r:.53+.05*Math.sin(i+j)});
        }
        paisagem.trilhaLivre(pontos,acessos,{tipo:"soleiras"});
      }
      prova.push({porta,pontos:trilha.length});
    }
    V.auroraPortas=prova;
  }

  return {construir,ligarPortas};
}

