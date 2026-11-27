/* O caderno é do visitante. Ações do mundo continuam sob as regras da simulação. */
window.criarTrilha = function criarTrilha({ abrirBusca, somLigado, primeiroPasso }) {
  const painel = document.querySelector("#trilha");
  const titulo = painel.querySelector("h2");
  const dica = painel.querySelector("p");
  const selos = painel.querySelector(".selos");
  const botao = document.querySelector("#iniciarTrilha");
  const aviso = document.querySelector("#retornoAcao");
  const chave = "vila.trilha.v1";
  let etapa = -1;
  let ajudados = new Set();
  let salvavel = true;
  try {
    const salvo = JSON.parse(localStorage.getItem(chave));
    if (salvo && Number.isInteger(salvo.etapa) && salvo.etapa >= -1 && salvo.etapa <= 3) {
      etapa = salvo.etapa;
      ajudados = new Set(Array.isArray(salvo.ajudados) ? salvo.ajudados.filter(id => typeof id === "string").slice(0, 2) : []);
    }
  } catch {}
  function salvar() {
    try { localStorage.setItem(chave, JSON.stringify({ etapa, ajudados: [...ajudados] })); }
    catch { salvavel = false; }
  }
  const medalhas = ["Visitante", "Amigo da vila", "Guardião da vila"];
  function atualizar() {
    const instrucoes = [
      ["Um comentário virou tesouro", "Veja como um pedido no Instagram mudou o mapa da vila.", "Ver no mapa"],
      ["Conheça um morador", "Escolha alguém pela busca, pela lista ou tocando no mapa.", "Escolher morador"],
      ["Entregue um presente", "Na ficha de um morador, toque em Presentear para ganhar o segundo selo.", "Ver ficha"],
      ["Organize um mutirão", "Dê uma tarefa curta a dois moradores diferentes. Ajudados: " + ajudados.size + " de 2.", "Escolher morador"],
      ["Guardião da vila", "Você conquistou os três selos. Continue explorando o mapa e os moradores.", ""]
    ][etapa + 1];
    titulo.textContent = instrucoes[0];
    dica.textContent = instrucoes[1] + (salvavel ? "" : " O navegador só guardará este progresso durante a sessão.");
    botao.hidden = !instrucoes[2];
    botao.textContent = instrucoes[2];
    selos.textContent = Math.max(0, etapa) + "/3 selos";
    selos.title = medalhas.slice(0, Math.max(0, etapa)).join(" · ");
    painel.style.setProperty("--progresso", Math.max(0, etapa) / 3 * 100 + "%");
    painel.hidden = false;
    painel.classList.toggle("primeira-visita", etapa === -1);
  }
  let audio;
  function tocar() {
    if (!somLigado()) return;
    try {
      audio ??= new AudioContext();
      audio.resume().catch(() => {});
      const inicio = audio.currentTime;
      for (const [i, hz] of [523.25, 659.25].entries()) {
        const osc = audio.createOscillator(), vol = audio.createGain(), t = inicio + i * 0.085;
        osc.frequency.value = hz;
        vol.gain.setValueAtTime(0.055, t);
        vol.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
        osc.connect(vol).connect(audio.destination);
        osc.start(t);
        osc.stop(t + 0.18);
      }
    } catch {}
  }
  function mostrar(texto) {
    aviso.textContent = texto;
    const retorno = document.querySelector("#retornoTrilha");
    retorno.textContent = texto;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      selos.animate([{transform:"scale(1.12)"},{transform:"scale(1)"}], {duration:230});
  }
  function registrar(tipo, id) {
    if (!id) return;
    const anterior = etapa;
    if (etapa === 0 && tipo === "visita") etapa = 1;
    else if (etapa === 1 && tipo === "presente") etapa = 2;
    else if (etapa === 2 && tipo === "tarefa") {
      if (ajudados.has(id)) return mostrar("Este morador já recebeu a tarefa. Escolha outro para o mutirão.");
      ajudados.add(id);
      if (ajudados.size === 2) etapa = 3;
    } else {
      if (tipo === "presente" || tipo === "tarefa") {
        mostrar(tipo === "presente" ? "Presente entregue." : "Tarefa curta entregue.");
        tocar();
      }
      return;
    }
    salvar();
    atualizar();
    mostrar(etapa !== anterior ? "Selo conquistado · " + medalhas[etapa - 1] : "Primeira tarefa entregue. Escolha mais um morador.");
    tocar();
  }
  botao.addEventListener("click", () => {
    if (etapa === -1) { primeiroPasso(); return; }
    if (etapa === 1 && !document.querySelector("#meuBox").hidden) {
      document.querySelector("#presentearMorador").focus();
      document.querySelector("#meuBox").scrollIntoView({block:"center"});
    } else abrirBusca();
  });
  document.querySelector("#seguirTutorial").addEventListener("click", () => {
    if (etapa === -1) { etapa = 0; salvar(); atualizar(); }
    painel.scrollIntoView({block:"center"});
    if (!botao.hidden) botao.focus({preventScroll:true});
  });
  atualizar();
  return registrar;
};
