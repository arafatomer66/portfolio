/* Omer Arafat portfolio, v3. No framework, no build step. */
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- nav state (no scroll listeners) ---------------- */
  const nav = $("#nav");
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe($("#navSentinel"));

  const links = new Map($$(".nav-links a").map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const a = links.get(e.target.id);
      if (a && e.isIntersecting) { links.forEach((l) => l.classList.remove("is-active")); a.classList.add("is-active"); }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach((s) => spy.observe(s));

  /* ---------------- split headlines ---------------- */
  $$("[data-split]").forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(" ");
  });
  const hero = $(".hero-title");
  if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add("is-in")));

  /* ---------------- reveals + counters ---------------- */
  const fmt = (n) => n.toLocaleString("en-US");
  const count = (el) => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || "";
    if (reduce) { el.textContent = fmt(end) + suffix; return; }
    const t0 = performance.now(), dur = 1600;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(end * e)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      $$("[data-count]", e.target).forEach(count);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal, .contact-title").forEach((el) => io.observe(el));

  /* ---------------- marquee: duplicate once for a seamless loop ---------------- */
  const track = $(".marquee-track");
  if (track) { const c = track.firstElementChild.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); }

  /* ---------------- magnetic buttons + portrait tilt ---------------- */
  if (fine && !reduce) {
    $$("[data-magnetic]").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  }

  /* ---------------- hero field (WebGL2 contour map) ---------------- */
  const visual = $(".hero-visual"), canvas = $("#field"), portrait = $(".portrait");
  const pointer = { x: 0.62, y: 0.42, tx: 0.62, ty: 0.42 };
  if (visual) {
    visual.addEventListener("pointermove", (e) => {
      const r = visual.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width; pointer.ty = (e.clientY - r.top) / r.height;
      if (fine && !reduce && portrait) {
        portrait.style.setProperty("--ry", `${(pointer.tx - 0.5) * 10}deg`);
        portrait.style.setProperty("--rx", `${(0.5 - pointer.ty) * 10}deg`);
      }
    });
    visual.addEventListener("pointerleave", () => {
      pointer.tx = 0.62; pointer.ty = 0.42;
      if (portrait) { portrait.style.setProperty("--ry", "0deg"); portrait.style.setProperty("--rx", "0deg"); }
    });
  }

  const gl = canvas && canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
  if (gl) {
    const vs = `#version 300 es
      in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `#version 300 es
      precision highp float;
      uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 bg; uniform vec3 acc; uniform vec3 ink;
      out vec4 o;
      vec2 hash(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(dot(hash(i), f), dot(hash(i+vec2(1,0)), f-vec2(1,0)), u.x),
                   mix(dot(hash(i+vec2(0,1)), f-vec2(0,1)), dot(hash(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * r) / r.y;
        vec2 mp = (m - 0.5 * r) / r.y;
        float d = length(uv - mp);
        vec2 q = uv * 1.5;
        float h = fbm(q + vec2(0.0, t * 0.035) + 0.6 * fbm(q * 0.9 - vec2(t * 0.02, 0.0)));
        h += 0.30 * exp(-d * d * 7.0);
        float lines = h * 16.0;
        float w = fwidth(lines);
        float dist = 0.5 - abs(fract(lines) - 0.5);
        float l = 1.0 - smoothstep(0.35 * w, 1.35 * w, dist);
        float idx = floor(lines + 0.5);
        float major = 1.0 - step(0.5, abs(mod(idx, 5.0)));
        float glow = exp(-d * 2.4);
        vec3 lc = mix(ink * 0.9, acc, clamp(major * 0.9 + glow * 0.85, 0.0, 1.0));
        float a = l * mix(0.16 + glow * 0.35, 0.85, major);
        vec3 col = mix(bg, lc, a);
        col = mix(col, bg, smoothstep(0.45, 1.05, length(uv * vec2(0.9, 1.0))) * 0.75);
        o = vec4(col, 1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = (n) => gl.getUniformLocation(prog, n);
      const uR = U("r"), uT = U("t"), uM = U("m"), uBg = U("bg"), uAcc = U("acc"), uInk = U("ink");

      const rgb = (v) => {
        const c = document.createElement("canvas").getContext("2d"); c.fillStyle = v; c.fillRect(0, 0, 1, 1);
        const d = c.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
      };
      const theme = () => {
        const cs = getComputedStyle(document.documentElement);
        gl.uniform3fv(uBg, rgb(cs.getPropertyValue("--bg-2").trim()));
        gl.uniform3fv(uAcc, rgb(cs.getPropertyValue("--acc-ink").trim()));
        gl.uniform3fv(uInk, rgb(cs.getPropertyValue("--ink-3").trim()));
      };
      theme();
      matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { theme(); if (reduce) draw(0); });

      const size = () => {
        const dpr = Math.min(devicePixelRatio || 1, 1.75);
        canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(uR, canvas.width, canvas.height);
      };
      new ResizeObserver(() => { size(); if (reduce) draw(0); }).observe(canvas);
      size();

      const draw = (time) => {
        pointer.x += (pointer.tx - pointer.x) * 0.06; pointer.y += (pointer.ty - pointer.y) * 0.06;
        gl.uniform1f(uT, time / 1000);
        gl.uniform2f(uM, pointer.x * canvas.width, (1 - pointer.y) * canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      if (reduce) draw(8000);
      else {
        let raf = 0, visible = true;
        const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
        new IntersectionObserver(([e]) => {
          visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible && !document.hidden) raf = requestAnimationFrame(loop);
        }).observe(canvas);
        document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (visible && !document.hidden) raf = requestAnimationFrame(loop); });
      }
    }
  }

  /* ---------------- copy email ---------------- */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); }
    catch { location.href = "mailto:" + b.dataset.copy; return; }
    b.classList.add("is-done"); setTimeout(() => b.classList.remove("is-done"), 2200);
  }));

  /* ---------------- terminal ---------------- */
  const termBody = $("#termBody"), termForm = $("#termForm"), termInput = $("#termInput");
  if (!termBody) return;
  const history = []; let hIdx = -1;
  const link = (href, label) => `<a href="${href}" target="_blank" rel="noopener">${label || href}</a>`;
  const commands = {
    help: () => [
      "Available commands:",
      "  about        who I am",
      "  focus        what I want to work on",
      "  skills       what I work with",
      "  experience   where I have worked",
      "  projects     things I have shipped",
      "  sharedeal    the company I built",
      "  contact      how to reach me",
      "  open &lt;name&gt;  linkedin | github | sharedeal | resume | ide",
      "  clear        wipe the screen",
    ],
    whoami: () => ["omer arafat"],
    about: () => [
      "Md Omer Arafat. Engineer, CTO and product builder, Dhaka.",
      "ERP and AI Product Architect at RemoteIntegrity (remote, US).",
      "Co-Founder and CTO of ShareDeal, a team-buying platform.",
      "Led a 22-person IAM delivery at Allianz Australia (AU, NZ, MY).",
      "Eight years across ERP, identity, marketplaces and automation.",
    ],
    focus: () => [
      "1  AI-native product building with Claude Code",
      "2  AI and LLM integration on a company's own data",
      "3  Business automation (Xero and SAP, workflow tools)",
      "4  ERP modernisation",
      "5  Cyber security and IAM",
      "6  Product and technical leadership",
    ],
    skills: () => [
      "Mobile     Flutter, Dart",
      "Frontend   Angular, TypeScript, HTML, CSS",
      "Backend    Laravel, PHP, Node.js, NestJS, .NET",
      "Data       MySQL, MariaDB, Redis, CouchDB, PouchDB",
      "Cloud      AWS (EC2, RDS, SSM), Cloudflare, MediaMTX",
      "Identity   One Identity Manager, SailPoint, Active Directory, LDAP, RBAC",
      "Testing    Cypress, Patrol, ~7,000 backend tests",
      "AI         Claude Code, local LLMs, vector search, RAG",
    ],
    experience: () => [
      "2026-now   RemoteIntegrity            ERP and AI Product Architect",
      "2024-2026  Allianz Australia          Technical Project Manager, IAM",
      "2024-2026  K53 Technology Solution    Project Manager and IAM Lead",
      "2022-now   ShareDeal                  Co-Founder and CTO",
      "2022-2024  Schertech / SCT Bangla     Senior Software Engineer",
      "2021-2022  Mind Orbital Technologies  Full Stack Developer",
      "2021-2022  ICT Division, Govt of BD   Mobile App Trainer",
      "2019-2020  BDSTALL.COM                Software Engineer (Tech Lead)",
      "2018-2019  Retail Technologies Ltd    Junior Programmer",
    ],
    projects: () => [
      "ShareDeal      team buying: apps, web shop, admin portal   " + link("https://sharedealnow.com", "sharedealnow.com"),
      "Allianz portal access to ~1,400 apps for 80,000+ employees",
      "Schertech MES  shop floor, IoT and 14 ERP modules",
      "Hishabpati     offline-first ledger, 100K+ installs        " + link("https://hishabpati.com", "hishabpati.com"),
      "BDSTALL        marketplace app, 100K+ installs",
      "Netverk        Xero and SAP kept in sync",
      "Ziksu          Flutter QR payments app",
    ],
    sharedeal: () => [
      "Built every department: tech, ops, buying, marketing, sales, support, finance.",
      "Home page 0.23 s to 0.045 s. Lighthouse mobile 72 to 92.",
      "Security audit, 7-phase pen-test programme, WAF, encrypted personal data.",
      "Group-buy engine with 11 switchable rules.",
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
        ide: "https://arafatomer66.github.io/portfolio-ide/",
      };
      if (!map[arg]) return { err: true, lines: [`open: unknown target "${(arg || "").replace(/</g, "&lt;")}". Try: ${Object.keys(map).join(" | ")}`] };
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
    if (Array.isArray(out)) print(out); else print(out.lines, out.err ? "err" : "");
  };
  print(["Welcome to Omer's portfolio shell.", "Type <b>help</b> to see what you can do."], "accent");
  termForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = termInput.value;
    if (v.trim()) { history.unshift(v); hIdx = -1; }
    run(v); termInput.value = "";
  });
  termInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx < history.length - 1) termInput.value = history[++hIdx]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.max(-1, hIdx - 1); termInput.value = hIdx === -1 ? "" : history[hIdx]; }
    else if (e.key === "Tab") {
      const v = termInput.value.toLowerCase();
      if (!v) return; // let Tab move focus when the input is empty
      e.preventDefault();
      const m = Object.keys(commands).filter((c) => c.startsWith(v) && c !== "sudo");
      if (m.length === 1) termInput.value = m[0] + (m[0] === "open" ? " " : "");
      else if (m.length > 1) print([m.join("  ")]);
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); commands.clear(); }
  });
  $(".terminal").addEventListener("click", (e) => { if (!e.target.closest("a")) termInput.focus({ preventScroll: true }); });
})();
