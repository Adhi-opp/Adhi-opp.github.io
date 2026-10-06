// Line-art mechanism animations (Canvas 2D). One scene per project plus the
// hero tape. Scenes only run while on screen; reduced motion gets a still frame.
(function () {
  "use strict";

  const MONO = '"Geist Mono", ui-monospace, Consolas, monospace';
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const C = {
    ink: "#f2f2ee", ink2: "rgba(242,242,238,.66)", dim: "rgba(242,242,238,.42)", faint: "rgba(242,242,238,.13)",
    line: "rgba(242,242,238,.24)", up: "#3ddc84", down: "#ff5a5f", R: "#ef4136", Y: "#ffd43b", B: "#4a7dff",
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const prog = (ct, a, b) => clamp((ct - a) / (b - a), 0, 1);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function txt(ctx, s, x, y, o = {}) {
    ctx.font = `${o.weight || 400} ${o.size || 10}px ${MONO}`;
    ctx.fillStyle = o.color || C.dim;
    ctx.textAlign = o.align || "left";
    ctx.textBaseline = o.base || "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = (o.ls != null ? o.ls : 1.2) + "px";
    ctx.fillText(s, x, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }
  function line(ctx, x1, y1, x2, y2, color, w = 1, dash) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  }
  function rect(ctx, x, y, w, h, stroke, fill, lw = 1, dash) {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    if (stroke) { ctx.setLineDash(dash || []); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.setLineDash([]); }
  }
  function brackets(ctx, w, h, color, s = 10) {
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(.5, s); ctx.lineTo(.5, .5); ctx.lineTo(s, .5);
    ctx.moveTo(w - s, .5); ctx.lineTo(w - .5, .5); ctx.lineTo(w - .5, s);
    ctx.moveTo(w - .5, h - s); ctx.lineTo(w - .5, h - .5); ctx.lineTo(w - s, h - .5);
    ctx.moveTo(s, h - .5); ctx.lineTo(.5, h - .5); ctx.lineTo(.5, h - s);
    ctx.stroke();
  }
  // polyline drawn up to fraction p of its length
  function partial(ctx, pts, p, color, w = 1.2) {
    let total = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let left = total * clamp(p, 0, 1);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) {
      const f = Math.min(1, left / seg[i - 1]);
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f));
      left -= seg[i - 1];
    }
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function candle(ctx, x, cw, Y, b, color, hollow, hatch) {
    const up = b.c >= b.o;
    line(ctx, x, Y(b.h), x, Y(b.l), color, 1);
    const y1 = Y(Math.max(b.o, b.c)), y2 = Y(Math.min(b.o, b.c));
    const hgt = Math.max(1.5, y2 - y1);
    if (hatch) {
      rect(ctx, x - cw / 2, y1, cw, hgt, color, null, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(x - cw / 2, y1, cw, hgt); ctx.clip();
      for (let k = -hgt; k < cw + hgt; k += 4) line(ctx, x - cw / 2 + k, y1, x - cw / 2 + k + hgt, y1 + hgt, color, .8);
      ctx.restore();
    } else if (up && hollow) rect(ctx, x - cw / 2, y1, cw, hgt, color, "#060607", 1.1);
    else rect(ctx, x - cw / 2, y1, cw, hgt, null, color);
  }

  /* ================================================================ HERO: TAPE */
  const tape = {
    cycle: 0,
    init() {
      const r = rng(11), s = { r, p: 22488.4, drift: 0, bars: [], cur: null, ticks: [], bt: 0, acc: 0, n: 0, count: 0, open: 0 };
      s.cur = { o: s.p, h: s.p, l: s.p, c: s.p, v: 0, pv: 0 };
      s.open = s.p;
      for (let i = 0; i < 30 * 32; i++) tape.tick(s, i * 0.07, true);
      return s;
    },
    tick(s, now, warm) {
      if (s.r() < 0.02) s.drift = (s.r() - 0.5) * 0.9;
      s.p = Math.round((s.p + (s.r() - 0.5) * 3.2 + s.drift) * 20) / 20;
      const q = 65 * (1 + Math.floor(s.r() * s.r() * 18));
      const b = s.cur; b.h = Math.max(b.h, s.p); b.l = Math.min(b.l, s.p); b.c = s.p; b.v += q; b.pv += q * s.p;
      s.count++;
      if (!warm) s.ticks.push({ t: now, p: s.p });
      s.bt += 0.07;
      if (s.bt >= 2.24) { s.bars.push(b); if (s.bars.length > 40) s.bars.shift(); s.cur = { o: s.p, h: s.p, l: s.p, c: s.p, v: 0, pv: 0 }; s.bt = 0; s.n++; }
    },
    draw(ctx, w, h, t, dt, s) {
      s.acc += dt;
      while (s.acc >= 0.07) { tape.tick(s, t, false); s.acc -= 0.07; }
      s.ticks = s.ticks.filter((k) => t - k.t < 1.6);
      brackets(ctx, w, h, C.line, 12);
      const x0 = 14, x1 = w - 76, y0 = 34, y1 = h - 40;
      const slots = Math.max(16, Math.min(32, Math.floor((x1 - x0) / 13)));
      const vis = s.bars.slice(-(slots - 1)).concat([s.cur]);
      let lo = Infinity, hi = -Infinity;
      vis.forEach((b) => { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); });
      const pad = Math.max(2, (hi - lo) * 0.12); lo -= pad; hi += pad;
      const Y = (p) => y0 + (1 - (p - lo) / (hi - lo)) * (y1 - y0);
      const sw = (x1 - x0) / slots, cw = Math.max(3, sw * 0.52);
      for (let i = 0; i <= 3; i++) {
        const p = lo + ((hi - lo) * i) / 3, y = Math.round(Y(p)) + .5;
        line(ctx, x0, y, x1, y, C.faint, 1, [2, 4]);
        txt(ctx, p.toFixed(2), x1 + 10, y + 3, { size: 9.5, color: C.dim, ls: .5 });
      }
      let cum = 0, cumv = 0; const vw = [];
      vis.forEach((b, i) => {
        cum += b.pv; cumv += b.v; vw.push(cum / Math.max(1, cumv));
        const x = x0 + sw * (i + 0.5);
        if (i === vis.length - 1) {
          ctx.setLineDash([2, 2]); line(ctx, x, Y(b.h), x, Y(b.l), C.ink, 1, [2, 2]);
          const ya = Y(Math.max(b.o, b.c)), yb = Y(Math.min(b.o, b.c));
          rect(ctx, x - cw / 2, ya, cw, Math.max(2, yb - ya), C.ink, null, 1, [2, 2]);
        } else candle(ctx, x, cw, Y, b, b.c >= b.o ? C.ink : C.dim, true);
      });
      ctx.beginPath(); vw.forEach((v, i) => { const x = x0 + sw * (i + 0.5); i ? ctx.lineTo(x, Y(v)) : ctx.moveTo(x, Y(v)); });
      ctx.strokeStyle = "rgba(242,242,238,.35)"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      const lx = x0 + sw * (vis.length - 0.5);
      s.ticks.forEach((k) => { const a = 1 - (t - k.t) / 1.6; ctx.fillStyle = `rgba(242,242,238,${a * .7})`; ctx.beginPath(); ctx.arc(lx + 8 + (t - k.t) * 18, Y(k.p), 1.4, 0, 6.3); ctx.fill(); });
      const up = s.p >= s.open, col = up ? C.up : C.down, ly = Y(s.p);
      line(ctx, lx, ly + .5, x1, ly + .5, col, 1, [1, 3]);
      rect(ctx, x1 + 4, ly - 9, 68, 18, null, col);
      txt(ctx, s.p.toFixed(2), x1 + 38, ly + 3.5, { size: 10, color: "#060607", align: "center", weight: 600, ls: .3 });
      txt(ctx, "TAPE.SYS", 14, 20, { size: 10, color: C.ink, weight: 600, ls: 2 });
      txt(ctx, "— NIFTY · SYNTHETIC · 1M BARS", 82, 20, { size: 10, color: C.dim, ls: 1.5 });
      const chg = s.p - s.open;
      txt(ctx, `BAR ${String(s.n).padStart(3, "0")} · Δ ${chg >= 0 ? "+" : ""}${chg.toFixed(2)} · TICKS ${s.count}`, 14, h - 14, { size: 9.5, color: C.dim, ls: 1.5 });
      txt(ctx, "VWAP ┄", w - 14, h - 14, { size: 9.5, color: C.dim, align: "right", ls: 1.5 });
    },
  };

  /* ================================================================ GAMMALEAK */
  const gammaleak = {
    cycle: 12,
    init() { return { tokens: [], q: [], spawn: 0, proc: 0, cvd: 0, hist: [0], z: .3, rows: 0, dropFlash: 0, rowsFlash: 0, r: rng(3), lastCt: 0 }; },
    draw(ctx, w, h, t, dt, s, sc) {
      const T = 12, ct = t % T, acc = sc.acc;
      if (ct < s.lastCt) { s.cvd = 0; s.hist = [0]; }
      s.lastCt = ct;
      const railY = Math.round(h * 0.40), qN = 10, slot = clamp(w * 0.02, 13, 22), qX = w * 0.20, qW = qN * slot;
      const gateX = qX + qW + w * 0.07, panelX = w * 0.60, px1 = w - 24, feedX = 22;
      const sz = clamp(slot * 0.5, 7, 10);
      // spawn
      const rate = ct > 5 && ct < 7.4 ? 18 : 2.6;
      s.spawn += rate * dt;
      while (s.spawn >= 1) { s.spawn -= 1; s.tokens.push({ x: feedX - 8, y: railY, st: "feed", side: null, a: 1, vy: 0, p: (22500 + s.r() * 30).toFixed(2) }); }
      // feed → queue
      const inFeed = s.tokens.filter((k) => k.st === "feed");
      inFeed.forEach((k) => {
        const tail = qX + (s.q.length + 0.5) * slot;
        k.x += 190 * dt;
        if (k.x >= tail) { k.st = "q"; s.q.push(k); }
      });
      // overflow drain (500 → keep 10, drawn as 8 → keep 2)
      if (s.q.length > 8) {
        const out = s.q.splice(0, s.q.length - 2);
        out.forEach((k) => { k.st = "drop"; k.vy = -40 - s.r() * 60; });
        s.dropFlash = 1.2;
      }
      s.q.forEach((k, i) => { const tx = qX + (i + 0.5) * slot; k.x += (tx - k.x) * Math.min(1, dt * 10); k.y = railY; });
      // process
      s.proc += 3.1 * dt;
      while (s.proc >= 1 && s.q.length) {
        s.proc -= 1;
        const k = s.q.shift(); k.st = "proc"; k.t0 = t; k.sx = k.x;
        k.side = s.r() < (ct < 9 ? 0.66 : 0.38) ? "B" : "S";
      }
      if (!s.q.length) s.proc = Math.min(s.proc, 1);
      s.tokens.forEach((k) => {
        if (k.st === "proc") {
          const e = t - k.t0;
          if (e < 0.32) k.x = lerp(k.sx, gateX, ease(e / 0.32));
          else if (e < 0.75) { k.x = lerp(gateX, panelX - 14, ease((e - 0.32) / 0.43)); k.y = railY; }
          else {
            k.st = "done"; s.cvd += k.side === "B" ? 1 : -1; s.hist.push(s.cvd); if (s.hist.length > 90) s.hist.shift();
            s.rows++; if (s.rows % 5 === 0) s.rowsFlash = 0.6;
          }
        } else if (k.st === "drop") { k.vy += 520 * dt; k.y += k.vy * dt; k.x += 14 * dt; k.a -= dt * 0.9; }
      });
      s.tokens = s.tokens.filter((k) => k.st !== "done" && !(k.st === "drop" && (k.a <= 0 || k.y > h)));
      // z & verdict
      const zT = ct < 3 ? 0.4 : ct < 9.6 ? lerp(0.4, 2.65, ease((ct - 3) / 6.6)) : lerp(2.65, 0.3, ease((ct - 10.8) / 1.2));
      s.z += (zT - s.z) * Math.min(1, dt * 2.2);
      const verdict = ct >= 10.4 && ct < 11.7 ? "CONFIRM · FADE THE EXTREME" : s.z >= 2 ? "ALERT · STRETCHED UP" : "WATCHING";
      s.dropFlash = Math.max(0, s.dropFlash - dt); s.rowsFlash = Math.max(0, s.rowsFlash - dt);
      sc.setStep(ct < 4.6 ? 0 : ct < 9.2 ? 1 : 2);

      // ---- draw: feed rail
      txt(ctx, "WS FEED · GZIP PROTOBUF", feedX, railY - 34, { size: 9.5, color: C.dim });
      line(ctx, feedX, railY + .5, qX - 8, railY + .5, C.line, 1);
      // queue
      rect(ctx, qX - 4, railY - 14, qW + 8, 28, s.q.length > 6 ? C.down : C.line, null, 1);
      for (let i = 1; i < qN; i++) line(ctx, qX + i * slot + .5, railY - 10, qX + i * slot + .5, railY + 10, C.faint, 1);
      txt(ctx, "TICK_QUEUE", qX - 4, railY - 22, { size: 9.5, color: C.ink2 });
      txt(ctx, s.dropFlash > 0 ? "> 500 QUEUED → STALE DROPPED" : "> 500 → KEEP NEWEST 10", qX - 4, railY + 30, { size: 9, color: s.dropFlash > 0 ? C.down : C.dim });
      const fill = clamp(s.q.length / 8, 0, 1);
      rect(ctx, qX - 4, railY + 18, (qW + 8) * fill, 2, null, s.q.length > 6 ? C.down : acc);
      // gate
      line(ctx, qX + qW + 4, railY + .5, panelX - 14, railY + .5, C.faint, 1, [3, 4]);
      line(ctx, gateX + .5, railY - 30, gateX + .5, railY + 30, acc, 1.4);
      txt(ctx, "LEE-READY", gateX, railY - 38, { size: 9.5, color: acc, align: "center" });
      txt(ctx, "▲ BUY  ▼ SELL", gateX, railY + 44, { size: 9, color: C.dim, align: "center" });
      // tokens
      s.tokens.forEach((k) => {
        ctx.globalAlpha = clamp(k.a, 0, 1);
        if (k.st === "drop") rect(ctx, k.x - sz / 2, k.y - sz / 2, sz, sz, C.down, null, 1);
        else if (k.st === "proc" && k.x >= gateX) rect(ctx, k.x - sz / 2, k.y - sz / 2, sz, sz, null, k.side === "B" ? C.up : C.down);
        else rect(ctx, k.x - sz / 2, k.y - sz / 2, sz, sz, C.ink, null, 1);
        ctx.globalAlpha = 1;
      });
      const lead = s.tokens.filter((k) => k.st === "feed").sort((a, b) => b.x - a.x)[0];
      if (lead && lead.x > feedX + 10 && lead.x < qX - 46) txt(ctx, lead.p, lead.x, railY - 12, { size: 9, color: C.ink2, align: "center", ls: .3 });
      // csv
      const fx = gateX - 26, fy = railY + 62, fh = Math.min(64, h - fy - 22);
      if (fh > 30) {
        rect(ctx, fx, fy, 52, fh, s.rowsFlash > 0 ? acc : C.line, null, 1);
        const nRows = Math.floor(s.rows / 5) % 7;
        for (let i = 0; i < nRows; i++) line(ctx, fx + 8, fy + 10 + i * 7, fx + 44, fy + 10 + i * 7, i === nRows - 1 && s.rowsFlash > 0 ? acc : C.dim, 1);
        line(ctx, gateX + .5, railY + 30, gateX + .5, fy, C.faint, 1, [2, 3]);
        txt(ctx, "CSV · BATCH OF 5", fx + 60, fy + 12, { size: 9, color: C.dim });
        txt(ctx, `${s.rows} ROWS`, fx + 60, fy + 26, { size: 9, color: C.ink2 });
      }
      // panel: cvd
      const cy0 = 28, cy1 = h * 0.40;
      txt(ctx, "CVD · BUYS − SELLS", panelX, cy0 - 8, { size: 9.5, color: C.dim });
      const hi = Math.max(4, ...s.hist.map(Math.abs));
      const CY = (v) => (cy0 + cy1) / 2 - (v / hi) * (cy1 - cy0) / 2;
      line(ctx, panelX, CY(0) + .5, px1, CY(0) + .5, C.faint, 1, [2, 3]);
      ctx.beginPath(); s.hist.forEach((v, i) => { const x = panelX + (i / 89) * (px1 - panelX); i ? ctx.lineTo(x, CY(v)) : ctx.moveTo(x, CY(v)); });
      ctx.strokeStyle = acc; ctx.lineWidth = 1.5; ctx.stroke();
      // z gauge
      const gy = h * 0.58, gx0 = panelX, gx1 = px1, GX = (z) => lerp(gx0, gx1, (clamp(z, -3, 3) + 3) / 6);
      txt(ctx, "Z · STRETCH FROM VWAP", panelX, gy - 18, { size: 9.5, color: C.dim });
      line(ctx, gx0, gy + .5, gx1, gy + .5, C.line, 1);
      for (let z = -3; z <= 3; z++) line(ctx, GX(z) + .5, gy - 3, GX(z) + .5, gy + 4, C.dim, 1);
      line(ctx, GX(2) + .5, gy - 12, GX(2) + .5, gy + 12, C.down, 1, [2, 2]);
      line(ctx, GX(-2) + .5, gy - 12, GX(-2) + .5, gy + 12, C.down, 1, [2, 2]);
      txt(ctx, "+2σ", GX(2), gy + 22, { size: 9, color: C.down, align: "center" });
      txt(ctx, "−2σ", GX(-2), gy + 22, { size: 9, color: C.down, align: "center" });
      const nx = GX(s.z);
      ctx.beginPath(); ctx.moveTo(nx, gy - 4); ctx.lineTo(nx - 5, gy - 12); ctx.lineTo(nx + 5, gy - 12); ctx.closePath(); ctx.fillStyle = acc; ctx.fill();
      txt(ctx, `Z ${s.z >= 0 ? "+" : ""}${s.z.toFixed(2)}`, gx1, gy - 18, { size: 9.5, color: C.ink, align: "right" });
      // verdict
      const vy = h * 0.74, on = verdict !== "WATCHING";
      rect(ctx, panelX, vy, px1 - panelX, 38, on ? (verdict.startsWith("CONFIRM") ? acc : C.Y) : C.line, null, 1);
      txt(ctx, verdict, panelX + 14, vy + 23.5, { size: 11, color: on ? C.ink : C.dim, weight: 600, ls: 1.4 });
      if (Math.floor(t * 4) % 2 === 0) { ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(px1 - 12, vy + 19, 2.4, 0, 6.3); ctx.fill(); }
      txt(ctx, "4 HZ", px1 - 20, vy + 22.5, { size: 8.5, color: C.dim, align: "right" });
    },
  };

  /* ================================================================ TRADERETRO */
  const traderetro = {
    cycle: 15,
    init() {
      const r = rng(21); let p = 2948.6; const bars = [];
      for (let i = 0; i < 12; i++) { const o = p; let c = o, hh = o, ll = o; for (let k = 0; k < 10; k++) { c += (r() - 0.48) * 1.8; hh = Math.max(hh, c); ll = Math.min(ll, c); } bars.push({ o, h: hh + r() * .6, l: ll - r() * .6, c }); p = c; }
      const dots = []; for (let i = 0; i < 12; i++) { const rr = rng(100 + i); dots.push(Array.from({ length: 26 }, () => [rr(), rr()])); }
      return { bars, dots };
    },
    draw(ctx, w, h, t, dt, s, sc) {
      const T = 15, md = 1, ct = t % T, acc = sc.acc, G = 5;
      const cur = Math.min(12, Math.floor(ct / md)), frac = (ct % md) / md;
      const reconP = prog(ct, 11.1, 11.9);
      sc.setStep(ct < 5 ? 0 : ct < 10.6 ? 1 : 2);
      const L = Math.min(150, w * 0.16), R = w - 22, N = 12, cw = (R - L) / N;
      const rows = { stream: 30, b0: 56, b1: 104, s0: 122, s1: 188, g0: 204, g1: h - 18 };
      const X = (c) => L + cw * (c + 0.5);
      // row labels + separators
      [["REDIS STREAM", rows.stream + 3], ["BRONZE · TICKS", (rows.b0 + rows.b1) / 2 + 3], ["SILVER · 1 MIN", (rows.s0 + rows.s1) / 2 + 3], ["GOLD · 5 MIN", (rows.g0 + rows.g1) / 2 + 3]].forEach(([s1, y]) => txt(ctx, s1, 18, y, { size: 9.5, color: C.dim }));
      [rows.b0 - 8, rows.s0 - 8, rows.g0 - 6].forEach((y) => line(ctx, 14, y + .5, R, y + .5, C.faint, 1));
      for (let c = 0; c < N; c++) txt(ctx, "09:" + String(15 + c).padStart(2, "0"), X(c), rows.b0 - 13, { size: 8.5, color: c === cur ? C.ink2 : "rgba(242,242,238,.25)", align: "center", ls: .4 });
      // stream lane
      const live = cur < 12 && cur !== G;
      line(ctx, L, rows.stream + .5, R, rows.stream + .5, C.faint, 1);
      if (cur < 12) {
        const cx = X(cur);
        if (live) {
          for (let k = 0; k < 9; k++) { const span = Math.max(20, cx - L); const x = L + ((ct * 140 + k * span / 9) % span); ctx.fillStyle = C.ink2; ctx.fillRect(x - 2, rows.stream - 2, 4, 4); }
          line(ctx, cx + .5, rows.stream + 6, cx + .5, rows.b0 - 2, acc, 1, [2, 3]);
          txt(ctx, "XACK ✓", cx, rows.stream - 9, { size: 8.5, color: acc, align: "center" });
        } else txt(ctx, "FEED DROPPED", cx, rows.stream - 9, { size: 9, color: C.down, align: "center" });
      }
      // bronze dots
      for (let c = 0; c < Math.min(cur + 1, N); c++) {
        if (c === G) continue;
        const n = c < cur ? 26 : Math.floor(26 * frac);
        for (let i = 0; i < n; i++) { const [a, b] = s.dots[c][i]; ctx.fillStyle = c === cur ? C.ink2 : C.dim; ctx.fillRect(X(c) - cw * .36 + a * cw * .72, rows.b0 + b * (rows.b1 - rows.b0), 2, 2); }
      }
      // silver candles
      let lo = Infinity, hi = -Infinity; s.bars.forEach((b) => { lo = Math.min(lo, b.l); hi = Math.max(hi, b.h); });
      const SY = (p) => rows.s0 + 4 + (1 - (p - lo) / (hi - lo)) * (rows.s1 - rows.s0 - 8);
      for (let c = 0; c < Math.min(cur, N); c++) {
        if (c === G) continue;
        const grow = c === cur - 1 ? ease(frac / 0.4) : 1;
        ctx.globalAlpha = grow; candle(ctx, X(c), cw * .42, SY, s.bars[c], acc, true); ctx.globalAlpha = 1;
      }
      if (cur > G) {
        if (reconP < 1) {
          rect(ctx, X(G) - cw * .4, rows.s0, cw * .8, rows.s1 - rows.s0, C.down, null, 1, [3, 3]);
          txt(ctx, "GAP", X(G), (rows.s0 + rows.s1) / 2 + 3, { size: 9, color: C.down, align: "center" });
          rect(ctx, X(G) - cw * .4, rows.b0, cw * .8, rows.b1 - rows.b0, "rgba(255,90,95,.5)", null, 1, [3, 3]);
          if (ct > 10.2 && ct < 11.1) { const gx = X(G) + cw * .5, wait = clamp((11.1 - ct) / 0.9, 0, 1); txt(ctx, `GRACE ${Math.ceil(wait * 5)} MIN`, gx + 4, rows.s1 - 6, { size: 8.5, color: C.dim }); }
        }
        if (ct >= 11.1) {
          const ry = rows.s0 - 3, tx = X(G) + cw * .3;
          partial(ctx, [[R, ry], [tx, ry], [tx, rows.s0 + 14]], reconP, C.Y, 1);
          txt(ctx, "REST API", R, ry - 5, { size: 8.5, color: C.Y, align: "right" });
          if (reconP > .6) {
            ctx.globalAlpha = ease((reconP - .6) / .4); candle(ctx, X(G), cw * .42, SY, s.bars[G], C.Y, false, true); ctx.globalAlpha = 1;
            txt(ctx, "R", X(G) + cw * .32, rows.s0 + 9, { size: 9, color: C.Y, weight: 600 });
          }
        }
      }
      // gold
      const gb = (a, b) => { const seg = s.bars.slice(a, b + 1); return { o: seg[0].o, c: seg[seg.length - 1].c, h: Math.max(...seg.map((x) => x.h)), l: Math.min(...seg.map((x) => x.l)) }; };
      const GY = (p) => rows.g0 + 4 + (1 - (p - lo) / (hi - lo)) * (rows.g1 - rows.g0 - 8);
      if (cur >= 5) { ctx.globalAlpha = cur === 5 ? ease(frac / .5) : 1; candle(ctx, (X(0) + X(4)) / 2, cw * 2.2, GY, gb(0, 4), C.ink, true); ctx.globalAlpha = 1; }
      if (ct >= 11.9) { ctx.globalAlpha = ease((ct - 11.9) / .5); candle(ctx, (X(5) + X(9)) / 2, cw * 2.2, GY, gb(5, 9), C.ink, true); ctx.globalAlpha = 1; }
      if (cur >= 5) { line(ctx, X(0) - cw * .4, rows.g1 + 4, X(4) + cw * .4, rows.g1 + 4, C.faint, 1); }
    },
  };

  /* ================================================================ ALPHA */
  const HASH = "1bc2279fee8cf4d5c3594025ceb6ccc8da8b00799c8f7a150b5f84cbb79955a8";
  const alpha = {
    cycle: 15,
    init() { return { r: rng(5), scr: "", scrT: 0 }; },
    draw(ctx, w, h, t, dt, s, sc) {
      const T = 15, ct = t % T, acc = sc.acc, k = Math.floor(t / T) % 2;
      const act = Math.min(2, Math.floor(ct / 5));
      sc.setStep(act);
      const pw = w / 3, pad = Math.min(22, pw * .08);
      for (let i = 1; i < 3; i++) line(ctx, pw * i + .5, 16, pw * i + .5, h - 16, C.faint, 1);
      // ---------- A: freeze
      let x0 = 0; ctx.globalAlpha = act === 0 ? 1 : .5;
      txt(ctx, "01 · FREEZE", x0 + pad, 22, { size: 9.5, color: act === 0 ? acc : C.dim });
      const dx = x0 + pad, dy = 34, dw = pw - pad * 2, dh = h - 128;
      rect(ctx, dx, dy, dw, dh, C.line, null, 1);
      txt(ctx, "H-003 · PRE-REGISTRATION", dx + 12, dy + 18, { size: 9.5, color: C.ink2 });
      const widths = [.82, .64, .9, .58, .74];
      widths.forEach((f, i) => { const y = dy + 34 + i * 11; if (y < dy + dh - 30) rect(ctx, dx + 12, y, (dw - 24) * f, 3, null, C.faint); });
      txt(ctx, "GO IF  p ≤ 0.0111", dx + 12, dy + dh - 14, { size: 10, color: acc, weight: 600 });
      const lockP = prog(ct, 0.4, 3.2);
      s.scrT -= dt; if (s.scrT <= 0) { s.scrT = .06; s.scr = Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(s.r() * 16)]).join(""); }
      const shown = Math.floor(lockP * 64);
      const hs = HASH.slice(0, shown) + s.scr.slice(shown);
      const per = Math.max(16, Math.floor((dw - 30) / 6.3));
      const lines = [hs.slice(0, per), hs.slice(per, per * 2), hs.slice(per * 2, per * 3), hs.slice(per * 3, 64)].filter(Boolean).slice(0, 4);
      lines.forEach((ln, i) => {
        const y = dy + dh + 18 + i * 13; if (y > h - 10) return;
        const lockedChars = clamp(shown - i * per, 0, ln.length);
        txt(ctx, ln.slice(0, lockedChars), dx, y, { size: 9.5, color: C.ink, ls: .6 });
        ctx.font = `400 9.5px ${MONO}`; if ("letterSpacing" in ctx) ctx.letterSpacing = ".6px";
        const wLocked = ctx.measureText(ln.slice(0, lockedChars)).width; if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        txt(ctx, ln.slice(lockedChars), dx + wLocked, y, { size: 9.5, color: C.faint, ls: .6 });
      });
      // padlock
      const lx = dx + dw - 16, ly = dy + 10, closed = lockP >= 1;
      rect(ctx, lx - 7, ly + 6, 14, 11, closed ? acc : C.dim, null, 1.2);
      ctx.beginPath(); ctx.arc(lx, ly + 6 - (closed ? 0 : 4), 4.5, Math.PI, 0); ctx.strokeStyle = closed ? acc : C.dim; ctx.lineWidth = 1.2; ctx.stroke();
      if (closed) txt(ctx, "FROZEN 11 JUL", lx - 14, dy + 18, { size: 8.5, color: acc, align: "right" });
      ctx.globalAlpha = 1;

      // ---------- B: point in time
      x0 = pw; ctx.globalAlpha = act === 1 ? 1 : .5;
      txt(ctx, "02 · NO PEEKING", x0 + pad, 22, { size: 9.5, color: act === 1 ? acc : C.dim });
      txt(ctx, "pit.load(dataset, asof)", x0 + pad, 40, { size: 9.5, color: C.ink2, ls: .4 });
      const ax0 = x0 + pad, ax1 = x0 + pw - pad, ay = h * 0.52, HX = (hr) => lerp(ax0, ax1, hr / 72);
      line(ctx, ax0, ay + .5, ax1, ay + .5, C.line, 1);
      ["MON", "TUE", "WED"].forEach((d, i) => {
        rect(ctx, HX(i * 24 + 9.25), ay - 6, HX(15.5) - HX(9.25), 6, null, "rgba(242,242,238,.14)");
        txt(ctx, d, HX(i * 24 + 12), ay + 16, { size: 8.5, color: C.dim, align: "center" });
        if (i) line(ctx, HX(i * 24) + .5, ay - 3, HX(i * 24) + .5, ay + 3, C.dim, 1);
      });
      const cursorH = act === 1 ? lerp(4, 70, ease((ct - 5) / 4.6)) : act === 0 ? 4 : 70;
      const cxp = HX(cursorH);
      const files = []; [0, 1, 2].forEach((d) => { files.push([d * 24 + 19.5, "B"]); files.push([d * 24 + 22, "OI"]); });
      const sy = h - 44; let seen = 0;
      files.forEach(([hr, lab], i) => {
        const fx = HX(hr) - 5, fy = ay - 38 - (i % 2) * 12, ok = hr < cursorH;
        if (ok) { seen++; rect(ctx, fx, fy, 10, 12, null, acc); line(ctx, fx + 5, fy + 12, fx + 5, sy, "rgba(242,242,238,.18)", 1, [1, 3]); }
        else rect(ctx, fx, fy, 10, 12, C.dim, null, 1, [2, 2]);
        txt(ctx, lab, fx + 5, fy - 4, { size: 7.5, color: ok ? C.ink2 : C.faint, align: "center", ls: .3 });
      });
      line(ctx, cxp + .5, 52, cxp + .5, ay + 24, C.ink, 1.2);
      txt(ctx, "ASOF", cxp, ay + 34, { size: 8.5, color: C.ink, align: "center" });
      rect(ctx, ax0, sy, ax1 - ax0, 24, C.line, null, 1);
      txt(ctx, `STUDY SEES ${seen} FILE${seen === 1 ? "" : "S"}`, ax0 + 10, sy + 15.5, { size: 9, color: C.ink2 });
      txt(ctx, "BHAV 19:30 · OI 22:00", ax1 - 8, sy + 15.5, { size: 8.5, color: C.dim, align: "right" });
      ctx.globalAlpha = 1;

      // ---------- C: verdict
      x0 = pw * 2; ctx.globalAlpha = act === 2 ? 1 : .5;
      const H = k === 0 ? { id: "H-003 · EXPIRY-DAY ENERGY", dom: [-0.6, 0.6], est: .287, lo: .118, hi: .501, go: true, f: (v) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2) }
        : { id: "H-001B · STRADDLE AT FULL COST", dom: [-2500, 2500], est: -804, lo: -1349, hi: -395, go: false, f: (v) => (v >= 0 ? "+₹" : "−₹") + Math.abs(v) };
      txt(ctx, "03 · VERDICT", x0 + pad, 22, { size: 9.5, color: act === 2 ? acc : C.dim });
      txt(ctx, H.id, x0 + pad, 40, { size: 9.5, color: C.ink2 });
      const bx0 = x0 + pad, bx1 = x0 + pw - pad, by = h * 0.66, BX = (v) => lerp(bx0, bx1, (v - H.dom[0]) / (H.dom[1] - H.dom[0]));
      line(ctx, bx0, by + .5, bx1, by + .5, C.line, 1);
      line(ctx, BX(0) + .5, 56, BX(0) + .5, by + 6, C.dim, 1, [2, 3]);
      txt(ctx, "0", BX(0), by + 16, { size: 8.5, color: C.dim, align: "center" });
      const dotsP = act === 2 ? prog(ct, 10.2, 12.4) : act === 0 ? 0 : 0;
      const rr = rng(k ? 9 : 4), sd = (H.hi - H.lo) / 3.3, n = Math.floor(90 * dotsP), bins = {};
      const binW = 5;
      for (let i = 0; i < n; i++) {
        const g = (rr() + rr() + rr() + rr() - 2) * 1.7; const v = H.est + g * sd; const bx = Math.round(BX(v) / binW) * binW;
        bins[bx] = (bins[bx] || 0) + 1; ctx.fillStyle = C.ink2; ctx.fillRect(bx - 1.5, by - 6 - bins[bx] * 4, 3, 3);
      }
      const ciP = act === 2 ? prog(ct, 12.5, 13.2) : 0;
      if (ciP > 0) {
        const col = H.go ? C.up : C.down, cy = by + 30;
        line(ctx, BX(H.lo), cy, lerp(BX(H.lo), BX(H.hi), ciP), cy, col, 2.4);
        line(ctx, BX(H.lo), cy - 5, BX(H.lo), cy + 5, col, 1.4);
        if (ciP >= 1) { line(ctx, BX(H.hi), cy - 5, BX(H.hi), cy + 5, col, 1.4); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(BX(H.est), cy, 4, 0, 6.3); ctx.fill(); }
        txt(ctx, `90% CI [${H.f(H.lo)}, ${H.f(H.hi)}]`, bx0, cy + 22, { size: 9, color: C.dim });
      }
      const stP = act === 2 ? prog(ct, 13.3, 13.6) : 0;
      if (stP > 0) {
        const col = H.go ? C.up : C.down, label = H.go ? "GO" : "INVERTED";
        ctx.save(); ctx.translate(bx1 - 46, 74); ctx.rotate(-0.12); const sca = lerp(1.6, 1, ease(stP)); ctx.scale(sca, sca); ctx.globalAlpha *= stP;
        ctx.font = `700 13px ${MONO}`; const tw = ctx.measureText(label).width + 18;
        rect(ctx, -tw / 2, -13, tw, 24, col, null, 1.6);
        txt(ctx, label, 0, 4, { size: 13, color: col, align: "center", weight: 700, ls: 2 });
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };

  /* ================================================================ PHASR */
  const ROOMS = [["BED 1", 0, 0, .38, .55], ["BED 2", .38, 0, .70, .55], ["KITCHEN", .70, 0, 1, .55], ["LIVING", 0, .55, .78, 1], ["BATH", .78, .55, 1, 1]];
  const WALLS = [[0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0], [.38, 0, .38, .55], [.70, 0, .70, .55], [0, .55, 1, .55], [.78, .55, .78, 1]];
  // type: L light, S 5A socket, P 15A socket, A AC, G geyser ; c = circuit index
  const PTS = [
    ["L", .12, .2, 0], ["L", .27, .2, 0], ["S", .06, .44, 2], ["S", .3, .44, 2], ["A", .19, .08, 5],
    ["L", .47, .2, 0], ["L", .61, .2, 0], ["S", .43, .44, 2], ["P", .64, .44, 3], ["A", .54, .08, 6],
    ["L", .85, .2, 1], ["P", .76, .44, 3], ["P", .94, .44, 4],
    ["L", .22, .72, 1], ["L", .52, .72, 1], ["S", .08, .9, 2], ["P", .44, .9, 4], ["A", .34, .62, 7],
    ["L", .89, .72, 1], ["G", .89, .9, 8],
  ];
  const CIRC = [["LIGHT 1", 10], ["LIGHT 2", 10], ["5A SKT", 10], ["15A SKT", 16], ["15A SKT", 16], ["AC", 20], ["AC", 20], ["AC", 20], ["GEYSER", 20]];
  const RAIL = (() => {
    const order = CIRC.map((c, i) => [c[1], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    const load = [0, 0, 0], out = new Array(CIRC.length), seq = [];
    order.forEach(([a, i]) => { let r = 0; for (let k = 1; k < 3; k++) if (load[k] < load[r]) r = k; out[i] = r; load[r] += a; seq.push([i, r, load[r]]); });
    return { of: out, seq, load };
  })();
  const RECEIPT = ["BILL OF MATERIALS · 2 BHK · DELHI", "1.5 mm²      11 × 90 m", "2.5 mm²       4 × 90 m", "4.0 mm²       3 × 90 m", "MCB 10A B ×5 · 16A C ×4", "RCCB 63A 4P 30 mA ×1", "SUPPLY        3-PHASE"];
  const phasr = {
    cycle: 15,
    init() { return {}; },
    draw(ctx, w, h, t, dt, s, sc) {
      const T = 15, ct = t % T, acc = sc.acc, RC = [C.R, C.Y, C.B];
      sc.setStep(ct < 3.4 ? 0 : ct < 9.4 ? 1 : 2);
      const px0 = 20, py0 = 30, pW = Math.max(160, w * 0.36), pH = h - 62;
      const P = (fx, fy) => [px0 + fx * pW, py0 + fy * pH];
      txt(ctx, "FLOOR PLAN · POINTS", px0, 20, { size: 9.5, color: C.dim });
      // walls
      const wp = prog(ct, 0, 1.4);
      WALLS.forEach((wl, i) => { const a = P(wl[0], wl[1]), b = P(wl[2], wl[3]); partial(ctx, [a, b], clamp(wp * WALLS.length - i * .55, 0, 1), C.ink2, 1.2); });
      if (wp > .7) ROOMS.forEach(([n, a, b]) => { const [x, y] = P(a, b); txt(ctx, n, x + 6, y + 13, { size: 8, color: "rgba(242,242,238,.34)" }); });
      // DB
      const [dbx, dby] = [px0 + pW + 14, py0 + pH * .55 - 16];
      rect(ctx, dbx, dby, 30, 32, acc, null, 1.2); txt(ctx, "DB", dbx + 15, dby + 20, { size: 9, color: acc, align: "center", weight: 600 });
      // cables
      const cp = prog(ct, 3.4, 6.4);
      if (cp > 0) PTS.forEach((p, i) => {
        const [x, y] = P(p[1], p[2]), cy = py0 + pH * .55 + (p[2] < .55 ? -4 : 4) - (RAIL.of[p[3]] - 1) * 3;
        partial(ctx, [[x, y], [x, cy], [dbx, cy]], clamp(cp * 1.6 - (i / PTS.length) * .6, 0, 1), RC[RAIL.of[p[3]]], 1);
      });
      // points
      PTS.forEach((p, i) => {
        const a = prog(ct, 1.4 + i * .09, 1.7 + i * .09); if (a <= 0) return;
        const [x, y] = P(p[1], p[2]); ctx.globalAlpha = a; const col = cp > 0 ? RC[RAIL.of[p[3]]] : C.ink;
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2;
        if (p[0] === "L") { ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.3); ctx.stroke(); }
        else if (p[0] === "S") rect(ctx, x - 3, y - 3, 7, 7, col, null, 1.2);
        else if (p[0] === "P") rect(ctx, x - 3.5, y - 3.5, 8, 8, null, col);
        else if (p[0] === "A") { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
      // board
      const bx0 = dbx + 64, bW = Math.max(90, w * 0.15), byTop = 46, byBot = h - 40, bMax = 70;
      txt(ctx, "BOARD · R Y B", bx0, 20, { size: 9.5, color: C.dim });
      const step = prog(ct, 6.4, 9.2) * RAIL.seq.length, landed = [0, 0, 0];
      RAIL.seq.forEach(([ci, r], j) => { if (j < Math.floor(step)) landed[r] += CIRC[ci][1]; });
      [0, 1, 2].forEach((r) => {
        const x = bx0 + r * (bW / 3) + 4, bw = bW / 3 - 12, hh = (landed[r] / bMax) * (byBot - byTop);
        rect(ctx, x, byTop, bw, byBot - byTop, C.faint, null, 1);
        rect(ctx, x, byBot - hh, bw, hh, null, RC[r]);
        txt(ctx, "RYB"[r], x + bw / 2, byBot + 14, { size: 9.5, color: RC[r], align: "center", weight: 600 });
        if (landed[r]) txt(ctx, landed[r] + " A", x + bw / 2, byBot - hh - 5, { size: 8.5, color: C.ink2, align: "center", ls: .3 });
      });
      const j = Math.floor(step);
      if (j < RAIL.seq.length && ct > 6.4 && ct < 9.2) {
        const [ci, r] = RAIL.seq[j], f = ease(step - j);
        const tx = bx0 + r * (bW / 3) + bW / 6 - 4, ty = byBot - (landed[r] / bMax) * (byBot - byTop) - 16;
        const x = lerp(dbx + 30, tx - 14, f), y = lerp(dby + 8, ty, f);
        rect(ctx, x, y, 34, 14, null, RC[r]); txt(ctx, CIRC[ci][1] + "A", x + 17, y + 10.5, { size: 8.5, color: "#060607", align: "center", weight: 600, ls: .2 });
        txt(ctx, "HEAVIEST FIRST → LIGHTEST RAIL", bx0, h - 10, { size: 8.5, color: C.dim });
      }
      // receipt
      const rx0 = bx0 + bW + 28, rW = w - rx0 - 22;
      if (rW > 120) {
        const rp = prog(ct, 9.4, 11.8), rh = Math.min(h - 120, 18 + RECEIPT.length * 15);
        txt(ctx, "BOM · SEALED BIDS", rx0, 20, { size: 9.5, color: C.dim });
        if (rp > 0) {
          rect(ctx, rx0, 30, rW, rh, C.line, null, 1);
          const nl = rp * RECEIPT.length;
          RECEIPT.forEach((ln, i) => { if (i < nl) { const part = i < Math.floor(nl) ? ln : ln.slice(0, Math.floor((nl % 1) * ln.length)); txt(ctx, part, rx0 + 10, 48 + i * 15, { size: 9, color: i === 0 ? acc : i === RECEIPT.length - 1 ? C.ink : C.ink2, ls: .3 }); } });
        }
        const ep = prog(ct, 12, 14.4), boxY = 30 + rh + 14, boxH = h - boxY - 16;
        if (ep > 0 && boxH > 30) {
          rect(ctx, rx0, boxY, rW, boxH, acc, null, 1, [3, 3]);
          txt(ctx, "SEALED · 72 H", rx0 + 10, boxY + 14, { size: 8.5, color: acc });
          for (let e = 0; e < 3; e++) {
            const f = ease(clamp(ep * 3 - e, 0, 1)); if (f <= 0) continue;
            const ex = lerp(w + 10, rx0 + 12 + e * 44, f), ey = boxY + boxH - 30;
            rect(ctx, ex, ey, 36, 22, C.ink2, null, 1);
            ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 18, ey + 11); ctx.lineTo(ex + 36, ey); ctx.strokeStyle = C.ink2; ctx.stroke();
          }
          txt(ctx, `${Math.min(3, Math.floor(ep * 3 + .2))} OF 5 BIDS`, rx0 + rW - 8, boxY + 14, { size: 8.5, color: C.ink2, align: "right" });
        }
      }
    },
  };

  /* ================================================================ runner */
  const DEFS = { tape, gammaleak, traderetro, alpha, phasr };
  const scenes = [];
  function Scene(canvas) {
    this.c = canvas; this.def = DEFS[canvas.dataset.scene]; this.s = this.def.init(); this.t = 0; this.on = false; this.lastStep = -1;
    this.stepsEl = canvas.closest(".how") ? canvas.closest(".how").querySelectorAll(".steps li") : [];
  }
  Scene.prototype.resize = function () {
    const r = this.c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height;
    this.c.width = Math.max(1, Math.round(r.width * d)); this.c.height = Math.max(1, Math.round(r.height * d));
    this.ctx = this.c.getContext("2d"); this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.acc = getComputedStyle(this.c).getPropertyValue("--acc").trim() || C.ink;
  };
  Scene.prototype.setStep = function (i) {
    if (i === this.lastStep) return; this.lastStep = i;
    this.stepsEl.forEach((li, k) => li.classList.toggle("on", k === i));
  };
  Scene.prototype.frame = function (dt) {
    if (!this.w) return;
    this.t += dt; this.ctx.clearRect(0, 0, this.w, this.h);
    this.def.draw(this.ctx, this.w, this.h, this.t, dt, this.s, this);
  };
  Scene.prototype.still = function () {
    // reduced motion: step the simulation to a representative moment, draw once
    const target = (this.def.cycle || 6) * 0.8;
    while (this.t < target) { const dt = 1 / 30; this.t += dt; this.ctx.clearRect(0, 0, this.w, this.h); this.def.draw(this.ctx, this.w, this.h, this.t, dt, this.s, this); }
  };

  let raf = 0, last = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    let any = false;
    scenes.forEach((sc) => { if (sc.on) { sc.frame(dt); any = true; } });
    raf = any ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (!raf && !REDUCED) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  const io = "IntersectionObserver" in window ? new IntersectionObserver((ents) => {
    ents.forEach((e) => { const sc = e.target.__scene; if (!sc) return; sc.on = e.isIntersecting && !document.hidden; });
    kick();
  }, { threshold: 0.05 }) : null;

  function mount(root) {
    (root || document).querySelectorAll("canvas[data-scene]").forEach((cv) => {
      if (cv.__scene || !DEFS[cv.dataset.scene]) return;
      const sc = new Scene(cv); cv.__scene = sc; scenes.push(sc);
      sc.resize();
      if (REDUCED) { sc.still(); return; }
      // draw one frame immediately so the stage is never blank
      sc.frame(1 / 60);
      if (io) io.observe(cv); else { sc.on = true; kick(); }
    });
  }
  function unmountDetached() {
    for (let i = scenes.length - 1; i >= 0; i--) if (!document.body.contains(scenes[i].c)) { if (io) io.unobserve(scenes[i].c); scenes.splice(i, 1); }
  }
  function inView(sc) {
    const r = sc.c.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  }
  // re-measure every canvas (after a view switch or resize) and redraw
  function refresh() {
    scenes.forEach((sc) => {
      sc.resize();
      if (REDUCED) { sc.t = 0; sc.s = sc.def.init(); sc.still(); }
      else { sc.frame(0); sc.on = inView(sc); }
    });
    kick();
  }
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refresh, 120); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) scenes.forEach((sc) => (sc.on = false));
    else { scenes.forEach((sc) => (sc.on = inView(sc))); kick(); }
  });

  window.Scenes = { mount, unmountDetached, refresh };
})();
