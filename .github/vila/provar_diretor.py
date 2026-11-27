"""Teste do Modo Diretor em Chrome headless, com WebGL por software."""
from fractions import Fraction
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from threading import Thread
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]


class QuietServer(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def capture(game, output):
    source = (ROOT / "diretor.js").read_text(encoding="utf-8")
    begin = source.index("  async function gravar(s)")
    end = source.index("  function sair()", begin)
    recording = source[begin:end].replace("frameRate:60", "frameRate:30").replace("duracao*60", "2*30")
    recording = recording.replace("som.add(audio(id))", "som.add(audio(id), 0, 2)")
    # Mediabunny AudioBufferSource.add consumption is determined by the AudioBuffer length.
    recording = recording.replace("som.add(audio(id), 0, 2)", """som.add((()=>{
        const original=audio(id), curto=new AudioBuffer({length:original.sampleRate*2,
          sampleRate:original.sampleRate,numberOfChannels:original.numberOfChannels});
        for(let c=0;c<curto.numberOfChannels;c++)curto.copyToChannel(original.getChannelData(c).subarray(0,curto.length),c);
        return curto;
      })())""")
    recording = recording.replace("i/60,1/60", "i/30,1/30").replace("desenhar(i/60)", "desenhar(i/30)")
    if "video.add(i/30,1/30)" not in recording or "frameRate:30" not in recording:
        raise RuntimeError("O gravador mudou. Revise o teste de 30 fps.")
    (game / "diretor-ensaio.js").write_text(source[:begin] + recording + source[end:], encoding="utf-8")

    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietServer, directory=game)) as server:
        server.daemon_threads = True
        server.request_queue_size = 128
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(
                    channel="chrome", headless=True,
                    args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
                )
                page = browser.new_page(viewport={"width": 1280, "height": 900}, accept_downloads=True)
                origin = f"http://127.0.0.1:{server.server_port}"

                def route(request):
                    if request.request.url == f"{origin}/diretor.js":
                        request.fulfill(path=str(game / "diretor-ensaio.js"), content_type="application/javascript")
                    elif request.request.url.startswith(origin + "/"):
                        request.continue_()
                    else:
                        request.abort()

                page.route("**/*", route)
                page.goto(f"{origin}/?luz=14&debug=1", wait_until="domcontentloaded", timeout=90_000)
                page.wait_for_function("window.vilaDiretor && +document.querySelector('#pop').textContent > 0", timeout=90_000)
                renderer = page.evaluate("""() => {
                  const gl = window.__V.renderer.getContext();
                  const ext = gl.getExtension('WEBGL_debug_renderer_info');
                  return gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
                }""")
                if "SwiftShader" not in renderer:
                    raise RuntimeError(f"Software WebGL não confirmado: {renderer}")
                print(f"Chrome {browser.version} · {renderer}", flush=True)
                start = time.monotonic()
                with page.expect_download(timeout=420_000) as downloaded:
                    page.evaluate("() => window.vilaDiretor.gravar('festa')")
                downloaded.value.save_as(output)
                print(f"Gravação concluída em {time.monotonic() - start:.1f} s.", flush=True)
                browser.close()
        finally:
            server.shutdown()
            thread.join()


def verify(output):
    info = json.loads(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(output)], text=True,
    ))
    video = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    audio = next(stream for stream in info["streams"] if stream["codec_type"] == "audio")
    rate = Fraction(video["avg_frame_rate"])
    frames = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(output), "-map", "0:v:0", "-f", "framemd5", "-"], text=True,
    )
    checksums = [line.rsplit(",", 1)[-1].strip() for line in frames.splitlines() if re.match(r"^\d+,", line)]
    size = (video["width"], video["height"])
    duration = float(info["format"]["duration"])
    if size != (1080, 1920) or rate != 30 or len(checksums) != 60 or len(set(checksums)) < 30 or not 1.99 <= duration <= 2.10:
        raise RuntimeError(f"Exportação divergente: {size}, {rate} fps, {len(checksums)} quadros, {duration:.3f} s")
    print(f"MP4 decodificado: 1080×1920, {rate} fps, 60 quadros ({len(set(checksums))} distintos), "
          f"{duration:.3f} s, vídeo {video['codec_name']}, áudio {audio['codec_name']}.")
    print("O MP4 fica na pasta temporária do runner.")


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="vila-diretor-") as directory:
        game = Path(directory) / "jogo"
        shutil.copytree(ROOT, game, ignore=shutil.ignore_patterns(".git", ".github"))
        output = Path(directory) / "diretor-30fps.mp4"
        capture(game, output)
        verify(output)
