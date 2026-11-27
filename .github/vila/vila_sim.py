# -*- coding: utf-8 -*-
"""
Simulação determinística da Vila Aurora em Python — cópia fiel das funções da página (site/index.html):
hash (FNV-1a), rnd (xorshift), mundo (relógio: 1 min real = 1 h da vila), todos, eventosDe, xpDe, lacosDe, estado (resumido).
Usada pelo gerador de episódio (video/gerar_episodio.py) e pelo gerador de contadores (robo/gerar_stats.py).
Se a página mudar essas funções, a dona do código (conversa MUNDO DOS BONEQUINHOS) avisa e este arquivo acompanha.
Conferência contra a página: python vila_sim.py --conferir   (roda as mesmas funções em Node e compara).
"""
import json, math, os, io, time, re, sys

EPOCH = 1793714880000          # dia 1 começa em 3/11/2026 às 07h da vila
HORA_MS = 60000
# Relógio lido da própria página (04/11: a página vai passar a 1 h da vila = 1 h real de Brasília). Se a página mudar, isto acompanha.
try:
    _html = io.open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "repo", "index.html"), encoding="utf-8").read()   # a versão PUBLICADA manda
    _m = re.search(r"const EPOCH\s*=\s*(\d+)", _html); EPOCH = int(_m.group(1)) if _m else EPOCH
    _m = re.search(r"const HORA_MS\s*=\s*([\d*\s]+);", _html); HORA_MS = int(eval(_m.group(1), {"__builtins__": {}})) if _m and re.fullmatch(r"[\d*\s]+", _m.group(1)) else HORA_MS
except Exception:
    pass
VILAS_NOMES = ["Vila Aurora", "Pinheiral", "Pedra Alta", "Vale das Brumas", "Porto do Rio", "Serra do Sol", "Campo Dourado",
               "Lagoa Azul", "Colina do Vento", "Bosque Velho", "Ponte Nova", "Monte Claro"]
LUGAR_DE = {"pescador": "rio", "lenhador": "floresta", "mineiro": "mina", "ferreiro": "ferraria", "fazendeiro": "campo", "pastor": "campo",
            "soldado": "muralha", "cavaleiro": "muralha", "arqueiro": "muralha", "mago": "torre", "alquimista": "torre", "padeiro": "taverna",
            "cozinheiro": "taverna", "curandeiro": "capela", "comerciante": "mercado", "bardo": "praca", "cacador": "floresta",
            "construtor": "praca", "explorador": "praca"}
LUGAR_NOME = {"praca": "Praça da Fogueira", "taverna": "Taverna", "ferraria": "Ferraria", "capela": "Casa de Cura", "mercado": "Mercado",
              "torre": "Torre do Mago", "campo": "Campo de trigo", "muralha": "Posto de Guarda", "mina": "Mina do Morro",
              "floresta": "Floresta Velha", "rio": "Rio Claro"}
TRABALHO = {"pescador": "jogando a linha no Rio Claro", "lenhador": "cortando árvore na Floresta Velha", "mineiro": "picando rocha na Mina do Morro",
            "ferreiro": "batendo o martelo na bigorna", "fazendeiro": "colhendo trigo no campo", "pastor": "contando as ovelhas",
            "soldado": "montando guarda no portão", "cavaleiro": "patrulhando a paliçada", "arqueiro": "contando as flechas da aljava",
            "mago": "praticando um feitiço de luz na torre", "alquimista": "mexendo o caldeirão na torre", "padeiro": "amassando o pão na taverna",
            "cozinheiro": "mexendo o ensopado na taverna", "curandeiro": "colhendo ervas perto da Casa de Cura", "comerciante": "anunciando as ofertas no mercado",
            "bardo": "cantando a lenda do dragão na praça", "cacador": "mirando num coelho na floresta", "construtor": "pregando tábuas na obra",
            "explorador": "desenhando o mapa na praça"}
