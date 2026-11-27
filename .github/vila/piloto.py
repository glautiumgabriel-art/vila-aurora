"""Ensaio do lote local e leitura limitada da API oficial, em memória."""
import argparse
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from threading import Thread
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
ACCOUNT = "vilaauroraoficial"
GRAPH = "https://graph.instagram.com/v24.0"
DATA = ["moradores.json", "stats.json", "pedidos.json"]


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def api_get(base, token, path, **params):
    url = f"{base}/{path}?{urlencode(params)}"
    request = Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    with build_opener(NoRedirect).open(request, timeout=15) as response:
        return json.load(response)


def sample_comments(base, token):
    profile = api_get(base, token, "me", fields="username")
    if profile["username"].lower() != ACCOUNT:
        raise ValueError("conta divergente")
    posts = api_get(base, token, "me/media", fields="id,comments_count", limit=10)["data"]
    sampled = []
    for post in posts:
        post_id = post["id"]
        if not post_id.isascii() or not post_id.isdecimal():
            raise ValueError("identificador inválido")
        if post["comments_count"]:
            comments = api_get(base, token, f"{post_id}/comments", fields="id", limit=10)["data"]
            sampled.extend(comments)
    return len(posts), len(sampled)


def git(cwd, *args):
    return subprocess.check_output(["git", "-C", str(cwd), *args], text=True, stderr=subprocess.PIPE).strip()


def test_sample():
    class MockGraph(BaseHTTPRequestHandler):
        def do_GET(self):
            routes = {
                "/me": {"username": ACCOUNT},
                "/me/media": {"data": [{"id": "123", "comments_count": 1}]},
                "/123/comments": {"data": [{"id": "18000000000000001"}]},
            }
            assert self.headers.get("Authorization") == "Bearer fixture"
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps(routes[self.path.split("?")[0]]).encode("utf-8"))

        def log_message(self, *args):
            pass

    with HTTPServer(("127.0.0.1", 0), MockGraph) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            result = sample_comments(f"http://127.0.0.1:{server.server_port}", "fixture")
            if result != (1, 1):
                raise RuntimeError("fixture de comentários falhou")
        finally:
            server.shutdown()
            thread.join()
    print("API de comentários: fixture HTTP OK, sem chamada à Meta")


def test_batch():
    with tempfile.TemporaryDirectory(prefix="vila-git-ensaio-") as directory:
        temp = Path(directory)
        repo, site, robo = (temp / name for name in ("repo", "site", "robo"))
        for folder in (repo, site, robo):
            folder.mkdir()
        git(repo, "init", "-q")
        for name in DATA:
            (repo / name).write_text("{}\n", encoding="utf-8")
        git(repo, "add", "--", *DATA)
        git(repo, "-c", "user.name=Vila CI", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
            "commit", "-qm", "fixture inicial")
        shutil.copyfile(ROOT / "index.html", repo / "index.html")
        for name in ("gerar_stats.py", "vila_sim.py"):
            shutil.copyfile(Path(__file__).with_name(name), robo / name)
        resident = {"id": "ig-ensaio", "nome": "@ensaio", "profissao": "pescador",
                    "joinedAt": int(time.time() * 1000) - 1000, "faltas": 0}
        residents = json.dumps({"versao": 3, "moradores": [resident]})
        for folder in (repo, site):
            (folder / "moradores.json").write_text(residents, encoding="utf-8")
        (repo / "pedidos.json").write_text('{"pedidos": []}', encoding="utf-8")
        subprocess.run([sys.executable, "-B", str(robo / "gerar_stats.py"), "--sem-combate"], check=True)
        stats = json.loads((repo / "stats.json").read_text(encoding="utf-8"))
        if stats["moradores"] != 1 or stats["porProfissao"] != {"pescador": 1}:
            raise RuntimeError("contadores divergentes no ensaio")
        git(repo, "add", "--", *DATA)
        staged = set(git(repo, "diff", "--cached", "--name-only").splitlines())
        if staged != set(DATA) or git(repo, "remote"):
            raise RuntimeError("lote fora da lista permitida ou com remoto")
        git(repo, "-c", "user.name=Vila CI", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
            "commit", "-qm", "ensaio de um lote de dados")
        print("Git temporário: lote único com moradores.json, pedidos.json e stats.json")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ensaio", action="store_true")
    if parser.parse_args().ensaio:
        test_batch()
        test_sample()
        return
    token = os.environ.pop("INSTAGRAM_TOKEN", "").strip()
    if not token:
        print("INSTAGRAM_TOKEN ausente. Ensaio sem acesso à conta concluído.")
        return
    try:
        posts, comments = sample_comments(GRAPH, token)
    except HTTPError as error:
        raise SystemExit(f"Leitura da Meta falhou (HTTP {error.code}).") from None
    except Exception:
        raise SystemExit("Leitura da Meta falhou. Verifique a conta e o acesso à API de comentários.") from None
    print(f"Consulta de observação: {posts} publicações, {comments} comentários amostrados.")


if __name__ == "__main__":
    main()
