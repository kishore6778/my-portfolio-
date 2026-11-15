/* =====================================================================
   Kishore B. — scroll film engine
   The page is one long scroll. Scroll position -> film time -> everything.
   ===================================================================== */
(() => {
  "use strict";
  const C = window.CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const easeInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------
     FILM MAP  (film seconds, measured from film_master.mp4)
     Every segment plays forward a little, so the character never freezes:
     "holds" are slow stretches where a section is read.
     ------------------------------------------------------------------ */
  const DURATION = 34.9;
  const SEGMENTS = [
    { t: [0.0, 4.4],    h: 1.5, scene: 1 },  // back to camera -> turns around
    { t: [4.4, 5.0],    h: 1.1, scene: 1 },  // INTRO hold
    { t: [5.0, 8.6],    h: 1.0, scene: 2 },  // walks into the close-up
    { t: [8.6, 12.6],   h: 1.7, scene: 2 },  // ABOUT hold (smiles, alive)
    { t: [12.6, 15.6],  h: 1.2, scene: 3 },  // dip through black -> wide
    { t: [15.6, 22.0],  h: 1.6, scene: 3 },  // steps back, sits, desk slides in
    { t: [22.0, 26.1],  h: 4.4, scene: 4 },  // WORK hold (typing)
    { t: [26.1, 27.6],  h: 1.1, scene: 5 },  // dip -> the dark office
    { t: [27.6, 28.4],  h: 0.5, scene: 5 },  // stands up
    { t: [28.4, 31.4],  h: 2.2, scene: 5 },  // SKILLS: walks past
    { t: [31.4, 32.5],  h: 0.6, scene: 6 },  // turns to camera
    { t: [32.5, 33.05], h: 1.6, scene: 6 },  // RESUME hold
    { t: [33.05, 33.7], h: 0.5, scene: 6 },  // raises hand
    { t: [33.7, 34.88], h: 1.7, scene: 6 }   // CONTACT: waves
  ];
  // [fade-in start, fully in, start fading out, gone] in film seconds
  const WINDOWS = {
    home:    [0.4, 3.9, 5.4, 6.8],
    about:   [7.2, 8.7, 12.2, 13.5],
    ch2:     [13.9, 14.75, 15.25, 16.4],
    work:    [20.8, 22.2, 25.75, 26.35],
    ch3:     [26.2, 26.75, 27.1, 28.0],
    skills:  [27.9, 28.9, 31.0, 31.75],
    resume:  [31.8, 32.6, 32.98, 33.4],
    contact: [33.2, 33.85, 99, 100]
  };
  const NAV_TIME = { home: 4.7, about: 10.4, work: 22.4, skills: 29.6, resume: 32.75, contact: 34.6 };
  const CHAPTERS = [
    [0, "Prologue"], [6.5, "I · Hello"], [14.8, "II · The Work"], [26.8, "III · The Craft"], [33.2, "Fin · Say hi"]
  ];

  // Camera keyframes: put film point (fx, fy) at screen point (sx, sy), scaled by s.
  const KEYS_DESKTOP = [
    { t: 0,    fx: .45, fy: .50, sx: .66, sy: .50, s: 1.00 },
    { t: 4.5,  fx: .50 },
    { t: 7.0,  sx: .68 },
    { t: 13.0, sx: .68 },
    { t: 15.0, sx: .52 },
    { t: 20.0, sx: .50 },
    { t: 21.8, sx: .31 },
    { t: 26.4, sx: .31 },
    { t: 26.8, fx: .45, fy: .52, sx: .42, sy: .53, s: 1.04 },
    { t: 31.4, sx: .42 },
    { t: 32.4, sx: .36 },
    { t: 33.4, fx: .44, sx: .33 },
    { t: 35,   sx: .33 }
  ];
  const KEYS_MOBILE = [
    { t: 0,     fx: .45, fy: .50, sx: .50, sy: .46, s: 1.00 },
    { t: 3.0,   fx: .44 },
    { t: 4.5,   fx: .50 },
    { t: 6.6,   sy: .44, s: 1.00 },
    { t: 8.4,   sy: .36, s: .86 },     // close-up rides high so the About card never covers his face
    { t: 13.0,  sy: .36, s: .86 },
    { t: 15.0,  sy: .46, s: 1.00 },
    { t: 20.0,  fx: .50 },
    { t: 21.6,  fx: .57, sy: .44 },
    { t: 26.4,  fx: .57 },
    { t: 26.8,  fx: .56, fy: .50, sy: .47, s: 1.00 },
    { t: 28.25, fx: .52 }, { t: 28.75, fx: .47 }, { t: 29.25, fx: .42 }, { t: 29.75, fx: .375 },
    { t: 30.25, fx: .355 }, { t: 31.25, fx: .37 }, { t: 31.75, fx: .42 }, { t: 32.75, fx: .45 },
    { t: 33.25, fx: .46 }, { t: 33.75, fx: .44 }, { t: 35, fx: .43 }
  ];
  // The laptop during the work hold (cards fly out of it) and his body while waving (frame).
  const LAPTOP = { fx: .70, fy: .66 };
  const FRAME_DESKTOP = { x0: .305, x1: .55, y0: .05, y1: .9 };
  const FRAME_MOBILE = { x0: .33, x1: .56, y0: .075, y1: .5 };

  /* ------------------------------------------------------------------
     DOM + CONTENT
     ------------------------------------------------------------------ */
  const video = $("#video");
  const film = $("#film");
  const scroller = $("#scroller");
  const panels = {};
  $$("[data-sec]").forEach((el) => (panels[el.dataset.sec] = el));

  const splitChars = (el, text, cls = "") => {
    el.textContent = "";
    el.setAttribute("aria-label", text);
    return [...text].map((ch) => {
      const s = document.createElement("span");
      s.className = "char " + cls;
      s.setAttribute("aria-hidden", "true");
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
      return s;
    });
  };
  const splitWords = (el, lines) => {
    el.textContent = "";
    const inner = [];
    lines.forEach((line, li) => {
      const isLast = li === lines.length - 1;
      line.split(" ").forEach((word, wi, arr) => {
        const w = document.createElement("span");
        w.className = "w";
        const i = document.createElement(isLast && el.dataset.accentLast ? "em" : "span");
        i.textContent = word;
        if (isLast && el.dataset.accentLine) i.classList.add("accentLine");
        w.appendChild(i);
        el.appendChild(w);
        inner.push(i);
        if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
      });
      if (li < lines.length - 1) el.appendChild(document.createElement("br"));
    });
    return inner;
  };

  // loader + brand
  const fullName = `${C.name.first} ${C.name.last}`;
  $("#brandName").textContent = fullName;
  document.title = `${fullName} — ${C.role}`;
  const ln = $("#loaderName");
  [...C.name.first.toUpperCase()].forEach((ch, i) => {
    const s = document.createElement("span"); s.textContent = ch; s.style.animationDelay = `${i * 0.05}s`; ln.appendChild(s);
  });
  const sp = document.createElement("span"); sp.innerHTML = "&nbsp;"; ln.appendChild(sp);
  [...C.name.last.toUpperCase()].forEach((ch, i) => {
    const s = document.createElement("span"); s.className = "accent"; s.textContent = ch;
    s.style.animationDelay = `${(C.name.first.length + i + 1) * 0.05}s`; ln.appendChild(s);
  });

  // intro
  const nameChars = [
    ...splitChars($("#nameFirst"), C.name.first.toUpperCase()),
    ...splitChars($("#nameLast"), C.name.last.toUpperCase())
  ];
  $("#statusText").textContent = C.status;
  $("#locText").textContent = C.location;
  const introHi = $(".intro__hi"), introRole = $(".intro__role"), introStatus = $(".intro__status");

  // about
  $("#aboutEyebrow").textContent = C.about.eyebrow;
  const aboutTitle = $("#aboutTitle");
  aboutTitle.dataset.accentLast = "1";
  const aboutWords = splitWords(aboutTitle, C.about.title);
  $("#aboutBody").textContent = C.about.body;
  const statEls = C.about.stats.map((st) => {
    const d = document.createElement("div");
    d.className = "stat";
    d.innerHTML = `<div class="stat__v"><span>0</span><i>${st.suffix}</i></div><div class="stat__l"></div>`;
    d.querySelector(".stat__l").textContent = st.label;
    $("#aboutStats").appendChild(d);
    return { el: d.querySelector(".stat__v span"), v: st.value, box: d };
  });
  const aboutBody = $("#aboutBody");

  // work
  const deck = $("#deck");
  const pad = (n) => String(n).padStart(2, "0");
  $("#workTotal").textContent = pad(C.projects.length);
  const cards = C.projects.map((p, i) => {
    const el = document.createElement("article");
    el.className = "card";
    const link = p.link
      ? `<a class="card__link" href="${p.link}" target="_blank" rel="noopener">Visit live <span>↗</span></a>`
      : `<span class="card__link card__link--off">${p.linkLabel}</span>`;
    el.innerHTML = `
      <div class="card__top"><span class="card__no">${pad(i + 1)}</span><span class="card__kind"></span></div>
      <h3 class="card__title"></h3>
      <p class="card__blurb"></p>
      <ul class="card__points"></ul>
      <div class="card__foot"><div class="tags"></div>${link}</div>`;
    el.querySelector(".card__kind").textContent = p.kind;
    el.querySelector(".card__title").textContent = p.title;
    el.querySelector(".card__blurb").textContent = p.blurb;
    const ul = el.querySelector(".card__points");
    p.points.forEach((pt) => { const li = document.createElement("li"); li.textContent = pt; ul.appendChild(li); });
    const tags = el.querySelector(".tags");
    p.tech.forEach((t) => { const s = document.createElement("span"); s.className = "tag"; s.textContent = t; tags.appendChild(s); });
    deck.appendChild(el);
    const state = { el, tiltX: 0, tiltY: 0, tx: 0, ty: 0 };
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", `${mx * 100}%`); el.style.setProperty("--my", `${my * 100}%`);
      state.tx = (mx - .5) * 10; state.ty = (.5 - my) * 8;
    });
    el.addEventListener("pointerleave", () => { state.tx = 0; state.ty = 0; });
    return state;
  });
  const dots = C.projects.map(() => {
    const s = document.createElement("span"); const i = document.createElement("i"); s.appendChild(i);
    $("#workDots").appendChild(s); return i;
  });

  // skills
  const chips = [];
  C.skills.forEach((g) => {
    const box = document.createElement("div"); box.className = "skillGroup";
    const lab = document.createElement("div"); lab.className = "skillGroup__label"; lab.textContent = g.group;
    const row = document.createElement("div"); row.className = "chips";
    g.items.forEach((it) => { const c = document.createElement("span"); c.className = "chip"; c.textContent = it; row.appendChild(c); chips.push(c); });
    box.append(lab, row); $("#skillGroups").appendChild(box);
  });
  const skillGroupsEl = $("#skillGroups");

  // resume
  const xpHTML = (x) => {
    const d = document.createElement("div"); d.className = "xp";
    d.innerHTML = `<div class="xp__role"></div><div class="xp__org"></div><div class="xp__when"></div>${x.note ? '<div class="xp__note"></div>' : ""}`;
    d.querySelector(".xp__role").textContent = x.role;
    d.querySelector(".xp__org").textContent = x.org;
    d.querySelector(".xp__when").textContent = x.when;
    if (x.note) d.querySelector(".xp__note").textContent = x.note;
    return d;
  };
  C.resume.experience.forEach((x) => $("#expList").appendChild(xpHTML(x)));
  C.resume.education.forEach((x) => $("#eduList").appendChild(xpHTML(x)));
  $("#langText").textContent = C.resume.languages;
  const rb = $("#resumeBtn");
  if (C.resume.file) rb.href = C.resume.file; else rb.style.display = "none";
  const paper = $("#paper");

  // contact
  const contactH = $("#contactH");
  contactH.dataset.accentLine = "1";
  const contactWords = splitWords(contactH, C.contact.headline);
  const mail = $("#mailLink");
  mail.textContent = C.contact.email; mail.href = `mailto:${C.contact.email}`;
  C.contact.socials.filter((s) => s.url).forEach((s) => {
    const a = document.createElement("a"); a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = `${s.label} ↗`; $("#socials").appendChild(a);
  });
  $("#copyBtn").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(C.contact.email); } catch (_) {
      const ta = document.createElement("textarea"); ta.value = C.contact.email; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {} ta.remove();
    }
    const t = $("#toast"); t.classList.add("is-on"); setTimeout(() => t.classList.remove("is-on"), 1600);
  });

  // chapter cards
  const chapterParts = {};
  ["ch2", "ch3"].forEach((k) => {
    const el = panels[k];
    chapterParts[k] = { num: $(".chapter__num", el), title: $(".chapter__title", el), sub: $(".chapter__sub", el) };
  });

  // typewriter role
  const roleEl = $("#roleText");
  (function typeLoop() {
    const roles = C.roleCycle && C.roleCycle.length ? C.roleCycle : [C.role];
    let r = 0, i = 0, del = false;
    const tick = () => {
      const word = roles[r];
      i += del ? -1 : 1;
      roleEl.textContent = word.slice(0, i);
      let wait = del ? 28 : 55;
      if (!del && i === word.length) { del = roles.length > 1; wait = 2200; if (!del) return; }
      else if (del && i === 0) { del = false; r = (r + 1) % roles.length; wait = 350; }
      setTimeout(tick, wait);
    };
    if (reduced) roleEl.textContent = roles[0]; else setTimeout(tick, 900);
  })();

  /* ------------------------------------------------------------------
     LAYOUT
     ------------------------------------------------------------------ */
  let W = 0, H = 0, VH = 0, isMobile = false, bw = 0, bh = 0, total = 0, starts = [], lastW = 0;
  let KEYS = KEYS_DESKTOP;

  const fillKeys = (keys) => {
    const out = []; let prev = {};
    keys.forEach((k) => { prev = { ...prev, ...k }; out.push(prev); });
    return out;
  };
  const KD = fillKeys(KEYS_DESKTOP), KM = fillKeys(KEYS_MOBILE);

  function layout(force) {
    W = window.innerWidth; H = window.innerHeight;
    isMobile = matchMedia("(max-width: 760px)").matches;
    // on phones the URL bar resizes the viewport: only re-measure scroll height when width changes
    if (force || !isMobile || W !== lastW || !VH) VH = H;
    lastW = W;
    KEYS = isMobile ? KM : KD;
    if (isMobile) { bh = H; bw = H * 16 / 9; }
    else { bw = Math.max(H * 16 / 9, W * 0.75); bh = bw * 9 / 16; }
    film.style.width = `${bw}px`; film.style.height = `${bh}px`;
    starts = []; let acc = 0;
    SEGMENTS.forEach((s) => { starts.push(acc); acc += s.h * VH; });
    total = acc;
    scroller.style.height = `${total + VH}px`;
    $("#frame").setAttribute("viewBox", `0 0 ${W} ${H}`);
  }

  // scroll px -> film seconds
  function timeAt(y) {
    if (y <= 0) return SEGMENTS[0].t[0];
    for (let i = 0; i < SEGMENTS.length; i++) {
      const s = SEGMENTS[i], len = s.h * VH;
      if (y < starts[i] + len) return lerp(s.t[0], s.t[1], (y - starts[i]) / len);
    }
    return SEGMENTS[SEGMENTS.length - 1].t[1];
  }
  // film seconds -> scroll px
  function scrollAt(t) {
    for (let i = 0; i < SEGMENTS.length; i++) {
      const s = SEGMENTS[i];
      if (t <= s.t[1]) return starts[i] + clamp((t - s.t[0]) / (s.t[1] - s.t[0])) * s.h * VH;
    }
    return total;
  }
  function segIndexAt(y) {
    for (let i = SEGMENTS.length - 1; i >= 0; i--) if (y >= starts[i]) return i;
    return 0;
  }

  function camAt(t) {
    const k = KEYS;
    if (t <= k[0].t) return k[0];
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i], b = k[i + 1];
      if (t <= b.t) {
        const u = easeInOut((t - a.t) / (b.t - a.t));
        return { fx: lerp(a.fx, b.fx, u), fy: lerp(a.fy, b.fy, u), sx: lerp(a.sx, b.sx, u), sy: lerp(a.sy, b.sy, u), s: lerp(a.s, b.s, u) };
      }
    }
    return k[k.length - 1];
  }
  let cam = { tx: 0, ty: 0, s: 1 };
  const toScreen = (fx, fy) => ({ x: cam.tx + cam.s * fx * bw, y: cam.ty + cam.s * fy * bh });

  // section progress from smoothed scroll
  function win(name, y) {
    const w = WINDOWS[name];
    const a = scrollAt(w[0]), b = scrollAt(w[1]), c = scrollAt(w[2]), d = scrollAt(w[3]);
    const enter = b > a ? clamp((y - a) / (b - a)) : (y >= b ? 1 : 0);
    const hold = c > b ? clamp((y - b) / (c - b)) : (y >= c ? 1 : 0);
    const exit = d > c ? clamp((y - c) / (d - c)) : (y >= d ? 1 : 0);
    return { enter, hold, exit, vis: enter * (1 - exit), on: y > a - 2 && y < d + 2 };
  }

  /* ------------------------------------------------------------------
     RENDER LOOP
     ------------------------------------------------------------------ */
  let sy = 0, filmT = 0, ready = false, last = performance.now(), clock = 0;
  const nav = $$(".nav button"), pill = $("#navPill");
  let activeNav = "";

  function setPanel(el, vis, on) {
    el.classList.toggle("is-on", on && vis > 0.001);
    el.style.opacity = vis.toFixed(3);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
    const target = window.scrollY;
    sy += (target - sy) * (1 - Math.exp(-dt * (isMobile ? 14 : 9)));
    if (Math.abs(target - sy) < 0.3) sy = target;

    // ---- film playhead
    const tWant = timeAt(sy);
    filmT += (tWant - filmT) * (1 - Math.pow(1 - 0.16, dt * 60));
    if (Math.abs(tWant - filmT) < 0.002) filmT = tWant;
    if (ready && video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - filmT) > 1 / 48) {
      video.currentTime = Math.min(filmT, (video.duration || DURATION) - 0.04);
    }

    // ---- camera
    const k = camAt(filmT);
    cam.s = k.s; cam.tx = k.sx * W - k.s * k.fx * bw; cam.ty = k.sy * H - k.s * k.fy * bh;
    film.style.transform = `translate3d(${cam.tx.toFixed(1)}px, ${cam.ty.toFixed(1)}px, 0) scale(${k.s.toFixed(4)})`;

    // ---- HUD, progress, hint
    const prog = clamp(sy / total);
    $("#progress").style.transform = `scaleX(${prog.toFixed(4)})`;
    $("#hudScene").textContent = `SCENE ${pad(SEGMENTS[segIndexAt(sy)].scene)}`;
    const fr = Math.floor((filmT % 1) * 24);
    $("#hudTc").textContent = `00:${pad(Math.floor(filmT))}:${pad(fr)}`;
    let chap = CHAPTERS[0][1]; CHAPTERS.forEach(([t, n]) => { if (filmT >= t) chap = n; });
    $("#hudChapter").textContent = chap;
    $("#hint").classList.toggle("is-hidden", sy > VH * 0.15);

    // ---- sections
    renderIntro(win("home", sy));
    renderAbout(win("about", sy));
    renderChapter("ch2", win("ch2", sy));
    renderWork(win("work", sy));
    renderChapter("ch3", win("ch3", sy));
    renderSkills(win("skills", sy));
    renderResume(win("resume", sy));
    renderContact(win("contact", sy));

    // ---- shading so text always reads (fades with the panels)
    const hw = win("home", sy).vis, ab = win("about", sy).vis, wk = win("work", sy).vis,
          sk = win("skills", sy).vis, rs = win("resume", sy).vis, ct = win("contact", sy).vis;
    if (isMobile) {
      $("#shadeB").style.opacity = Math.max(hw, ab, wk, sk, rs, ct).toFixed(3);
      $("#shadeL").style.opacity = 0; $("#shadeR").style.opacity = 0;
    } else {
      $("#shadeL").style.opacity = (Math.max(hw, ab) * 0.9).toFixed(3);
      $("#shadeR").style.opacity = (Math.max(wk, sk, ct) * 0.75 + rs * 0.35).toFixed(3);
      $("#shadeB").style.opacity = 0;
    }

    // ---- nav pill
    let cur = "home";
    Object.keys(NAV_TIME).forEach((n) => { if (filmT >= WINDOWS[n][0] - 0.2) cur = n; });
    if (cur !== activeNav) {
      activeNav = cur;
      nav.forEach((b) => b.classList.toggle("is-active", b.dataset.go === cur));
      placePill();
    }

    requestAnimationFrame(frame);
  }

  function placePill() {
    const b = nav.find((x) => x.dataset.go === activeNav);
    if (!b) return;
    pill.style.width = `${b.offsetWidth}px`;
    pill.style.transform = `translateX(${b.offsetLeft}px)`;
  }

  /* ---------------- section renderers ---------------- */
  function renderIntro(w) {
    const el = panels.home;
    setPanel(el, w.on ? 1 : 0, w.on);
    if (!w.on) return;
    const e = w.enter, x = w.exit;
    introHi.style.opacity = (smooth(e * 2.2) * (1 - x)).toFixed(3);
    introHi.style.transform = `translateY(${((1 - easeOut(e * 2.2)) * 20).toFixed(1)}px)`;
    const n = nameChars.length;
    nameChars.forEach((c, i) => {
      const l = easeOut(clamp(e * 1.55 - i * (0.55 / n) - 0.1));
      const out = easeOut(clamp(x * 1.6 - (n - i) * (0.4 / n)));
      const y = (1 - l) * 105 - out * 60;
      const blur = (1 - l) * 10 + out * 8;
      c.style.transform = `translate3d(0, ${y.toFixed(1)}%, 0) rotate(${((1 - l) * 7).toFixed(2)}deg)`;
      c.style.opacity = (l * (1 - out)).toFixed(3);
      c.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "none";
    });
    const r = smooth((e - 0.55) / 0.45) * (1 - smooth(x * 1.4));
    introRole.style.opacity = r.toFixed(3);
    introRole.style.transform = `translateY(${((1 - r) * 16).toFixed(1)}px)`;
    const st = smooth((e - 0.7) / 0.3) * (1 - smooth(x * 1.2));
    introStatus.style.opacity = st.toFixed(3);
    introStatus.style.transform = `translateY(${((1 - st) * 12).toFixed(1)}px)`;
  }

  function renderAbout(w) {
    const el = panels.about;
    setPanel(el, w.vis ? Math.min(1, w.vis * 1.4) : 0, w.on);
    if (!w.on) return;
    const e = w.enter, x = w.exit;
    el.style.transform = isMobile
      ? `translate3d(0, ${((1 - easeOut(e)) * 40 + x * -20).toFixed(1)}px, 0)`
      : `translate3d(${((1 - easeOut(e)) * -40 + x * -30).toFixed(1)}px, 0, 0)`;
    el.style.filter = x > 0.01 ? `blur(${(x * 10).toFixed(1)}px)` : "none";
    aboutWords.forEach((wd, i) => {
      const l = easeOut(clamp(e * 1.8 - i * 0.09));
      wd.style.transform = `translate3d(0, ${((1 - l) * 110).toFixed(1)}%, 0)`;
    });
    const b = smooth((e - 0.35) / 0.5);
    aboutBody.style.opacity = b.toFixed(3);
    aboutBody.style.transform = `translateY(${((1 - b) * 14).toFixed(1)}px)`;
    statEls.forEach((s, i) => {
      const p = smooth((e - 0.55 - i * 0.08) / 0.35);
      const count = easeOut(clamp(w.hold * 2.2 + (e >= 1 ? 0.15 : 0) + (e - 0.7) * 2));
      s.box.style.opacity = p.toFixed(3);
      s.box.style.transform = `translateY(${((1 - p) * 18).toFixed(1)}px)`;
      s.el.textContent = Math.round(s.v * count);
    });
  }

  function renderChapter(k, w) {
    const el = panels[k], p = chapterParts[k];
    const v = w.vis;
    el.classList.toggle("is-on", w.on && v > 0.001);
    el.style.opacity = smooth(v).toFixed(3);
    // letterbox bars grow during the chapter cards
    const lb = Math.max(win("ch2", sy).vis, win("ch3", sy).vis);
    $("#lbTop").style.transform = `scaleY(${smooth(lb).toFixed(3)})`;
    $("#lbBot").style.transform = `scaleY(${smooth(lb).toFixed(3)})`;
    if (!w.on) return;
    const e = easeOut(w.enter), x = w.exit;
    p.num.style.transform = `scale(${(1.25 - 0.25 * e + x * 0.15).toFixed(3)})`;
    p.num.style.opacity = (e * (1 - x)).toFixed(3);
    p.title.style.letterSpacing = `${((1 - e) * 0.35 + x * 0.12).toFixed(3)}em`;
    p.title.style.filter = `blur(${((1 - e) * 12 + x * 10).toFixed(1)}px)`;
    p.sub.style.opacity = smooth((w.enter - 0.5) / 0.5 * (1 - x)).toFixed(3);
  }

  function renderWork(w) {
    const el = panels.work;
    const head = smooth(w.enter * 1.3) * (1 - smooth(w.exit));
    setPanel(el, w.on ? 1 : 0, w.on);
    if (!w.on) return;
    $(".work__head", el).style.opacity = head.toFixed(3);
    $(".work__dots", el).style.opacity = head.toFixed(3);
    const N = cards.length;
    const dr = deck.getBoundingClientRect();
    const o = toScreen(LAPTOP.fx, LAPTOP.fy);
    const ox = o.x - (dr.left + dr.width / 2), oy = o.y - (dr.top + dr.height / 2);
    // active card (continuous): each card dwells in front, then flicks away in the last part of its slot
    const q = clamp(w.hold * (N - 0.6), 0, N - 1);
    const qk = Math.floor(q), qf = q - qk;
    const a = Math.min(N - 1, qk + smooth((qf - 0.5) / 0.5));
    const ai = Math.round(a);
    $("#workIdx").textContent = pad(Math.min(N, ai + 1));
    dots.forEach((d, i) => { d.style.transform = `scaleX(${clamp(a - i + 1).toFixed(3)})`; });
    cards.forEach((c, i) => {
      // fly-in from the laptop, staggered
      const fin = easeOut(clamp((w.enter - i * 0.09) / 0.55));
      const r = i - a;                                   // >0 waiting in the deck, <0 already flicked away
      let tx = 0, ty = 0, rz = 0, ry = 0, sc = 1, op = 1, blur = 0;
      if (r >= 0) {
        const d = Math.min(r, 3);
        ty = d * (isMobile ? 10 : 16); sc = 1 - d * 0.055; op = r > 3 ? 0 : 1 - Math.max(0, r - 2) * 0.6;
        blur = d * 0.6;
      } else {
        const f = clamp(-r);                              // 0..1 leaving
        const fe = easeInOut(f);
        tx = -fe * (isMobile ? 115 : 135); ty = -fe * 50; rz = -fe * 16; ry = fe * 30; op = 1 - smooth((f - 0.42) / 0.33); sc = 1 - fe * 0.1;
      }
      // blend from laptop origin
      const fx = lerp(ox, 0, fin), fy = lerp(oy, 0, fin);
      const fs = lerp(0.12, 1, fin), fry = lerp(-75, 0, fin), frz = lerp(10, 0, fin);
      const ex = w.exit;
      const exX = easeInOut(clamp(ex * 1.4 - (N - 1 - i) * 0.08)) * (isMobile ? 0 : 60);
      const exOp = 1 - smooth(ex * 1.3);
      c.tiltX += (c.ty - c.tiltX) * 0.12; c.tiltY += (c.tx - c.tiltY) * 0.12;
      const isFront = Math.abs(r) < 0.5;
      const tiltX = isFront ? c.tiltX : 0, tiltY = isFront ? c.tiltY : 0;
      c.el.style.zIndex = String(100 - Math.round(Math.abs(r) * 10));
      c.el.style.transform =
        `translate3d(${(fx + (tx / 100) * dr.width + exX).toFixed(1)}px, ${(fy + ty).toFixed(1)}px, 0) ` +
        `rotateY(${(fry + ry + tiltY).toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg) rotateZ(${(frz + rz).toFixed(2)}deg) scale(${(fs * sc).toFixed(4)})`;
      c.el.style.opacity = (Math.min(1, fin * 1.6) * op * exOp).toFixed(3);
      c.el.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : "none";
      c.el.style.pointerEvents = isFront && fin > 0.95 ? "auto" : "none";
    });
  }

  let mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  function renderSkills(w) {
    const el = panels.skills;
    setPanel(el, w.on ? 1 : 0, w.on);
    if (!w.on) return;
    const head = smooth(w.enter * 1.4) * (1 - smooth(w.exit * 1.2));
    $(".eyebrow", el).style.opacity = head.toFixed(3);
    const h2 = $(".h2", el);
    h2.style.opacity = head.toFixed(3);
    h2.style.transform = `translateY(${((1 - head) * 22).toFixed(1)}px)`;
    $$(".skillGroup__label", el).forEach((l, gi) => { l.style.opacity = smooth(w.enter * 1.5 - gi * 0.2) * (1 - smooth(w.exit)); });
    // chips arrive one by one as he walks past
    const prog = w.enter * 0.45 + w.hold * 0.55;
    const K = chips.length;
    chips.forEach((c, i) => {
      const l = easeOut(clamp((prog - (i / K) * 0.78) / 0.18));
      const out = easeInOut(clamp(w.exit * 1.5 - ((K - i) / K) * 0.5));
      const v = l * (1 - out);
      const floatY = reduced ? 0 : Math.sin(clock * 1.4 + i * 1.7) * 2.2 * v;
      c.style.opacity = v.toFixed(3);
      c.style.transform = `translate3d(${(out * 40).toFixed(1)}px, ${((1 - l) * 18 + floatY).toFixed(1)}px, 0) scale(${(0.7 + 0.3 * l).toFixed(3)})`;
      c.style.filter = v < 0.98 ? `blur(${((1 - v) * 10).toFixed(1)}px)` : "none";
    });
    if (!isMobile) {
      mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
      skillGroupsEl.style.transform = `translate3d(${(mouse.sx * -10).toFixed(1)}px, ${(mouse.sy * -8).toFixed(1)}px, 0)`;
    }
  }

  function renderResume(w) {
    const el = panels.resume;
    setPanel(el, w.on ? 1 : 0, w.on);
    if (!w.on) return;
    // the paper drops on its strings, overshoots and swings to rest (scroll-driven, reversible)
    const p = clamp(w.enter);
    const spring = 1 - Math.exp(-5.5 * p) * Math.cos(9.5 * p);
    const drop = (1 - spring) * -(H * 1.1);
    const swing = Math.sin(p * 13) * 7 * Math.pow(1 - p, 2);
    const idle = reduced ? 0 : Math.sin(clock * 1.1) * 0.7 * p;
    const lift = easeInOut(w.exit) * -(H * 1.1);
    paper.style.transform = `translate3d(0, ${(drop + lift).toFixed(1)}px, 0) rotate(${(swing + idle).toFixed(2)}deg)`;
    paper.style.opacity = Math.min(1, p * 3).toFixed(3);
  }

  function renderContact(w) {
    const el = panels.contact;
    setPanel(el, w.vis ? Math.min(1, w.enter * 1.6) : 0, w.on);
    const fr = $("#frameRect");
    // frame around him while he waves
    const fp = easeInOut(w.on ? w.enter * 1.05 + w.hold * 0.4 : 0);
    const F = isMobile ? FRAME_MOBILE : FRAME_DESKTOP;
    const a = toScreen(F.x0, F.y0), b = toScreen(F.x1, F.y1);
    const fwid = Math.max(0, b.x - a.x), fhei = Math.max(0, b.y - a.y);
    fr.setAttribute("x", a.x.toFixed(1)); fr.setAttribute("y", a.y.toFixed(1));
    fr.setAttribute("width", fwid.toFixed(1)); fr.setAttribute("height", fhei.toFixed(1));
    const len = 2 * (fwid + fhei);
    fr.style.setProperty("--len", len.toFixed(0));
    fr.style.strokeDashoffset = (len * (1 - clamp(fp))).toFixed(1);
    fr.style.opacity = fp > 0.001 ? "1" : "0";
    if (!w.on) return;
    const e = w.enter;
    el.style.transform = isMobile
      ? `translate3d(0, ${((1 - easeOut(e)) * 40).toFixed(1)}px, 0)`
      : `translate3d(${((1 - easeOut(e)) * 50).toFixed(1)}px, 0, 0)`;
    contactWords.forEach((wd, i) => {
      const l = easeOut(clamp(e * 1.7 - i * 0.1));
      wd.style.transform = `translate3d(0, ${((1 - l) * 110).toFixed(1)}%, 0)`;
    });
  }

  /* ------------------------------------------------------------------
     NAVIGATION (smooth scroll that plays the film to the section)
     ------------------------------------------------------------------ */
  let tween = null;
  function goTo(name) {
    document.body.classList.remove("menu-open");
    const t = NAV_TIME[name] ?? 0;
    const to = name === "home" ? scrollAt(NAV_TIME.home) : scrollAt(t);
    const from = window.scrollY;
    const dist = Math.abs(to - from);
    const dur = Math.min(2600, 700 + dist / VH * 220);
    const t0 = performance.now();
    if (tween) cancelAnimationFrame(tween);
    const step = (now) => {
      const u = clamp((now - t0) / dur);
      window.scrollTo(0, lerp(from, to, easeInOut(u)));
      if (u < 1) tween = requestAnimationFrame(step); else tween = null;
    };
    tween = requestAnimationFrame(step);
  }
  ["wheel", "touchstart", "keydown"].forEach((ev) => window.addEventListener(ev, () => { if (tween) { cancelAnimationFrame(tween); tween = null; } }, { passive: true }));
  $$("[data-go]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); goTo(b.dataset.go); }));
  $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("menu-open"));

  /* ------------------------------------------------------------------
     CURSOR
     ------------------------------------------------------------------ */
  const cursor = $("#cursor"), cDot = $(".cursor__dot"), cRing = $(".cursor__ring");
  let cx = -100, cy = -100, rx = -100, ry = -100;
  window.addEventListener("pointermove", (e) => {
    cx = e.clientX; cy = e.clientY;
    mouse.x = e.clientX / W - 0.5; mouse.y = e.clientY / H - 0.5;
    const hot = e.target.closest("a, button, .chip, .card");
    cursor.classList.toggle("is-hover", !!hot);
  }, { passive: true });
  (function cursorLoop() {
    rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
    cDot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    cRing.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(cursorLoop);
  })();

  /* ------------------------------------------------------------------
     LOADING: download the whole film first, then play it from memory
     ------------------------------------------------------------------ */
  const pctEl = $("#loaderPct"), barEl = $("#loaderBar"), countEl = $("#loaderCount");
  const setPct = (p) => {
    const v = Math.round(clamp(p) * 100);
    pctEl.textContent = String(v).padStart(3, "0");
    countEl.textContent = v;
    barEl.style.transform = `scaleX(${clamp(p)})`;
  };

  async function loadFilm() {
    const src = isMobile ? "media/film_mobile.mp4" : "media/film.mp4";
    let shown = 0, real = 0;
    // a soft fake progress so the bar never feels stuck while headers arrive
    const fake = setInterval(() => { shown = Math.max(shown, Math.min(real, shown + 0.02)); setPct(shown); }, 60);
    let url = src;
    try {
      const res = await fetch(src);
      if (!res.ok || !res.body) throw new Error("no stream");
      const len = +res.headers.get("Content-Length") || 0;
      const reader = res.body.getReader();
      const chunks = []; let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value); got += value.length;
        real = len ? got / len : Math.min(0.95, got / 14e6);
      }
      url = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }));
    } catch (e) {
      url = src;                                   // fallback: stream it normally
    }
    real = 1;
    await new Promise((resolve) => {
      let doneFlag = false;
      const finish = () => { if (!doneFlag) { doneFlag = true; resolve(); } };
      video.addEventListener("loadeddata", finish, { once: true });
      setTimeout(finish, 15000);
      video.src = url;
      video.load();
    });
    try { video.currentTime = 0.001; } catch (e) {}
    await new Promise((r) => setTimeout(r, 250));
    clearInterval(fake);
    setPct(1);
    await new Promise((r) => setTimeout(r, 350));
  }

  // iOS needs one play() inside a user gesture before seeking paints frames
  const unlock = () => {
    const p = video.play();
    if (p && p.then) p.then(() => video.pause()).catch(() => {});
    else video.pause();
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("touchstart", unlock, { passive: true });

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  layout(true);
  window.scrollTo(0, 0);
  window.addEventListener("resize", () => { layout(false); placePill(); });
  window.addEventListener("orientationchange", () => setTimeout(() => layout(true), 250));
  requestAnimationFrame(frame);
  // handy for tuning timings in the console: __film.jump(22.5) jumps straight to that film second
  window.__film = {
    scrollAt, timeAt, goTo, video,
    jump(t) { const y = scrollAt(t); window.scrollTo(0, y); sy = y; filmT = t; video.currentTime = t; }
  };

  loadFilm().then(() => {
    ready = true;
    $("#loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    placePill();
    const hash = (location.hash || "").slice(1);
    if (hash && NAV_TIME[hash] !== undefined) setTimeout(() => goTo(hash), 900);
  });
})();
