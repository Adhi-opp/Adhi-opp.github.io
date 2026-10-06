// Real GammaLeak sessions replayed from the engine's own logs: 1-minute bars
// (price, VWAP, z-score, CVD, verdict) and its actual ALERT / CONFIRM / EXIT /
// ABORT events. Built by tools/replay/extract.py; raw ticks are never published.
//   GLReplay   loads and caches session files (also feeds the hero tape)
//   SignalTape draws the interactive full-day chart in the GammaLeak frame
(function () {
  "use strict";

  const BASE = "assets/data/gammaleak/";
  const SESSIONS = ["2026-05-29_NIFTY_FUT.json", "2026-06-11_NIFTY_FUT.json", "2026-05-22_NIFTY_FUT.json"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = '"Geist Mono", ui-monospace, Consolas, monospace';

  /* ------------------------------------------------------------ data */
  const cache = {}, pending = {};
  function load(file) {
    if (cache[file]) return Promise.resolve(cache[file]);
    if (!pending[file]) {
      pending[file] = fetch(BASE + file)
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then((raw) => (cache[file] = parse(raw, file)));
    }
    return pending[file];
  }
  function parse(d, file) {
    const bars = d.bars.map((b) => ({ m: b[0], o: b[1], h: b[2], l: b[3], c: b[4], vwap: b[5], z: b[6], cvd: b[7], vd: d.verdicts[b[8]], n: b[9] }));
    // An episode is one alert's life: ALERT -> CONFIRM -> EXIT, or ALERT -> ABORT.
    const eps = []; let cur = null;
    d.events.forEach((e) => {
      if (e.type === "ALERT") {
        if (cur) { cur.end = e.m; eps.push(cur); }
        cur = { start: e.m, side: e.side, confirm: null, end: null, outcome: "open", setup: "" };
      } else if (cur && e.type === "CONFIRM") { cur.confirm = e.m; cur.setup = e.setup; }
      else if (cur && (e.type === "EXIT" || e.type === "ABORT")) {
        cur.end = e.m; cur.outcome = e.type === "EXIT" ? "exit" : "abort";
        if (!cur.setup) cur.setup = e.setup;
        eps.push(cur); cur = null;
      }
    });
    if (cur) { cur.end = bars[bars.length - 1].m; eps.push(cur); }
    const counts = {};
    d.events.forEach((e) => (counts[e.type] = (counts[e.type] || 0) + 1));
    const [y, mo, dd] = d.date.split("-");
    return Object.assign({}, d, {
      file, bars, eps, counts,
      day: `${+dd} ${MONTHS[+mo - 1]} ${y}`,
      name: d.symbol.replace("_", " "),
      chg: (bars[bars.length - 1].c / bars[0].o - 1) * 100,
    });
  }
  window.GLReplay = { SESSIONS, load, peek: (f) => cache[f] || null };

  /* ------------------------------------------------------------ helpers */
  const fmtPx = (v) => v.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtK = (v) => (v >= 0 ? "+" : "−") + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(1) + "K" : String(Math.abs(Math.round(v))));
  const fmtZ = (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
  const hhmm = (m) => { const t = 9 * 60 + 15 + m; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const css = (el, name, fb) => getComputedStyle(el).getPropertyValue(name).trim() || fb;
  function text(ctx, s, x, y, color, o = {}) {
    ctx.font = `${o.weight || 400} ${o.size || 10}px ${MONO}`;
    ctx.fillStyle = color; ctx.textAlign = o.align || "left"; ctx.textBaseline = o.base || "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = (o.ls != null ? o.ls : 1) + "px";
    ctx.fillText(s, x, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }
  // event glyphs: shape carries the meaning as well as colour
  function glyph(ctx, type, x, y, col, bg) {
    ctx.lineWidth = 1.6; ctx.setLineDash([]);
    if (type === "ALERT") { ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.3); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = col.alert; ctx.stroke(); }
    else if (type === "CONFIRM") { ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 6.3); ctx.fillStyle = col.confirm; ctx.fill(); ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.stroke(); }
    else if (type === "EXIT") { ctx.fillStyle = bg; ctx.fillRect(x - 5, y - 5, 10, 10); ctx.fillStyle = col.exit; ctx.fillRect(x - 3.5, y - 3.5, 7, 7); }
    else if (type === "ABORT") { ctx.strokeStyle = bg; ctx.lineWidth = 4; xmark(); ctx.strokeStyle = col.abort; ctx.lineWidth = 1.8; xmark(); }
    function xmark() { ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke(); }
  }
  window.GLReplay.glyph = glyph;
  window.GLReplay.fmt = { px: fmtPx, k: fmtK, z: fmtZ, hhmm };

  /* ------------------------------------------------------------ signal tape */
  function Tape(el) {
    this.el = el; this.file = SESSIONS[0]; this.d = null; this.hover = null; this.reveal = REDUCED ? 1 : 0;
    el.innerHTML = `
      <div class="tape-top">
        <div class="tape-chips" role="group" aria-label="Session">${SESSIONS.map((f, i) => `<button type="button" data-f="${f}" aria-pressed="${i === 0}">${esc(f.slice(8, 10) + " " + MONTHS[+f.slice(5, 7) - 1])}<i></i></button>`).join("")}</div>
        <div class="tape-r1"></div>
      </div>
      <div class="tape-r2"></div>
      <canvas role="img" aria-label="GammaLeak signal tape: price against VWAP, the engine's alerts, confirmations, exits and aborts, z-score and cumulative volume delta for one real session"></canvas>
      <div class="tape-legend" aria-hidden="true"><span class="lg-alert">Alert</span><span class="lg-confirm">Confirm</span><span class="lg-exit">Exit</span><span class="lg-abort">Abort</span><span class="lg-vwap">VWAP</span></div>`;
    this.cv = el.querySelector("canvas"); this.r1 = el.querySelector(".tape-r1"); this.r2 = el.querySelector(".tape-r2");
    el.querySelector(".tape-chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) this.show(b.dataset.f); });
    const move = (e) => { const r = this.cv.getBoundingClientRect(); this.pointer(e.clientX - r.left); };
    this.cv.addEventListener("pointermove", move);
    this.cv.addEventListener("pointerdown", move);
    this.cv.addEventListener("pointerleave", () => { this.hover = null; this.draw(); this.readout(); });
    SESSIONS.forEach((f) => load(f).then((d) => this.chip(f, d)).catch(() => {}));
    this.show(this.file);
  }
  Tape.prototype.chip = function (f, d) {
    const i = this.el.querySelector(`[data-f="${f}"] i`);
    if (i) { i.textContent = (d.chg >= 0 ? "+" : "−") + Math.abs(d.chg).toFixed(2) + "%"; i.className = d.chg >= 0 ? "up" : "dn"; }
  };
  Tape.prototype.show = function (f) {
    this.file = f;
    this.el.querySelectorAll(".tape-chips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === f)));
    load(f).then((d) => {
      this.d = d; this.hover = null; this.size(); this.readout();
      const url = this.el.closest(".frame") && this.el.closest(".frame").querySelector("[data-url]");
      if (url && this.el.classList.contains("on")) url.innerHTML = `<b>replay · logs/${esc(d.date)}/${esc(d.symbol)}.csv</b>`;
      this.el.dataset.url = `replay · logs/${d.date}/${d.symbol}.csv`;
      this.draw(); this.maybePlay();
    }).catch(() => { this.r2.textContent = "Replay data could not be loaded."; });
  };
  Tape.prototype.size = function () {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.cv.width = Math.max(1, Math.round(r.width * dpr)); this.cv.height = Math.max(1, Math.round(r.height * dpr));
    this.ctx = this.cv.getContext("2d"); this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  Tape.prototype.layout = function () {
    const w = this.w, h = this.h, narrow = w < 520;
    const L = 8, R = narrow ? 50 : 66, T = 16, B = 20, gap = 14;
    const lane = 16, ph = h - T - B - lane - gap * 3;
    const price = ph * 0.56, z = ph * 0.25, cvd = ph * 0.19;
    const y0 = T, y1 = y0 + price, yl = y1 + gap, yz = yl + lane + gap, yc = yz + z + gap;
    return { L, R, x0: L, x1: w - R, narrow, P: [y0, y1], LN: [yl, yl + lane], Z: [yz, yz + z], C: [yc, yc + cvd] };
  };
  Tape.prototype.pointer = function (px) {
    if (!this.d) return;
    const g = this.layout(), m = Math.round(((px - g.x0) / (g.x1 - g.x0)) * 374);
    let best = null;
    this.d.bars.forEach((b) => { if (!best || Math.abs(b.m - m) < Math.abs(best.m - m)) best = b; });
    if (best && (!this.hover || this.hover.m !== best.m)) { this.hover = best; this.draw(); this.readout(); }
  };
  Tape.prototype.readout = function () {
    const d = this.d; if (!d) return;
    const c = d.counts;
    if (!this.hover) {
      this.r1.innerHTML = `${esc(d.day)} · ${esc(d.name)}`;
      const open = d.eps.filter((e) => e.outcome === "open").length;
      this.r2.innerHTML = `<span class="lead">${esc(d.day)} · </span>${c.ALERT || 0} alerts · ${c.CONFIRM || 0} confirmed · ${c.ABORT || 0} aborted${open ? ` · ${open} open at close` : ""} · ${(d.ticks / 1000).toFixed(1)}K ticks · hover to read the engine`;
      return;
    }
    const b = this.hover, ev = d.events.filter((e) => Math.abs(e.m - b.m) <= 1);
    this.r1.innerHTML = `${hhmm(b.m)} IST · ${fmtPx(b.c)}`;
    this.r2.innerHTML = `<span class="lead">${hhmm(b.m)} · ${fmtPx(b.c)} · </span>VWAP ${fmtPx(b.vwap)} · z ${fmtZ(b.z)} · CVD ${fmtK(b.cvd)} · <span class="vd">${esc(b.vd || "—")}</span>` +
      ev.map((e) => ` · <span class="ev-${e.type.toLowerCase()}">${e.type}${e.setup ? " " + esc(e.setup.replace(/_/g, " ")) : ""}</span>`).join("");
  };
  Tape.prototype.draw = function () {
    const d = this.d; if (!d || !this.ctx) return;
    const ctx = this.ctx, w = this.w, h = this.h, g = this.layout();
    const ink = css(document.documentElement, "--ink", "#f2f2ee"), bg = "#0b0c0e";
    const col = { alert: css(this.el, "--acc", "#2fd6f0"), confirm: css(document.documentElement, "--up", "#3ddc84"), abort: css(document.documentElement, "--down", "#ff5a5f"), exit: "rgba(242,242,238,.62)" };
    const dim = "rgba(242,242,238,.45)", faint = "rgba(242,242,238,.12)";
    ctx.clearRect(0, 0, w, h);
    const X = (m) => g.x0 + (m / 374) * (g.x1 - g.x0);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, g.x0 + (g.x1 - g.x0) * this.reveal + (this.reveal >= 1 ? g.R : 0), h); ctx.clip();

    // ---- price vs VWAP
    let lo = Infinity, hi = -Infinity;
    d.bars.forEach((b) => { lo = Math.min(lo, b.l, b.vwap); hi = Math.max(hi, b.h, b.vwap); });
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const Y = (p) => g.P[0] + (1 - (p - lo) / (hi - lo)) * (g.P[1] - g.P[0]);
    for (let i = 0; i <= 3; i++) {
      const p = lo + ((hi - lo) * (i + 0.5)) / 4, y = Math.round(Y(p)) + 0.5;
      ctx.strokeStyle = faint; ctx.lineWidth = 1; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, Math.round(p).toLocaleString("en-IN"), g.x1 + 8, y + 3, dim, { size: 9.5, ls: 0.4 });
    }
    // stretch shading between close and VWAP
    for (let i = 1; i < d.bars.length; i++) {
      const a = d.bars[i - 1], b = d.bars[i];
      if (b.m - a.m > 3) continue;
      ctx.fillStyle = b.c >= b.vwap ? "rgba(61,220,132,.07)" : "rgba(255,90,95,.07)";
      ctx.beginPath(); ctx.moveTo(X(a.m), Y(a.c)); ctx.lineTo(X(b.m), Y(b.c)); ctx.lineTo(X(b.m), Y(b.vwap)); ctx.lineTo(X(a.m), Y(a.vwap)); ctx.closePath(); ctx.fill();
    }
    path(ctx, d.bars, (b) => X(b.m), (b) => Y(b.vwap), "rgba(242,242,238,.5)", 1.2, [5, 4]);
    path(ctx, d.bars, (b) => X(b.m), (b) => Y(b.c), ink, 1.5);
    text(ctx, "PRICE · VWAP", g.x0, g.P[0] - 5, dim, { size: 9, ls: 1.4 });

    // ---- signals lane: each alert's life
    const lm = (g.LN[0] + g.LN[1]) / 2;
    ctx.strokeStyle = faint; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x0, lm + 0.5); ctx.lineTo(g.x1, lm + 0.5); ctx.stroke();
    d.eps.forEach((e) => {
      const xa = X(e.start), xc = e.confirm != null ? X(e.confirm) : null, xe = X(e.end);
      ctx.strokeStyle = col.alert; ctx.lineWidth = 2; ctx.setLineDash(e.outcome === "open" ? [4, 4] : []);
      ctx.beginPath(); ctx.moveTo(xa, lm); ctx.lineTo(xc != null ? xc : xe, lm); ctx.stroke(); ctx.setLineDash([]);
      if (xc != null) { ctx.fillStyle = col.confirm; ctx.fillRect(xc, lm - 3, Math.max(2, xe - xc), 6); }
    });
    text(ctx, "SIGNALS", g.x1 + 8, lm + 3, dim, g.narrow ? { size: 8.5, ls: 0.3 } : { size: 9, ls: 1.4 });

    // ---- events on the price line
    d.events.forEach((e) => { if (e.type !== "STATE_CHANGE") glyph(ctx, e.type, X(e.m), Y(e.px), col, bg); });

    // ---- z: stretch from VWAP (engine caps it at ±10)
    const ZY = (z) => g.Z[0] + (1 - (Math.max(-10, Math.min(10, z)) + 10) / 20) * (g.Z[1] - g.Z[0]);
    ctx.fillStyle = "rgba(47,214,240,.06)";
    ctx.fillRect(g.x0, g.Z[0], g.x1 - g.x0, ZY(3) - g.Z[0]);
    ctx.fillRect(g.x0, ZY(-3), g.x1 - g.x0, g.Z[1] - ZY(-3));
    [[3, "+3 ALERT"], [-3, "−3 ALERT"], [0, ""]].forEach(([v, s]) => {
      const y = Math.round(ZY(v)) + 0.5;
      ctx.strokeStyle = v ? "rgba(47,214,240,.45)" : faint; ctx.setLineDash(v ? [3, 3] : []); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); ctx.setLineDash([]);
      text(ctx, g.narrow && v ? (v > 0 ? "+3" : "−3") : s, g.x1 + 8, y + 3, dim, { size: 9, ls: 0.6 });
    });
    path(ctx, d.bars, (b) => X(b.m), (b) => ZY(b.z), "rgba(242,242,238,.8)", 1.2);
    text(ctx, "Z · STRETCH FROM VWAP", g.x0, g.Z[0] - 5, dim, { size: 9, ls: 1.4 });

    // ---- CVD: buyer- minus seller-initiated volume
    let cl = 0, ch = 0;
    d.bars.forEach((b) => { cl = Math.min(cl, b.cvd); ch = Math.max(ch, b.cvd); });
    const cp = (ch - cl) * 0.1 || 1; cl -= cp; ch += cp;
    const CY = (v) => g.C[0] + (1 - (v - cl) / (ch - cl)) * (g.C[1] - g.C[0]);
    const zy = Math.round(CY(0)) + 0.5;
    ctx.strokeStyle = faint; ctx.beginPath(); ctx.moveTo(g.x0, zy); ctx.lineTo(g.x1, zy); ctx.stroke();
    text(ctx, fmtK(ch - cp), g.x1 + 8, g.C[0] + 8, dim, { size: 9, ls: 0.4 });
    text(ctx, "0", g.x1 + 8, zy + 3, dim, { size: 9, ls: 0.4 });
    path(ctx, d.bars, (b) => X(b.m), (b) => CY(b.cvd), "rgba(242,242,238,.8)", 1.2);
    text(ctx, "CVD · BUYS − SELLS", g.x0, g.C[0] - 5, dim, { size: 9, ls: 1.4 });

    // ---- time axis
    const ticks = g.narrow ? [0, 105, 225, 345] : [0, 45, 105, 165, 225, 285, 345, 374];
    ticks.forEach((m) => text(ctx, hhmm(m), X(m), h - 5, dim, { size: 9, align: m === 0 ? "left" : m === 374 ? "right" : "center", ls: 0.6 }));
    ctx.restore();

    // ---- hover crosshair
    if (this.hover) {
      const b = this.hover, x = Math.round(X(b.m)) + 0.5;
      ctx.strokeStyle = "rgba(242,242,238,.5)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, g.P[0]); ctx.lineTo(x, g.C[1]); ctx.stroke(); ctx.setLineDash([]);
      [[Y(b.c)], [ZY(b.z)], [CY(b.cvd)]].forEach(([y]) => { ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.3); ctx.fillStyle = ink; ctx.fill(); ctx.strokeStyle = bg; ctx.lineWidth = 2; ctx.stroke(); });
    }
  };
  function path(ctx, bars, fx, fy, color, wdt, dash) {
    ctx.beginPath(); let prev = null;
    bars.forEach((b) => { if (prev && b.m - prev.m <= 3) ctx.lineTo(fx(b), fy(b)); else ctx.moveTo(fx(b), fy(b)); prev = b; });
    ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.setLineDash(dash || []); ctx.lineJoin = "round"; ctx.stroke(); ctx.setLineDash([]);
  }
  Tape.prototype.play = function () {
    if (this.played || REDUCED) return; this.played = true;
    const t0 = performance.now(), step = (now) => { this.reveal = Math.min(1, (now - t0) / 1600); this.draw(); if (this.reveal < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  // animate the first reveal only when the tape is the visible tab and on screen
  Tape.prototype.maybePlay = function () {
    if (REDUCED || this.played || !this.d || !this.el.classList.contains("on")) return;
    const r = this.el.getBoundingClientRect();
    if (r.width && r.top < innerHeight * 0.8 && r.bottom > 0) this.play();
  };

  const tapes = [];
  const io = "IntersectionObserver" in window && !REDUCED ? new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting && e.target.__tape) e.target.__tape.maybePlay(); }), { threshold: 0.35 }) : null;
  function mount(root) {
    (root || document).querySelectorAll("[data-tape]").forEach((el) => {
      if (el.__tape) return;
      const t = new Tape(el); el.__tape = t; tapes.push(t);
      if (io) io.observe(el); else t.reveal = 1;
    });
  }
  function refresh() {
    tapes.forEach((t) => { if (document.body.contains(t.el)) { t.size(); t.draw(); t.maybePlay(); } });
  }
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refresh, 120); });
  window.SignalTape = { mount, refresh };

  // start loading the hero's first session right away
  load(SESSIONS[0]).catch(() => {});
})();