CLASSE = {"soldado": (3, "perto"), "cavaleiro": (4, "perto"), "arqueiro": (2, "longe"), "mago": (2, "longe"), "alquimista": (1, "longe"),
          "cacador": (2, "longe"), "lenhador": (2, "perto"), "ferreiro": (2, "perto"), "mineiro": (2, "perto"), "explorador": (1, "perto")}
CRIATURAS = [{"n": "uma galinha fujona", "vida": 1, "drop": "uma pena da sorte"}, {"n": "um javali teimoso", "vida": 3, "drop": "uma presa de javali"},
             {"n": "um goblin da estrada", "vida": 4, "drop": "uma bolsa de moedas"}, {"n": "o Lobo Cinzento", "vida": 6, "drop": "um dente de lobo"},
             {"n": "um cavalo selvagem", "vida": 5, "drop": "", "monta": "cavalo"}, {"n": "um urso da floresta", "vida": 8, "drop": "uma garra de urso"}]
NPCS = [("npc-ema", "Ema", "fazendeiro"), ("npc-tiao", "Tião", "ferreiro"), ("npc-bento", "Velho Bento", "bardo"), ("npc-zefa", "Dona Zefa", "curandeiro"),
        ("npc-rufo", "Capitão Rufo", "cavaleiro"), ("npc-olavo", "Mestre Olavo", "mago"), ("npc-nina", "Nina", "pescador"), ("npc-juca", "Juca", "lenhador"),
        ("npc-bras", "Brás", "mineiro"), ("npc-lia", "Lia", "cozinheiro"), ("npc-abel", "Seu Abel", "comerciante"), ("npc-teo", "Teo", "arqueiro")]
NPCS = [{"id": i, "nome": n, "profissao": p, "joinedAt": EPOCH - 30 * 24 * HORA_MS, "npc": True, "fundador": True,
         "sexo": "f" if n in ("Ema", "Dona Zefa", "Nina", "Lia") else "m"} for i, n, p in NPCS]

# ---- VILA_CAP = CASAS.length (mesma conta da página) ----
_LUG_REL = {"praca": (0, 0, 9, 9), "taverna": (-10.5, -10.5, 5, 4.5), "ferraria": (10.5, -10.5, 5, 4.5), "capela": (-10.5, 10.5, 5, 5),
            "mercado": (10.5, 10.5, 5, 4), "torre": (17.5, 3.5, 4, 4), "campo": (-21, 10.5, 12, 5), "muralha": (24.5, -3.5, 5, 3)}
def _casas():
    pred = [_LUG_REL[k] for k in ["taverna", "ferraria", "capela", "mercado", "torre", "campo", "muralha"]]
    n = 0
    for i in range(-5, 5):
        for j in range(-5, 5):
            cx, cz = 7 * i + 3.5, 7 * j + 3.5
            if math.hypot(cx, cz) < 9: continue
            if any(abs(cx - o[0]) < o[2] / 2 + 3.6 and abs(cz - o[1]) < o[3] / 2 + 3.6 for o in pred): continue
            n += 2
    return n
VILA_CAP = _casas()

def _units(s):
    b = s.encode("utf-16-le")
    return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]

def hash32(s):
    h = 2166136261
    for u in _units(s):
        h ^= u
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def rnd(seed):
    x = hash32(str(seed)) or 1
    def r():
        nonlocal x
        x ^= (x << 13) & 0xFFFFFFFF
        x ^= x >> 17
        x ^= (x << 5) & 0xFFFFFFFF
        return (x % 100000) / 100000
    return r

REAL_EPOCH = 1793674800000      # Date.UTC(2026,10,3,3,0,0) = 03/11/2026 00:00 de Brasília (v34)
HORA_REAL = 3600000
# lido da página publicada, se ela mudar
try:
    _m = re.search(r"REAL_EPOCH\s*=\s*Date\.UTC\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)", _html)
    if _m:
        import calendar
        a, mes, d, h, mi, se = (int(x) for x in _m.groups())
        REAL_EPOCH = calendar.timegm((a, mes + 1, d, h, mi, se)) * 1000
