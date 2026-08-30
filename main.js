/* ------------------------------------------------------------------
   Omer Arafat portfolio: interaction layer.
   One rAF loop drives everything continuous (cursor, trail, ambient
   canvas, parallax, timeline tracer). Scroll is read once per frame
   and lerped, which gives the parallax + tracer an inertial feel
   without hijacking native scrolling.
   ------------------------------------------------------------------ */

(() => {
  "use strict";

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const small = matchMedia("(max-width: 768px)").matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------------- pointer state (shared) ---------------- */
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, active: false };
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.active = true; }, { passive: true });
  addEventListener("pointerleave", () => { mouse.active = false; });

  /* ---------------- scroll proxy (lerped) ---------------- */
  const scroll = { y: scrollY, target: scrollY };
  addEventListener("scroll", () => { scroll.target = scrollY; }, { passive: true });

  /* ---------------- split text ---------------- */
  document.querySelectorAll("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    let i = 0;
    words.forEach((w, wi) => {
      const word = document.createElement("span");
      word.className = "word";
      for (const ch of w) {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        c.style.setProperty("--i", i++);
        word.appendChild(c);
      }
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  /* ---------------- reveal on enter ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal, .split, .rise").forEach((el) => io.observe(el));

  /* ---------------- nav state + active link ---------------- */
  const nav = document.getElementById("nav");
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  sections.forEach((s) => sectionIO.observe(s));

  /* ---------------- counters ---------------- */
  const counters = document.querySelectorAll("[data-count]");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      const el = en.target, end = +el.dataset.count, pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      if (reduce) { el.textContent = pre + end + suf; return; }
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = pre + Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  counters.forEach((c) => countIO.observe(c));

  /* ---------------- copy to clipboard ---------------- */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    let t;
    btn.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(btn.dataset.copy); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = btn.dataset.copy; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      btn.classList.add("is-done");
      clearTimeout(t);
      t = setTimeout(() => btn.classList.remove("is-done"), 1800);
    });
  });

  /* ---------------- tilt + spotlight ---------------- */
  const tilts = [...document.querySelectorAll("[data-tilt]")];
  if (finePointer && !reduce && !small) {
    tilts.forEach((el) => {
      let rx = 0, ry = 0, trx = 0, try_ = 0, raf = null, hover = false;
      const max = el.classList.contains("hero-card") ? 8 : 5;
      const loop = () => {
        rx = lerp(rx, trx, 0.12); ry = lerp(ry, try_, 0.12);
        el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
        if (hover || Math.abs(rx - trx) > 0.01 || Math.abs(ry - try_) > 0.01) raf = requestAnimationFrame(loop);
        else { raf = null; el.style.transform = ""; }
      };
      el.addEventListener("pointerenter", () => { hover = true; if (!raf) raf = requestAnimationFrame(loop); });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        try_ = (px - 0.5) * max * 2; trx = (0.5 - py) * max * 2;
        el.style.setProperty("--mx", `${px * 100}%`); el.style.setProperty("--my", `${py * 100}%`);
      });
      el.addEventListener("pointerleave", () => { hover = false; trx = 0; try_ = 0; });
    });
  }

  /* ---------------- terminal ---------------- */
  const termBody = document.getElementById("termBody");
  const termForm = document.getElementById("termForm");
  const termInput = document.getElementById("termInput");
  const history = []; let hIdx = -1;

  const link = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label || href}</a>`;
  const commands = {
    help: () => [
      "Available commands:",
      "  about        who I am",
      "  skills       what I work with",
      "  experience   where I have worked",
      "  projects     things I have shipped",
      "  writing      recent articles",
      "  contact      how to reach me",
      "  open &lt;name&gt;  linkedin | github | sharedeal | resume",
      "  clear        wipe the screen",
    ],
    whoami: () => ["omer arafat"],
    about: () => [
      "Omer Arafat. Senior Software Engineer, Dhaka.",
      "Leading IAM at Allianz Australia (15-person team, AU/NZ/MY).",
      "Co-Founder and CTO of ShareDeal, Bangladesh's first group-buying platform.",
      "8+ years across full-stack, identity engineering and enterprise integration.",
    ],
    skills: () => [
      "IAM        SailPoint, One Identity, Active Directory, RBAC, OAuth2, OIDC, SAML",
      "Frontend   Angular, Flutter, React, TypeScript",
      "Backend    Node.js, NestJS, ASP.NET, Spring Boot, Laravel",
      "Data       PostgreSQL, MySQL, MongoDB, CouchDB",
      "Cloud      AWS, Docker, Kubernetes, GitHub Actions",
      "Leadership Team lead (15), product strategy, Agile, mentoring",
    ],
    experience: () => [
      "2026-now   RemoteIntegrity (US)       ERP & AI Product Architect and Lead Developer",
      "2024-now   Allianz Australia          Senior Software Engineer (IAM) / Team Lead",
      "2024-now   K53 Technology Solution    Senior Software Engineer",
      "2022-now   ShareDeal                  Co-Founder and CTO",
      "2022-2024  Schertech / SCT Bangla     Senior Software Engineer",
      "2021-2022  Mind Orbital Technologies  Full Stack Developer",
      "2019-2020  BDSTALL.COM                Software Engineer",
      "2018-2019  Retail Technologies Ltd    Junior Programmer",
    ],
    projects: () => [
      "ShareDeal     group buying, 40K+ installs, BDT 70M seed    " + link("https://sharedealnow.com", "sharedealnow.com"),
      "HishabPati    offline-first ledger SaaS, 100K+ installs",
      "Schertech MES manufacturing execution with IoT",
      "Netverk       Xero to SAP real-time sync",
      "Bdstall       marketplace app, 25K to 60K+ daily visitors",
      "Square Bear   Kanban project management SaaS",
    ],
    writing: () => [
      "Building ShareDeal: lessons from Bangladesh's first group-buying platform",
      "IAM at enterprise scale: what eight years taught me",
      "SailPoint, honestly: five years in",
      "Kiln: a design system rooted in Bangladeshi heritage",
      "More at " + link("https://arafatomer66.github.io/omerarafat-resume/#blog", "the blog"),
    ],
    contact: () => [
      "email     " + link("mailto:arafatomer66@gmail.com", "arafatomer66@gmail.com"),
      "whatsapp  " + link("https://wa.me/8801622524064", "+88 01622524064"),
      "linkedin  " + link("https://www.linkedin.com/in/arafatomer66/", "linkedin.com/in/arafatomer66"),
      "github    " + link("https://github.com/arafatomer66", "github.com/arafatomer66"),
    ],
    open: (arg) => {
      const map = {
        linkedin: "https://www.linkedin.com/in/arafatomer66/",
        github: "https://github.com/arafatomer66",
        sharedeal: "https://sharedealnow.com",
        resume: "https://arafatomer66.github.io/omerarafat-resume/",
      };
      if (!map[arg]) return { err: true, lines: [`open: unknown target "${arg || ""}". Try: ${Object.keys(map).join(" | ")}`] };
      window.open(map[arg], "_blank", "noopener");
      return [`Opening ${arg}...`];
    },
    clear: () => { termBody.innerHTML = ""; return []; },
    sudo: () => ({ err: true, lines: ["Nice try. Permission denied."] }),
  };

  const print = (lines, cls = "") => {
    lines.forEach((l) => {
      const div = document.createElement("div");
      div.className = "term-line" + (cls ? " " + cls : "");
      div.innerHTML = l;
      termBody.appendChild(div);
    });
    termBody.scrollTop = termBody.scrollHeight;
  };

  const run = (raw) => {
    const input = raw.trim();
    if (!input) return;
    print([input.replace(/</g, "&lt;")], "cmd");
    const [cmd, ...rest] = input.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (!fn) { print([`zsh: command not found: ${cmd.replace(/</g, "&lt;")}. Type help.`], "err"); return; }
    const out = fn(rest.join(" ").toLowerCase());
    if (Array.isArray(out)) print(out);
    else print(out.lines, out.err ? "err" : "");
  };

  print(["Welcome. This is Omer's portfolio shell.", "Type <b>help</b> to see what you can do."], "accent");

  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = termInput.value;
    if (v.trim()) { history.unshift(v); hIdx = -1; }
    run(v);
    termInput.value = "";
  });
  termInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx < history.length - 1) termInput.value = history[++hIdx]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.max(-1, hIdx - 1); termInput.value = hIdx === -1 ? "" : history[hIdx]; }
    else if (e.key === "Tab") {
      e.preventDefault();
      const v = termInput.value.toLowerCase();
      const m = Object.keys(commands).filter((c) => c.startsWith(v) && c !== "sudo");
      if (m.length === 1) termInput.value = m[0] + (m[0] === "open" ? " " : "");
      else if (m.length > 1 && v) print([m.join("  ")]);
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); commands.clear(); }
  });
  document.querySelector(".terminal").addEventListener("click", () => termInput.focus());

  /* ---------------- timeline tracer ---------------- */
  const tlFill = document.getElementById("tlFill"), tlGlow = document.getElementById("tlGlow");
  const timeline = document.querySelector(".timeline");
  const milestones = [...document.querySelectorAll(".milestone")];
  let tlProgress = 0;

  const updateTimeline = () => {
    if (!timeline) return;
    const r = timeline.getBoundingClientRect();
    const focus = innerHeight * 0.6; // the tracer head sits 60% down the viewport
    const target = clamp((focus - r.top) / r.height, 0, 1);
    tlProgress = reduce ? target : lerp(tlProgress, target, 0.1);
    const off = 1000 - tlProgress * 1000;
    tlFill.style.strokeDashoffset = off; tlGlow.style.strokeDashoffset = off;
    const headY = r.top + r.height * tlProgress;
    milestones.forEach((m) => m.classList.toggle("is-lit", m.getBoundingClientRect().top + 12 <= headY));
  };

  /* ---------------- ambient canvas ---------------- */
  const amb = document.getElementById("ambient");
  const actx = amb && !reduce ? amb.getContext("2d") : null;
  let aw = 0, ah = 0, dpr = 1;
  const blobs = [
    { x: 0.2, y: 0.3, r: 0.45, c: "99,102,241", a: 0.26, sx: 0.00012, sy: 0.00009, ph: 0 },
    { x: 0.8, y: 0.7, r: 0.5, c: "168,85,247", a: 0.18, sx: 0.00009, sy: 0.00013, ph: 2 },
    { x: 0.65, y: 0.15, r: 0.35, c: "34,211,238", a: 0.13, sx: 0.00015, sy: 0.0001, ph: 4 },
    { x: 0.15, y: 0.85, r: 0.35, c: "236,72,153", a: 0.09, sx: 0.0001, sy: 0.00014, ph: 1 },
  ];
  const resizeAmbient = () => {
    if (!actx) return;
    dpr = small ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    const scale = 0.5; // render at half res, it is all soft gradients anyway
    aw = Math.floor(innerWidth * scale * dpr); ah = Math.floor(innerHeight * scale * dpr);
    amb.width = aw; amb.height = ah;
  };
  const drawAmbient = (t) => {
    if (!actx) return;
    actx.clearRect(0, 0, aw, ah);
    const mx = mouse.x / innerWidth, my = mouse.y / innerHeight;
    blobs.forEach((b, i) => {
      const bx = (b.x + Math.sin(t * b.sx + b.ph) * 0.08 + (mx - 0.5) * (0.12 + i * 0.05)) * aw;
      const by = (b.y + Math.cos(t * b.sy + b.ph) * 0.08 + (my - 0.5) * (0.12 + i * 0.05)) * ah;
      const rad = b.r * Math.max(aw, ah);
      const g = actx.createRadialGradient(bx, by, 0, bx, by, rad);
      g.addColorStop(0, `rgba(${b.c},${b.a})`); g.addColorStop(1, `rgba(${b.c},0)`);
      actx.fillStyle = g; actx.fillRect(0, 0, aw, ah);
    });
  };

  /* ---------------- cursor + trail ---------------- */
  const cursor = document.querySelector(".cursor");
  const trail = document.getElementById("trail");
  const useCursor = finePointer && !reduce && !small;
  let tctx = null, tw = 0, th = 0;
  const particles = [];
  const cur = { x: mouse.x, y: mouse.y, rx: mouse.x, ry: mouse.y };
  let magnet = null;

  if (useCursor) {
    document.body.classList.add("has-cursor");
    tctx = trail.getContext("2d");
    const resizeTrail = () => { tw = trail.width = innerWidth; th = trail.height = innerHeight; };
    resizeTrail();
    addEventListener("resize", resizeTrail);

    document.querySelectorAll("[data-cursor]").forEach((el) => {
      const mode = el.dataset.cursor;
      el.addEventListener("pointerenter", () => { cursor.classList.add("is-" + mode); if (el.classList.contains("btn") || el.closest(".nav-links")) magnet = el; });
      el.addEventListener("pointerleave", () => { cursor.classList.remove("is-" + mode); if (magnet === el) { magnet = null; el.style.transform = ""; } });
    });
    addEventListener("pointerdown", () => cursor.classList.add("is-down"));
    addEventListener("pointerup", () => cursor.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));
  }

  const spawnParticles = (dx, dy) => {
    const speed = Math.hypot(dx, dy);
    if (speed < 1.5) return;
    const n = Math.min(3, Math.floor(speed / 6) + 1);
    for (let i = 0; i < n; i++) {
      if (particles.length > 90) particles.shift();
      particles.push({ x: cur.x + (Math.random() - 0.5) * 6, y: cur.y + (Math.random() - 0.5) * 6, vx: -dx * 0.05 + (Math.random() - 0.5) * 0.8, vy: -dy * 0.05 + (Math.random() - 0.5) * 0.8, life: 1, size: 1 + Math.random() * 1.6, hue: Math.random() * 90 });
    }
  };

  const drawTrail = () => {
    tctx.clearRect(0, 0, tw, th);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life -= 0.028;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      tctx.beginPath();
      tctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      tctx.fillStyle = `hsla(${(200 + p.hue) | 0},90%,70%,${(p.life * 0.6).toFixed(3)})`;
      tctx.fill();
    }
  };

  /* ---------------- master loop ---------------- */
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];
  let lastFrame = 0;

  const frame = (t) => {
    requestAnimationFrame(frame);
    if (t - lastFrame < 8) return; // never do more than ~120 fps of work
    lastFrame = t;

    // scroll proxy
    scroll.y = lerp(scroll.y, scroll.target, 0.12);
    nav.classList.toggle("is-scrolled", scroll.target > 24);
    if (!reduce) parallaxEls.forEach((el) => { el.style.transform = `translate3d(0, ${(-scroll.y * +el.dataset.parallax).toFixed(1)}px, 0)`; });
    updateTimeline();

    // pointer proxy
    const px = mouse.x, py = mouse.y;
    mouse.x = lerp(mouse.x, mouse.tx, 0.18); mouse.y = lerp(mouse.y, mouse.ty, 0.18);

    if (actx) drawAmbient(t);

    if (useCursor) {
      let tx = mouse.tx, ty = mouse.ty;
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = mouse.tx - cx, dy = mouse.ty - cy;
        magnet.style.transform = `translate(${(dx * 0.25).toFixed(1)}px, ${(dy * 0.25).toFixed(1)}px)`;
        tx = cx + dx * 0.35; ty = cy + dy * 0.35;
      }
      cur.x = lerp(cur.x, tx, 0.35); cur.y = lerp(cur.y, ty, 0.35);
      cur.rx = lerp(cur.rx, tx, 0.18); cur.ry = lerp(cur.ry, ty, 0.18);
      cursor.firstElementChild.style.translate = `${cur.x}px ${cur.y}px`;
      cursor.lastElementChild.style.translate = `${cur.rx}px ${cur.ry}px`;
      if (mouse.active) spawnParticles(mouse.x - px, mouse.y - py);
      drawTrail();
    }
  };

  resizeAmbient();
  addEventListener("resize", resizeAmbient);
  requestAnimationFrame(frame);
})();
