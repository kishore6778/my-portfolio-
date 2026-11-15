# Kishore B. — Scroll-Film Portfolio

A cinematic portfolio you **scroll like a film**. One continuous AI-generated shot plays forwards and backwards with your scrollbar, and every section appears on one of the character's moves: he turns to introduce himself, walks into a close-up for *About*, sits at a desk while project cards fly out of the laptop for *Work*, walks past his *Skills*, a résumé drops on strings, and he waves inside a hand-drawn frame for *Contact*.

Built with plain HTML, CSS and JavaScript. No framework and no build step.

## Run it locally

```bash
npx serve site
```

Then open the link it prints (usually http://localhost:3000).
Opening `index.html` directly from disk won't load the video. Use a local server.

## Edit the content

All text lives in **`site/config.js`**: name, about, stats, projects, skills, résumé, email and social links.
Edit the text inside the quotes, save and refresh. Social links left empty are hidden.

## Project structure

```
site/                 ← the website (deploy this folder)
  index.html
  style.css
  app.js              ← scroll → film-time engine, camera moves, section animations
  config.js           ← all the words
  media/
    film.mp4          ← desktop film (1920px, dense keyframes for instant seeking)
    film_mobile.mp4   ← phone film (1280px)
    poster.jpg
    kishore-b-resume.pdf
clips/                ← the six source clips from Google Flow (Veo)
build_film.py         ← turns the clips into the finished film
```

## Rebuild the film

```bash
pip install numpy opencv-python imageio-ffmpeg
python build_film.py
```

The script joins the six clips into one film. It:

- replaces a dissolve baked into clip 3 with a motion dip-through-black
- frames out a large Veo logo in clip 4 with a slow push-in
- removes the small corner watermark from the other clips
- joins clips 5 and 6 at their matching frame
- grades every frame the same way, then writes the web versions to `site/media/`

## Deploy

- **Netlify:** drag the `site` folder onto <https://app.netlify.com/drop>.
- **Vercel:** import this repo and set **Root Directory** to `site`.