except Exception:
    pass

def mundo(now_ms=None):
    """Relógio do MUNDO (luz, rotina, clima, evento do dia, Crônica): hora real de Brasília desde a v34. Dia 1 = 03/11/2026."""
    now = time.time() * 1000 if now_ms is None else now_ms
    t = (now - REAL_EPOCH) / HORA_REAL
    return {"t": t, "hora": int(math.floor(t)) % 24, "dia": int(math.floor(t / 24)) + 1, "frac": t % 1}

def clima_de(dia, hora):
    """Igual à página: bloco de 3 h, hash('clima:'+dia+':'+bloco) % 1000."""
    r = hash32("clima:%d:%d" % (int(dia), int(hora) // 3)) % 1000
    c = "sol" if r < 470 else "nublado" if r < 690 else "chuva" if r < 840 else "neblina" if r < 930 else "tempestade" if r < 990 else "neve"
    if c == "neblina" and hora >= 11: c = "nublado"
    return c

def clima_do_dia(dia):
    return [{"hora": b * 3, "clima": clima_de(dia, b * 3)} for b in range(8)]

def hora_ts(ts):
    """Hora e dia da vila num instante real (ms)."""
    return mundo(ts)

def carregar_moradores(caminho):
    j = json.load(io.open(caminho, encoding="utf-8"))
    out = []
    for m in j.get("moradores", []):
        if m.get("fundador"): continue
        out.append({"id": m["id"], "nome": m["nome"], "nomeCompleto": m.get("nomeCompleto") or "", "sexo": m.get("sexo") or "?",
                    "profissao": m["profissao"], "joinedAt": m.get("joinedAt") or EPOCH, "npc": False,
                    "missoes": m.get("missoes") or [], "discreto": bool(m.get("discreto"))})
    return out

def todos(moradores, now_ms=None):
    now = time.time() * 1000 if now_ms is None else now_ms
    reais = sorted([m for m in moradores if m["joinedAt"] <= now], key=lambda m: m["joinedAt"])
    lista = [dict(m, vi=0, slot=i) for i, m in enumerate(NPCS)]
    lista += [dict(m, vi=1 + k // VILA_CAP, slot=k % VILA_CAP) for k, m in enumerate(reais)]
    return lista

def n_vilas(moradores, now_ms=None):
    n = len([m for m in todos(moradores, now_ms) if not m["npc"]])
    return 1 + max(1, math.ceil(n / VILA_CAP))

def eventos_de(m, now_ms=None):
    now = time.time() * 1000 if now_ms is None else now_ms
    dias = min(90, int(math.floor((now - m["joinedAt"]) / (24 * HORA_MS))))
    lista, delta, respeito, montaria, quedas, vitorias = [], 0, 0, None, 0, 0
    forca_cl, alc = CLASSE.get(m["profissao"], (1, "perto"))
    nome = m["nome"]
    for d in range(1, dias + 1):
        r = rnd(m["id"] + ":dia" + str(d))
        ts = m["joinedAt"] + (d * 24 - 6) * HORA_MS
        nivel_atual = int(math.floor(math.sqrt(max(0, math.floor((d * 24 - 6) * 10 / 24 * 10) + delta) / 50))) + 1
        forca = nivel_atual + forca_cl
        v = r()
        if v < 0.07:
            quedas += 1; delta -= 25 * nivel_atual
            lista.append({"ts": ts, "tipo": "queda", "texto": nome + " escorregou na ponte e caiu no rio. Reiniciou no último ponto seguro e perdeu um nível.", "ruim": True})
        elif v < 0.22:
            c = CRIATURAS[int(math.floor(r() * len(CRIATURAS)))]
            grupo = r() < 0.55
            forca_total = forca + (int(math.floor(r() * 6)) + 2 if grupo else 0)
            if forca_total > c["vida"]:
                vitorias += 1; delta += 20 * c["vida"]
                if c.get("monta") and not montaria:
                    montaria = c["monta"]
                    lista.append({"ts": ts, "tipo": "doma", "criatura": c["n"], "grupo": grupo,
                                  "texto": nome + (" e os amigos" if grupo else "") + " cercaram " + c["n"] + " e domaram! Agora " + nome + " anda montado."})
                else:
                    lista.append({"ts": ts, "tipo": "vitoria", "criatura": c["n"], "grupo": grupo, "vida": c["vida"],
                                  "texto": nome + (" e os amigos" if grupo else "") + (" acertaram de longe " if alc == "longe" else " venceram ") + c["n"]
                                  + (" e ganharam " + c["drop"] + "." if c["drop"] else ".")})
            else:
                delta -= 15 * nivel_atual
                lista.append({"ts": ts, "tipo": "derrota", "criatura": c["n"], "ruim": True,
                              "texto": nome + " encostou sozinho em " + c["n"] + " e levou a pior. Reiniciou no último ponto seguro e perdeu um nível."})
        elif v < 0.30 and d > 2:
            ganhou = r() < 0.5
            if ganhou:
                respeito += 1; delta += 40
                lista.append({"ts": ts, "tipo": "briga_vitoria", "texto": nome + " encarou um morador de outra vila na praça deles e venceu. Ganhou respeito."})
            else:
                respeito = max(0, respeito - 1); delta -= 10 * nivel_atual
                lista.append({"ts": ts, "tipo": "briga_derrota", "ruim": True,
                              "texto": nome + " foi encarar outra vila, perdeu a briga e voltou correndo para casa."})   # Dr. 07/11 ~23h50: sem explicação "ninguém se machuca"
    return {"delta": delta, "respeito": respeito, "montaria": montaria, "quedas": quedas, "vitorias": vitorias, "lista": lista, "forca": forca_cl, "alc": alc}

def aplicar_lutas_da_pagina(eventos, lutas):
    """A página decide as lutas por dano (v27+). Para cada evento de criatura do Python, usa o resultado da página com o mesmo ts:
    vitória/derrota/doma ficam iguais aos da página, com texto coerente. lutas = lista de vilaCam.lutas("@nome")."""
    por_ts = {int(l.get("ts", 0)): l for l in (lutas or [])}
    for e in eventos:
        if e.get("tipo") not in ("vitoria", "derrota", "doma"): continue
        l = por_ts.get(int(e["ts"]))
        if not l: continue
        e["luta"] = l
        nome = e["texto"].split(" ")[0]
        c = l.get("criatura", e.get("criatura"))
        if l.get("venceu") and e["tipo"] == "derrota":
            e["tipo"] = "vitoria"; e.pop("ruim", None)
            e["texto"] = "%s%s venceram %s." % (nome, " e os amigos" if l.get("grupo") else "", c) if l.get("grupo") else "%s venceu %s." % (nome, c)
        elif not l.get("venceu") and e["tipo"] in ("vitoria", "doma"):
            e["tipo"] = "derrota"; e["ruim"] = True
            e["texto"] = "%s encarou %s e levou a pior. Reiniciou no último ponto seguro e perdeu um nível." % (nome, c)
    return eventos

def xp_de(m, now_ms=None):
    now = time.time() * 1000 if now_ms is None else now_ms
    horas = max(0, (now - m["joinedAt"]) / HORA_MS)
    ev = {"delta": 0, "respeito": 9, "montaria": None, "forca": 3, "alc": "perto"} if m.get("npc") else eventos_de(m, now)
    xp = max(0, int(math.floor(horas * 10 / 24 * 10)) + ev["delta"])
    xp += sum(int(x.get("xp") or 0) for x in (m.get("missoes") or []))          # v44: missões somam XP (e respeito, abaixo)
    nivel = int(math.floor(math.sqrt(xp / 50))) + 1
    prox, ant = 50 * nivel * nivel, 50 * (nivel - 1) * (nivel - 1)
    titulo = "Aprendiz" if nivel < 3 else "Oficial" if nivel < 6 else "Mestre" if nivel < 10 else "Lenda"
    return {"xp": xp, "nivel": nivel, "titulo": titulo, "prox": prox, "pct": min(1, (xp - ant) / (prox - ant)), "respeito": ev["respeito"] + sum(int(x.get("respeito") or 0) for x in (m.get("missoes") or [])),
            "montaria": ev["montaria"], "forca": nivel + (ev["forca"] or 1), "alc": ev["alc"] or "perto"}

def lacos_de(m, moradores, now_ms=None):
    l = todos(moradores, now_ms)
    me = next((z for z in l if z["id"] == m["id"]), None)
    if not me: return {"amigos": [], "desafetos": []}
    r = rnd("lacos:" + m["id"])
    mesma = [z for z in l if z["vi"] == me["vi"] and z["id"] != m["id"]]
    outras = [z for z in l if (z["vi"] != me["vi"] and not z["npc"]) or (z["npc"] and me["vi"] != 0 and z["vi"] == 0)]
    amigos, na, pool = [], min(len(mesma), 2 + int(math.floor(r() * 3))), list(mesma)
    for _ in range(na):
        if not pool: break
        amigos.append(pool.pop(int(math.floor(r() * len(pool)))))
    ev = {"respeito": 0, "lista": []} if me.get("npc") else eventos_de(m, now_ms)
    brigas = len([e for e in ev["lista"] if "outra vila" in e["texto"]])
    desafetos, pool2 = [], list(outras)
    for _ in range(min(brigas, 3)):
        if not pool2: break
        desafetos.append(pool2.pop(int(math.floor(r() * len(pool2)))))
    return {"amigos": amigos, "desafetos": desafetos}

def turno_sono(m):
    """v35: cada morador dorme 6-7 h a partir de 21h-5h, pelo @ (igual à página)."""
    ini = (21 + hash32(m["id"] + "sono") % 9) % 24
    dur = 6 + hash32(m["id"] + "durSono") % 2
    return ini, dur

def dormindo(m, h):
    ini, dur = turno_sono(m)
    return ((h - ini) % 24 + 24) % 24 < dur

LOCAIS_DESCANSO = ['cabana', 'praca', 'fogueira', 'taverna', 'cura']

def energia_de(m, min_real):
    """v38: energia (stamina) no lugar do sono. W min trabalhando, R min descansando, ciclo pelo @ (igual à página)."""
    W = 70 + hash32(m["id"] + "W") % 40
    local = LOCAIS_DESCANSO[hash32(m["id"] + "localDesc") % len(LOCAIS_DESCANSO)]
    rapido = local in ("taverna", "cura")
    Rr = int(round((18 + hash32(m["id"] + "R") % 10) * (0.6 if rapido else 1)))
    L = W + Rr
    t = ((min_real + hash32(m["id"] + "off") % L) % L + L) % L
    if t < W: return {"energia": int(round(100 - 85 * t / W)), "descansando": False, "local": local, "volta": 0}
    return {"energia": int(round(15 + 85 * (t - W) / Rr)), "descansando": True, "local": local, "volta": max(1, math.ceil(Rr - (t - W)))}

def estado_resumido(m, moradores, w, now_ms=None, tem_taverna=None, tem_muralha=None):
    """Onde o morador está e o que faz numa hora (v38: energia no lugar do sono). Sem coordenadas.
    tem_taverna/tem_muralha: a página sabe (economia da vila); aqui None = desconhecido (Vila Aurora tem tudo; Pinheiral depende).
    Para roteiro, preferir vilaCam.rotina(h) da página (gerar_episodio faz isso)."""
    h, dia = w["hora"], w["dia"]
    frac = w.get("frac", 0.5)
    nv = n_vilas(moradores, now_ms)
    me = next((z for z in todos(moradores, now_ms) if z["id"] == m["id"]), None)
    vi = me["vi"] if me else 1
    minha = VILAS_NOMES[vi % len(VILAS_NOMES)]
    if tem_taverna is None: tem_taverna = (vi == 0)
    if tem_muralha is None: tem_muralha = (vi == 0)
    guarda = m["profissao"] in ("soldado", "cavaleiro", "arqueiro")
    noite = h >= 22 or h < 6
    en = energia_de(m, ((dia - 1) * 24 + h + frac) * 60)
    if en["descansando"]:
        loc = "fogueira" if (en["local"] == "taverna" and not tem_taverna) else en["local"]
        volta = " (volta em ~%d min)" % en["volta"]
        if loc == "cabana": return {"chave": "dorme", "acao": "descansando na cabana para recuperar energia" + volta, "lugar": "casa", "vila": minha, "energia": en["energia"]}
        if loc == "taverna": return {"chave": "lazer", "acao": "recuperando energia na taverna" + volta, "lugar": "Taverna", "vila": minha, "energia": en["energia"]}
        if loc == "cura": return {"chave": "lazer", "acao": "recuperando energia na Casa de Cura" + volta, "lugar": "Casa de Cura", "vila": minha, "energia": en["energia"]}
        return {"chave": "fogueira", "acao": ("descansando num banco da praça" if loc == "praca" else "descansando na fogueira") + " para recuperar energia" + volta, "lugar": "Praça da Fogueira", "vila": minha, "energia": en["energia"]}
    if noite and guarda:
        return {"chave": "ronda", "acao": "de ronda noturna com a tocha" if tem_muralha else "vigiando a praça com a tocha", "lugar": "Posto de Guarda" if tem_muralha else "Praça da Fogueira", "vila": minha}
    if h == 12: return {"chave": "almoco", "acao": "almoçando na taverna" if tem_taverna else "almoçando ao redor da fogueira", "lugar": "Taverna" if tem_taverna else "Praça da Fogueira", "vila": minha}
    if 13 <= h < 18 and nv > 1 and hash32(m["id"] + "visita" + str(dia)) % 4 == 0:
        outra = (vi + 1 + hash32(m["id"] + str(dia)) % (nv - 1)) % nv
        nome_outra = VILAS_NOMES[outra % len(VILAS_NOMES)]
        if h == 13: return {"chave": "visita", "acao": "a caminho de " + nome_outra, "lugar": "estrada", "vila": nome_outra}
        if h == 17: return {"chave": "visita", "acao": "voltando de " + nome_outra, "lugar": "estrada", "vila": minha}
        return {"chave": "visita", "acao": "visitando a praça de " + nome_outra, "lugar": "Praça da Fogueira", "vila": nome_outra}
    pl = LUGAR_DE.get(m["profissao"], "praca")
    cl = clima_de(dia, h)
    if tem_taverna and cl in ("chuva", "tempestade", "neve") and m["profissao"] in ("fazendeiro", "lenhador", "pescador", "pastor", "cacador", "explorador", "construtor", "arqueiro"):
        return {"chave": "abrigo", "acao": "se aquecendo na taverna até a neve passar" if cl == "neve" else "esperando a chuva passar na taverna", "lugar": "Taverna", "vila": minha, "clima": cl}
    return {"chave": "trab", "acao": TRABALHO.get(m["profissao"], "trabalhando"), "lugar": LUGAR_NOME.get(pl, "Praça"), "vila": minha, "clima": cl}

VILOES = [{"k": "goblins", "nome": "Goblins da Estrada", "texto": "Goblins rondam a estrada. Os soldados acendem as tochas e eles fogem para a floresta."},
          {"k": "lobo", "nome": "Lobo Cinzento", "texto": "O Lobo Cinzento uivou perto do campo. A fazendeira bateu panela e ele sumiu no mato."},
          {"k": "bruxa", "nome": "Bruxa do Pântano", "texto": "A Bruxa do Pântano tentou azedar o leite. O mago desfez o feitiço antes do café."},
          {"k": "ladrao", "nome": "Ladrão Mascarado", "texto": "Um ladrão mascarado levou três pães. O padeiro deixou um bilhete: 'da próxima, peça'."}]

def viloes_da_cronica(moradores, now_ms=None, horas=24):
    """Vilões que a Crônica da página mostrou nas últimas `horas` (v34: 1 linha por hora real; 24 = um dia). Mesma conta da página:
    th = hora inteira do mundo, r = rnd("cr"+th+"-"+len(todos())), r() < .18 entre 6 h e 22 h, pick(r, VILOES)."""
    now = time.time() * 1000 if now_ms is None else now_ms
    n = len(todos(moradores, now))
    th0 = int(math.floor(mundo(now)["t"]))
    saida = []
    for th in range(th0, th0 - horas - 1, -1):
        if th < 0: break
        h = th % 24
        if not (6 <= h <= 22): continue
        r = rnd("cr" + str(th) + "-" + str(n))
        if r() < .18:
            v = VILOES[int(math.floor(r() * len(VILOES))) % len(VILOES)]
            saida.append({"th": th, "hora": h, "dia": th // 24 + 1, "k": v["k"], "nome": v["nome"], "texto": v["texto"]})
    return saida

# ---------- conferência contra a página (Node) ----------
def _conferir():
    """Compara com a página aberta de verdade (vilaCam.stats): nível de cada morador e relógio. Página manda; diferença = avisar e ajustar."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from stats_pagina import dados_pagina
    ms = carregar_moradores(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "site", "moradores.json"))
    pag = dados_pagina([m["nome"] for m in ms], rotina_horas=range(24))
    ok = True
    for m in ms:
        st = pag["stats"].get(m["nome"]) or {}
        py = xp_de(m)["nivel"]
        if st.get("nivel") != py:
            ok = False; print("NIVEL DIFERENTE", m["nome"], "python", py, "pagina", st.get("nivel"))
    rel = pag.get("relogio") or {}
    if rel:
        w = mundo()
        if (rel.get("dia"), rel.get("hora")) != (w["dia"], w["hora"]):
            ok = False; print("RELÓGIO DIFERENTE: python", w["dia"], w["hora"], "página", rel.get("dia"), rel.get("hora"))
        else:
            print("relógio igual: dia", w["dia"], "hora", w["hora"])
    for d, prev in (pag.get("clima") or {}).items():
        py = [b["clima"] for b in clima_do_dia(int(d))]
        pg = [ (b.get("clima") if isinstance(b, dict) else b) for b in (prev or [])]
        if pg and py != pg: ok = False; print("CLIMA DIFERENTE dia", d, "python", py, "página", pg)
        elif pg: print("clima igual dia", d, py)
    rot = pag.get("rotina") or {}
    if rot:
        w0 = mundo(); por_nome = {m["nome"].lower(): m for m in ms}
        iguais = total = 0; difs = []
        for h, lista in sorted(rot.items(), key=lambda kv: int(kv[0])):
            for e in (lista or []):
                m = por_nome.get(str(e.get("nome", "")).lower())
                if not m: continue
                py = estado_resumido(m, ms, {"hora": int(h), "dia": w0["dia"], "frac": 0.5})["chave"]
                total += 1
                if py == e.get("chave"): iguais += 1
                elif len(difs) < 6: difs.append("%sh %s python=%s página=%s" % (h, m["nome"], py, e.get("chave")))
        print("rotina 24 h: %d de %d iguais" % (iguais, total), ("| ex.: " + "; ".join(difs)) if difs else "")
    print("conferência:", "IGUAL à página" if ok else "DIVERGE (os geradores usam o nível e as lutas da página, então o roteiro sai certo)",
          "| moradores:", len(ms), "| relógio EPOCH", EPOCH, "HORA_MS", HORA_MS)
    return ok

if __name__ == "__main__":
    NOW = int(time.time() * 1000)
    if "--conferir" in sys.argv: sys.exit(0 if _conferir() else 1)
    print(mundo(), "VILA_CAP", VILA_CAP)
