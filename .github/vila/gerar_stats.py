# -*- coding: utf-8 -*-
"""
Contadores da Vila Aurora -> site/stats.json e repo/stats.json (a página pode mostrar depois).
Nº de moradores, novos do dia (últimas 24 h reais), nível mais alto, maiores afinidades e desafetos, montarias, eventos do dia.
Uso: python gerar_stats.py            (lê site/moradores.json, grava os dois stats.json)
     python gerar_stats.py --mostrar  (só imprime)
Chamado também pelo robô de seguidores ao fim de cada rodada.
"""
import os, io, json, sys, time, datetime
BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
sys.path.insert(0, BASE)
import vila_sim as S

def gerar(now_ms=None):
    now = int(time.time() * 1000) if now_ms is None else now_ms
    ms = S.carregar_moradores(os.path.join(RAIZ, "site", "moradores.json"))
    brutos = json.load(io.open(os.path.join(RAIZ, "site", "moradores.json"), encoding="utf-8")).get("moradores", [])
    discretos = {m["nome"] for m in brutos if m.get("discreto")}
    brutos_pub = [m for m in brutos if not m.get("discreto")]          # o que aparece em destaque público
    trouxe = sorted([{"nome": m["nome"], "moradores": len(m.get("convidou", [])), "quem": m.get("convidou", [])} for m in brutos_pub if m.get("convidou")],
                    key=lambda t: (-t["moradores"], t["nome"]))[:5]
    fundadores = [{"nome": m["nome"], "vila": m.get("vilaFundada")} for m in brutos if m.get("fundadorVila")]
    convidados = len([m for m in brutos if m.get("convidadoPor")])
    combate = {}
    if "--sem-combate" not in sys.argv:
        try:
            from stats_pagina import combate_de_todos
            combate = combate_de_todos([m["nome"] for m in ms])
        except Exception as ex:
            combate = {"erro": str(ex)[:120]}
    w = S.mundo(now)
    xps = {m["id"]: dict(S.xp_de(m, now)) for m in ms}
    for m in ms:                                   # a página manda no nível (luta por dano desde a v27)
        n = (combate.get(m["nome"]) or {}).get("nivel") if isinstance(combate, dict) else None
        if isinstance(n, int): xps[m["id"]]["nivel"] = n
    lacos = {m["id"]: S.lacos_de(m, ms, now) for m in ms}
    pares_amigos, pares_desafetos = {}, {}
    for m in ms:
        for a in lacos[m["id"]]["amigos"]:
            k = tuple(sorted([m["nome"], a["nome"]])); pares_amigos[k] = pares_amigos.get(k, 0) + 1
        for d in lacos[m["id"]]["desafetos"]:
            k = tuple(sorted([m["nome"], d["nome"]])); pares_desafetos[k] = pares_desafetos.get(k, 0) + 1
    def top(pares, n=5):
        return [{"entre": list(k), "forca": v} for k, v in sorted(pares.items(), key=lambda kv: (-kv[1], kv[0]))[:n]]
    novos = [m["nome"] for m in ms if now - m["joinedAt"] <= 24 * 3600 * 1000]
    nivel_max = max(xps.values(), key=lambda x: x["nivel"])["nivel"] if xps else 1
    mais_altos = sorted([(m["nome"], xps[m["id"]]["nivel"], xps[m["id"]]["xp"], xps[m["id"]]["titulo"]) for m in ms], key=lambda t: (-t[1], -t[2]))[:5]
    eventos_dia = []
    for m in ms:
        for e in S.eventos_de(m, now)["lista"]:
            if now - e["ts"] <= 24 * 3600 * 1000 and e["ts"] <= now:
                eventos_dia.append({"quando": e["ts"], "quem": m["nome"], "tipo": e.get("tipo"), "texto": e["texto"]})
    eventos_dia.sort(key=lambda e: -e["quando"])
    por_prof = {}
    for m in ms: por_prof[m["profissao"]] = por_prof.get(m["profissao"], 0) + 1
    return {
        "geradoEm": datetime.datetime.now().isoformat(timespec="minutes"),
        "relogioVila": {"dia": w["dia"], "hora": w["hora"]},
        "moradores": len(ms),
        "novosDoDia": [n for n in novos if n not in discretos],
        "nivelMaisAlto": nivel_max,
        "maisAltos": [{"nome": n, "nivel": nv, "xp": xp, "titulo": t} for n, nv, xp, t in mais_altos if n not in discretos],
        "maioresAfinidades": top(pares_amigos),
        "maioresDesafetos": top(pares_desafetos),
        "montados": [m["nome"] for m in ms if xps[m["id"]]["montaria"]],
        "porProfissao": dict(sorted(por_prof.items(), key=lambda kv: -kv[1])),
        "vilas": S.n_vilas(ms, now),
        "ultimoMorador": ({"nome": ult["nome"], "nomeCompleto": (ult.get("nomeCompleto") or "").split("|")[0].strip(), "profissao": ult.get("profissao"), "sexo": ult.get("sexo"),
                           "chegouEm": datetime.datetime.fromtimestamp(ult["joinedAt"] / 1000).isoformat(timespec="minutes"), "chegouEmMs": ult["joinedAt"]} if (ult := max(brutos_pub, key=lambda m: m.get("joinedAt", 0), default=None)) else None),
        "quemMaisTrouxe": trouxe,
        "moradoresPorConvite": convidados,
        "fundadores": fundadores,
        "combate": combate,
        "eventosUltimas24h": eventos_dia[:30],
    }

if __name__ == "__main__":
    st = gerar()
    if "--mostrar" in sys.argv:
        print(json.dumps(st, ensure_ascii=False, indent=1)); sys.exit(0)
    for pasta in ("site", "repo"):
        json.dump(st, io.open(os.path.join(RAIZ, pasta, "stats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if "--sem-combate" not in sys.argv:
        try:
            import gerar_agenda_invasoes; gerar_agenda_invasoes.gerar()
        except Exception as ex: print("agenda de invasões: erro", str(ex)[:100])
    print("stats.json gravado: %d moradores, %d novos, nível máx %d" % (st["moradores"], len(st["novosDoDia"]), st["nivelMaisAlto"]))
