# Brief: conversa VÍDEOS DA VILA AURORA (criada a pedido do Dr. em 03/11/2026)

## O projeto
"Vila Aurora": jogo-página 3D (Three.js) que anda sozinho, tipo Big Brother de bonequinhos. Cada @ que segue o Instagram
@vilaauroraoficial vira um morador (classe sorteada, cabana, rotina, equipamento, HP, afinidades, brigas sem morte).
- Site público: https://vila.ihfc.com.br (GitHub Pages, repo glautiumgabriel-art/vila-aurora, clone em `C:\Users\glaut\VIDEOS IA\vila-aurora\repo`).
- Lançado 03/11/2026 com 6 seguidores reais. Lista real: `C:\Users\glaut\VIDEOS IA\vila-aurora\repo\moradores.json`
  (campos nome, nomeCompleto, sexo, profissao, joinedAt), atualizada de hora em hora pelo robô `robo\robo_seguidores.py`.
- Vila Aurora = vila central já pronta (castelo, 12 NPCs com nome: Ema, Tião, Velho Bento, Dona Zefa, Capitão Rufo, Mestre Olavo,
  Nina, Juca, Brás, Lia, Seu Abel, Teo). Quem segue nasce na vila ao lado, Pinheiral (tendas e fogueira, cresce com madeira e comida).
- Dona do código da página: conversa MUNDO DOS BONEQUINHOS (PÁGINA-JOGO). Mudança no site/cenas = pedir a ela (SendMessage), nunca editar `vila-aurora.html`.

## Estilo a reproduzir (perfil krynthal, reel https://www.instagram.com/reel/DfQbyoTitme/)
- Cartão inicial em fonte pixel grande: "ESSA PÁGINA TEM MAIS DE 14 MIL SEGUIDORES" sobre o mapa. Aqui: "A VILA AURORA TEM X MORADORES" (X real do json na hora).
- Episódios numerados: "EPISÓDIO 5 · A GRANDE OBRA". Aqui: "EPISÓDIO N · <título>".
- Legendas enormes de 2 a 4 palavras por cena ("PÓ DE PEDRA", "NUMA CAUSA SÓ"), multidão na praça, drama simples, menção aos @.
- Fechamento: "Seu @ pode ser o próximo · siga @vilaauroraoficial".

## Regras do Dr. que valem aqui
- Respostas curtas (economia de cota até 06/11). Formato da mensagem ao Dr.: divisor ━━━━━━━━━━━━, listas (Concluído, Trabalhando, Fazer agora, O que eu preciso que você faça), Última atualização.
- Tudo em vídeo vertical 1080x1920. Publicar sempre COMPLETO (título, legenda com hashtags, capa, comentário fixado) e pelo Postador Social
  (`C:\Users\glaut\VIDEOS IA\PostadorSocial`), nunca navegador. @vilaauroraoficial ainda NÃO tem aprovação automática: cada vídeo vai ao Dr.
  como amostra pronta (cópia na Área de Trabalho `C:\Users\glaut\OneDrive\Desktop`) e só publica quando ele disser "posta".
- Ninguém morre (vilão foge, morador reinicia). Sem rosto/avatar do Dr. Narração por voz de IA (edge-tts, pt-BR-AntonioNeural, já instalado).
- Começar as histórias com quem já está lá (os 6 reais) e sempre dizer quantos moradores a vila tem.

## Ferramentas prontas
- `C:\Users\glaut\VIDEOS IA\vila-aurora\video\gravar_cena.py <nome> <URL> <duracao_s> "<narração>" [hora_da_vila 0-23]`
  grava a página quadro a quadro (Playwright + relógio virtual, 15 fps), narra com edge-tts e monta o MP4 1080x1920.
  Servidor local antes: `cd "C:\Users\glaut\VIDEOS IA\vila-aurora\site" && python -m http.server 8765 --bind 127.0.0.1`
  (URL = http://127.0.0.1:8765/index.html?...).
- Modos da página: `?abertura=1` (legendas grandes + passeio de câmera), `?segredo=1` (batalha contra o Dragão das Cinzas, só para vídeo),
  `?teste=1` (moradores de exemplo), `#@nome` (abre na ficha do morador; a câmera fica nele).
- Cartões e legendas pixel por cima dos clipes: HyperFrames (skills hyperframes, hyperframes-cli, hyperframes-registry) ou ffmpeg drawtext/overlay.
- Referência de qualidade já feita: `video\vila-aurora_abertura_v2.mp4` (28 s) e `video\vila-aurora_dragao_v3.mp4` (36 s).

## Entrega do Episódio 1 (primeira tarefa)
`C:\Users\glaut\VIDEOS IA\vila-aurora\video\episodios\ep01_<titulo>.mp4` (20 a 45 s) + `ep01_legenda.txt` (título, legenda, hashtags, comentário fixado)
+ cópia `C:\Users\glaut\OneDrive\Desktop\VILA-AURORA_episodio01.mp4`. Registrar no quadro:
`python "C:/Users/glaut/VIDEOS IA/_tools/quadro/quadro.py" pegar "Vila Aurora" "Episódio 1" --dono "Claude: VÍDEOS DA VILA AURORA"`.
Depois: 1 episódio por dia (3 a 5 nos primeiros dias), sempre com o número real de moradores e os @ novos do dia.
