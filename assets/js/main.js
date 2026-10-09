(function () {
  "use strict";
  const D = window.PORTFOLIO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IDS = D.projects.map((p) => p.id);
  const NAMES = Object.fromEntries(D.projects.map((p) => [p.id, p.name]));

  /* ------------------------------------------------------------ fragments */
  // Screens with made-up numbers carry a flag in the browser bar; wide
  // captures (with a bg colour) are fitted whole instead of cropped.
  const flagHTML = (s) => (s.flag ? `<span class="frame-flag${s.tone ? " " + s.tone : ""}" title="${esc(s.tip || s.flag)}">${esc(s.flag)}</span>` : "");
  const imgFit = (s) => (s.bg ? ` style="background:${s.bg}"` : "");
  // a screen is either a screenshot or the live signal tape (replay.js)
  const viewHTML = (p, s, on, lazy) => s.kind === "tape"
    ? `<div class="fv tape${on ? " on" : ""}" data-tape></div>`
    : `<img src="${s.src}" alt="${esc(p.name + ": " + s.title)}" ${lazy ? 'loading="lazy"' : ""} decoding="async" class="${["fv", on ? "on" : "", s.bg ? "fit" : ""].join(" ").trim()}"${imgFit(s)} width="1440" height="900">`;
  function frameHTML(p, withTabs) {
    const s0 = p.screens[0];
    return `<div class="frame" data-screens="${p.id}">
      <div class="frame-bar"><div class="frame-dots"><i></i><i></i><i></i></div><div class="frame-url" data-url><b>${esc(s0.url)}</b></div><span data-flag>${flagHTML(s0)}</span></div>
      <div class="frame-view${s0.kind === "tape" ? " tall" : ""}">${p.screens.map((s, i) => viewHTML(p, s, !i, !!i)).join("")}</div>
      ${withTabs ? `<div class="tabs" role="tablist" aria-label="${esc(p.name)} screens">${p.screens.map((s, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="n">${pad(i + 1)}</span>${esc(s.tab)}</button>`).join("")}</div>` : ""}
    </div>`;
  }
  function howHTML(p, big) {
    return `<div class="how">
      ${big ? "" : `<div class="how-head"><span class="label">How it works</span><span class="label">Live line-art of the real mechanism</span></div>`}
      <div class="how-stage"><canvas data-scene="${p.id}" aria-label="${esc(p.name)} mechanism animation" role="img"></canvas><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i></div>
      <ol class="steps">${p.how.map((s, i) => `<li class="${i ? "" : "on"}"><span class="k">${pad(i + 1)} · ${esc(s.k)}</span><h4>${esc(s.h)}</h4><p>${esc(s.p)}</p></li>`).join("")}</ol>
    </div>`;
  }
  function metaHTML(p, i) {
    return `<div class="ch-meta"><span class="label"><b>${pad(i + 1)}</b> — L${i + 1} · ${esc(p.layer)} · ${esc(p.year)}</span><span class="label status">${esc(p.status)}</span></div>`;
  }

  /* ------------------------------------------------------------ home */
  $("#chapters").innerHTML = D.projects.map((p, i) => `
    <article class="chapter" id="ch-${p.id}" style="--acc: var(--${p.id})">
      <div class="wrap">
        ${metaHTML(p, i)}
        <h3 class="ch-name rv">${esc(p.name)}<span class="sq"></span></h3>
        <div class="ch-grid">
          <div>
            <p class="ch-pitch">${esc(p.pitch)}</p>
            <ul class="ch-points">${p.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <div class="chips">${p.stack.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>
            <div class="ch-actions"><a class="btn acc" href="#${p.id}">Case study <span class="arr">→</span></a><a class="btn ghost" href="${p.repo}" target="_blank" rel="noopener">Code <span class="arr">↗</span></a></div>
            <a class="act" data-activity="${p.id}" target="_blank" rel="noopener" hidden></a>
          </div>
          <div class="rv">
            ${frameHTML(p, true)}
            <div class="cap" data-cap><span>${esc(p.screens[0].cap)}</span><span class="note">${esc(p.screens[0].note)}</span></div>
          </div>
        </div>
        ${howHTML(p, false)}
      </div>
    </article>`).join("");

  $("#stack-grid").innerHTML = D.stack.map((g) => `
    <div class="stack-col rv"><span class="label">${esc(g.group)}</span>
      ${g.items.map((it) => `<div class="stack-item"><h4>${esc(it.h)}</h4><p>${esc(it.p)}</p><div class="used">${it.used.map((u) => `<i style="--c: var(--${u})">${esc(NAMES[u])}</i>`).join("")}</div></div>`).join("")}
    </div>`).join("");

  const mq = D.marquee.map((w, i) => `<span class="${i % 3 === 1 ? "f" : ""}">${esc(w)}</span><b></b>`).join("");
  $("#marquee").innerHTML = mq + mq;
  const tk = D.ticker.map((w) => `<span>${esc(w)}<i>▲</i></span>`).join("");
  $("#ticker").innerHTML = tk + tk;

  $("#journey-list").innerHTML = D.journey.map((j, i) => {
    const box = j.repo
      ? `<a class="commit" href="https://github.com/Adhi-opp/${j.repo}/commit/${j.commit[0]}" target="_blank" rel="noopener" style="--c:${j.c};text-decoration:none;display:block"><span class="h">commit ${esc(j.commit[0])}</span><br><span class="m">${esc(j.commit[1])}</span><br><span class="d">${esc(j.commit[2])} · ${esc(j.repo)} ↗</span></a>`
      : `<div class="commit" style="--c:${j.c}"><span class="h">${esc(j.commit[0])}</span><br><span class="m">${esc(j.commit[1])}</span><br><span class="d">${esc(j.commit[2])}</span></div>`;
    return `<div class="jr" style="--c:${j.c}"><div class="jr-n">${pad(i + 1)}</div><div><div class="jr-when">${esc(j.when)}</div><h3 class="rv">${esc(j.h)}</h3><p class="where">${esc(j.where)}</p><p>${esc(j.p)}</p></div>${box}</div>`;
  }).join("");

  /* ------------------------------------------------------------ case study */
  const caseEl = $("#case");
  function renderCase(id) {
    const i = IDS.indexOf(id), p = D.projects[i], c = p.cs, nx = D.projects[(i + 1) % D.projects.length];
    caseEl.style.setProperty("--acc", `var(--${p.id})`);
    caseEl.innerHTML = `
      <section class="cs-hero"><div class="wrap">
        <a class="back" href="#ch-${p.id}">← All work</a>
        <div style="margin-top:28px">${metaHTML(p, i)}</div>
        <h1 class="cs-name">${esc(p.name)}<span class="sq"></span></h1>
        <div class="cs-lede"><p>${esc(c.lede)}</p><dl class="facts">${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></div>
        <div class="ch-actions"><a class="btn acc" href="${p.repo}" target="_blank" rel="noopener">View the code <span class="arr">↗</span></a><button class="btn ghost" type="button" data-jump="cs-screens">See the screens <span class="arr">↓</span></button></div>
        <a class="act" data-activity="${p.id}" target="_blank" rel="noopener" hidden></a>
      </div></section>

      <section class="cs-sec"><div class="wrap">
        <div class="cs-sec-head"><span class="label"><b>01</b> — The problem</span><h2>Why it exists</h2></div>
        <div class="prose">${c.problem.map((x) => `<p>${x}</p>`).join("")}</div>
      </div></section>

      <section class="cs-sec" id="cs-screens"><div class="wrap">
        <div class="cs-sec-head"><span class="label"><b>02</b> — What you see</span><h2>The screens</h2></div>
        ${p.screens.map((s, k) => `<div class="shot">
          <div class="frame"><div class="frame-bar"><div class="frame-dots"><i></i><i></i><i></i></div><div class="frame-url"><b>${esc(s.url)}</b></div>${flagHTML(s)}</div><div class="frame-view${s.kind === "tape" ? " tall" : ""}">${viewHTML(p, s, true, true)}</div></div>
          <div><span class="label"><b>${pad(k + 1)}</b> — Screen</span><h3>${esc(s.title)}</h3><p>${esc(s.cap)}</p><span class="note">${esc(s.note)}</span></div>
        </div>`).join("")}
      </div></section>

      <section class="cs-sec"><div class="wrap">
        <div class="cs-sec-head"><span class="label"><b>03</b> — How it works</span><h2>The mechanism</h2></div>
        ${howHTML(p, true)}
      </div></section>

      <section class="cs-sec"><div class="wrap">
        <div class="cs-sec-head"><span class="label"><b>04</b> — Under the hood</span><h2>Decisions</h2></div>
        <div class="decs">${c.decisions.map((d) => `<div class="dec"><span class="label">${esc(d.k)}</span><h4>${esc(d.h)}</h4><p>${d.p}</p></div>`).join("")}</div>
      </div></section>

      <section class="cs-sec"><div class="wrap">
        <div class="cs-sec-head"><span class="label"><b>05</b> — What broke</span><h2>Post-mortems</h2></div>
        ${c.broke.map((b) => `<div class="pm"><span class="label">${esc(b.when)}</span><div><h3>${esc(b.h)}</h3><dl><dt>Symptom</dt><dd>${esc(b.s)}</dd><dt>Cause</dt><dd>${esc(b.c)}</dd><dt>Fix</dt><dd>${esc(b.f)}</dd></dl></div></div>`).join("")}
      </div></section>

      <a class="next wrap" href="#${nx.id}" style="--acc: var(--${nx.id})"><span class="label">Next project · ${esc(nx.layer)}</span><span class="nm">${esc(nx.name)}<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>`;
    wireReveal(caseEl);
    window.SignalTape.mount(caseEl);
    paintActivity(caseEl);
  }

  /* ------------------------------------------------------------ router */
  const homeEl = $('[data-view="home"]');
  let view = null;
  function route(initial) {
    let h = location.hash.slice(1);
    try { h = decodeURIComponent(h); } catch (err) {} // a malformed link just lands on home
    if (IDS.includes(h)) {
      renderCase(h);
      homeEl.hidden = true; caseEl.hidden = false;
      caseEl.classList.remove("view"); void caseEl.offsetWidth; caseEl.classList.add("view");
      window.scrollTo(0, 0);
      document.title = `${NAMES[h]} · Adhiraj Singh`;
      window.Scenes.unmountDetached(); window.Scenes.mount(caseEl); window.Scenes.refresh();
      view = h;
    } else {
      if (view !== "home") {
        caseEl.hidden = true; caseEl.innerHTML = ""; homeEl.hidden = false;
        if (view) { homeEl.classList.remove("view"); void homeEl.offsetWidth; homeEl.classList.add("view"); }
        document.title = "Adhiraj Singh";
        window.Scenes.unmountDetached(); window.Scenes.refresh();
        view = "home";
      }
      const target = h && document.getElementById(h);
      if (target) requestAnimationFrame(() => target.scrollIntoView({ behavior: initial || REDUCED ? "auto" : "smooth", block: "start" }));
      else if (!h && !initial) window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
    }
    updateHead();
  }
  window.addEventListener("hashchange", () => route(false));

  /* ------------------------------------------------------------ screen tabs */
  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tabs [role=tab]");
    if (tab) {
      const frame = tab.closest(".frame"), p = D.projects.find((x) => x.id === frame.dataset.screens), i = +tab.dataset.i, s = p.screens[i];
      $$("[role=tab]", frame).forEach((b) => b.setAttribute("aria-selected", String(b === tab)));
      $$(".frame-view > .fv", frame).forEach((v, k) => v.classList.toggle("on", k === i));
      $(".frame-view", frame).classList.toggle("tall", s.kind === "tape");
      const tapeEl = s.kind === "tape" && $(".frame-view > .fv.on", frame);
      $("[data-url]", frame).innerHTML = `<b>${esc((tapeEl && tapeEl.dataset.url) || s.url)}</b>`;
      if (tapeEl) window.SignalTape.refresh();
      $("[data-flag]", frame).innerHTML = flagHTML(s);
      const cap = frame.parentElement.querySelector("[data-cap]");
      if (cap) cap.innerHTML = `<span>${esc(s.cap)}</span><span class="note">${esc(s.note)}</span>`;
      return;
    }
    const jump = e.target.closest("[data-jump]");
    if (jump) { const t = document.getElementById(jump.dataset.jump); if (t) t.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" }); return; }
    const copy = e.target.closest("[data-copy-email]");
    if (copy) {
      const text = EMAIL, label = copy.textContent;
      const done = (msg) => { copy.textContent = msg; setTimeout(() => (copy.textContent = label), 1600); };
      try { navigator.clipboard.writeText(text).then(() => done("Copied"), () => done(text)); } catch (err) { done(text); }
    }
  });
  document.addEventListener("keydown", (e) => {
    const tab = e.target.closest && e.target.closest(".tabs [role=tab]");
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    const all = $$("[role=tab]", tab.parentElement), i = all.indexOf(tab), n = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
    n.focus(); n.click(); e.preventDefault();
  });

  /* ------------------------------------------------------------ reveal (transform only) */
  const rio = "IntersectionObserver" in window && !REDUCED ? new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove("pre"); rio.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" }) : null;
  function wireReveal(root) {
    if (!rio) return;
    $$(".rv", root).forEach((el) => { if (el.getBoundingClientRect().top > window.innerHeight * 0.95) { el.classList.add("pre"); rio.observe(el); } });
  }

  /* ------------------------------------------------------------ header, progress, active nav */
  const head = $("#head"), bar = $("#progress");
  function updateHead() {
    const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    head.classList.toggle("compact", y > 260);
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (view === "home") {
      let cur = null;
      ["work", "stack", "journey", "contact"].forEach((id) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id; });
      $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.sec === cur));
    } else $$(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.sec === "work"));
  }
  let ticking = false;
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { updateHead(); ticking = false; }); } }, { passive: true });

  /* ------------------------------------------------------------ IST clock + NSE session */
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  function tickClock() {
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
    const hh = +parts.hour % 24, mm = +parts.minute, mins = hh * 60 + mm, wk = !["Sat", "Sun"].includes(parts.weekday);
    const t = `${pad(hh)}:${parts.minute}:${parts.second}`;
    const open = wk && mins >= 555 && mins < 930;
    const mkt = $("#mkt");
    mkt.classList.toggle("open", open);
    $("#mkt-txt").textContent = open ? `NSE hours · ${t} IST` : `After hours · ${pad(hh)}:${parts.minute} IST`;
  }
  tickClock(); setInterval(tickClock, 1000);

  /* ------------------------------------------------------------ latest commit per project */
  // assets/data/activity.json is written by the deploy workflow every 6 hours
  // (.github/scripts/activity.mjs). If it is missing, the slots stay hidden.
  let activity = null;
  function actHTML(a) {
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
    const d = new Date(a.date), days = Math.round((day(new Date()) - day(d)) / 864e5), fresh = days <= 14;
    const when = !fresh ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
    return `<span class="act-k"><i class="${fresh ? "live" : ""}"></i>Last commit · ${when}</span><span class="act-m">${esc(a.message)}</span><span class="act-s">${esc(a.repo)} · ${esc(a.sha)}${a.last30 ? ` · ${a.last30} commits in the last 30 days` : ""} ↗</span>`;
  }
  function paintActivity(root) {
    if (!activity) return;
    $$("[data-activity]", root).forEach((el) => {
      const a = activity.projects[el.dataset.activity];
      if (!a || !/^https:\/\/github\.com\//.test(a.url)) return; // these links only ever go to GitHub
      el.href = a.url; el.innerHTML = actHTML(a); el.hidden = false;
    });
  }
  fetch("assets/data/activity.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d && d.projects) { activity = d; paintActivity(document); } })
    .catch(() => {});

  /* ------------------------------------------------------------ email (assembled, not in the HTML) */
  const EMAIL = ["adhiraj1904", "gmail.com"].join("@");
  $$("[data-mailto]").forEach((a) => { a.href = "mailto:" + EMAIL; a.textContent = EMAIL; });

  /* ------------------------------------------------------------ boot */
  window.Scenes.mount(document);
  window.SignalTape.mount(document);
  wireReveal(document);
  route(true);
})();
