/* A lista é histórica. Só mudanças observadas depois da primeira leitura geram avisos. */
window.criarComunidade = function ({ideia, ideias, ler, verBau}) {
  const el = id => document.getElementById(id);
  const painel = el("painelPedidos");
  const guia = el("guiaPedido");
  const fila = [];
  let exibindo = false, lendo = false, vistos = null, ultimoBau = null;
  function proximo() {
    const texto = fila.shift();
    el("avisoComunidade").textContent = texto || "";
    exibindo = Boolean(texto);
    if (texto) setTimeout(proximo, 5200);
  }
  function avisar(texto) {
    fila.push(texto);
    if (!exibindo) proximo();
  }
  function mostrar() {
    guia.hidden = false;
    el("guiaAutor").textContent = ideia.autor + " comentou “" + ideia.ideia + "”";
    el("guiaEfeito").textContent = verBau();
    guia.scrollIntoView({block:"start"});
    el("seguirTutorial").focus({preventScroll:true});
    avisar("Ideia de " + ideia.autor + " · Um baú com tesouro aparece na vila todos os dias.");
  }
  function bau(b, aberto) {
    const anterior = ultimoBau;
    ultimoBau = {dia:b.dia, aberto};
    if (!anterior) return;
    if (anterior.dia !== b.dia || anterior.aberto !== aberto) {
      const mudou = aberto ? b.quem.nome + " encontrou " + b.item : "Surgiu o baú de hoje em " + b.lugar;
      avisar(mudou + " · Ideia de " + b.ideia.autor);
    }
  }
  function efeito(p, comandos, enquetes) {
    const post = String(p.post || "").split("/").filter(Boolean).pop();
    if (p.tipo === "comando" && p.status === "anotado") {
      const ordem = comandos.find(c => c.post === post && c.arroba === p.usuario && c.hora === p.em && c.lugar === p.lugar && c.tipo === "ir");
      if (ordem) return "Expedição registrada para " + ordem.lugarNome + (ordem.pista ? ". Encontrou uma pista." : ".");
    }
    if (p.tipo === "pedido_enquete") {
      const votacao = enquetes.find(e => e.post === post && e.fechou && e.porUsuario?.[p.usuario] && e.vencedora);
      if (votacao) return "Voto contado em “" + votacao.pergunta + "” · Venceu " + votacao.vencedora + ".";
    }
    if (p.tipo === "profissao" && ["aplicado","aplicado_ao_seguir"].includes(p.status) && p.profissao) {
      return "Ofício assumido na vila: " + (p.profissao === "cacador" ? "caçador" : p.profissao) + ".";
    }
    if (p.tipo === "ideia") {
      const feita = ideias.find(i => i.autor === p.usuario && i.ideia === p.comentario);
      if (feita) return feita.virou;
    }
    return "";
  }
  async function atualizarPedidos() {
    const resposta = await ler("pedidos.json");
    if (!resposta.ok) throw Error();
    const dados = await resposta.json();
    if (!Array.isArray(dados.pedidos)) throw Error();
    async function lerLista(arquivo, campo) {
      try {
        const r = await ler(arquivo), d = await r.json();
        return Array.isArray(d[campo]) ? d[campo] : [];
      } catch { return []; }
    }
    const [comandos,enquetes] = await Promise.all([lerLista("comandos.json","comandos"),lerLista("enquetes.json","enquetes")]);
    const porId = new Map();
    for (const p of dados.pedidos) {
      if (!p?.usuario || !p.comentario || !p.id) continue;
      const resultado = efeito(p, comandos, enquetes);
      if (!resultado) continue;
      const id = String(p.idComentarioCerto || p.id).replace(/^api:/,"");
      porId.set(id, {id,p,resultado});
    }
    const registros = [...porId.values()].sort((a,b) => String(b.p.em).localeCompare(String(a.p.em)));
    if (vistos) {
      for (const {id,p,resultado} of [...registros].reverse()) {
        if (!vistos.has(id)) avisar("Pedido de " + p.usuario + " · " + resultado);
      }
    }
    vistos ??= new Set();
    for (const {id} of registros) vistos.add(id);
    const lista = el("listaPedidos");
    lista.replaceChildren();
    for (const {p,resultado} of registros.slice(0,6)) {
      const li = document.createElement("li");
      for (const [tag,texto] of [["b",p.usuario],["q",p.comentario],["span",resultado]]) {
        const node = document.createElement(tag); node.textContent = texto; li.append(node);
      }
      lista.append(li);
    }
    const data = String(dados.atualizadoEm || "").slice(0,10).split("-").reverse().join("/");
    el("dataPedidos").textContent = registros.length ? "Pedidos atendidos" + (data ? " · Registro de " + data : "") : "Ainda não há pedidos atendidos neste registro.";
  }
  async function atualizarLink() {
    const resposta = await fetch("ultima-postagem.json",{cache:"no-store"});
    if (!resposta.ok) return;
    const {link} = await resposta.json();
    if (!/^https:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(?:p|reel)\/[\w-]+\/?$/.test(link)) return;
    const botao = el("comentar");
    botao.href = link; botao.hidden = false;
    botao.setAttribute("aria-label","Comentar na postagem da Vila Aurora no Instagram (abre em nova aba)");
  }
  async function atualizar() {
    if (lendo || document.hidden) return;
    lendo = true;
    const [pedidos] = await Promise.allSettled([atualizarPedidos(), atualizarLink()]);
    if (pedidos.status === "rejected" && !vistos) {
      el("dataPedidos").textContent = "Fonte indisponível · Exemplo real do jogo";
      el("listaPedidos").textContent = ideia.autor + " pediu “" + ideia.ideia + "” e o baú diário entrou no mapa.";
    }
    lendo = false;
  }
  el("autorExemplo").textContent = ideia.autor;
  el("textoExemplo").textContent = ideia.ideia;
  for (const bloco of [el("entradaComunidade"),painel,el("atalhosComunidade")]) bloco.hidden=false;
  el("verPedido").addEventListener("click",mostrar);
  el("verPedido").disabled = false;
  el("seguirTutorial").addEventListener("click",() => { guia.hidden = true; });
  painel.addEventListener("toggle",event => {
    if (event.newState === "open") painel.focus({preventScroll:true});
  });
  atualizar();
  setInterval(atualizar,30000);
  document.addEventListener("visibilitychange",atualizar);
  return {mostrar,bau};
};

