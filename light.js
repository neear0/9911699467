/* The stage light.

   The home page opens on a dark wall. Drawn on it, very faintly, is the
   construction the headline is actually set on: its baselines, cap heights
   and x-heights, the column grid, a ruler, and the measurements, all read
   from the live DOM, so every number on it is true for the screen you are
   looking at. A pool of light follows the pointer and shows that
   construction at full strength wherever it falls. With no pointer (touch,
   or when it has been still a while) the light drifts on its own.

   Cost: the construction is drawn once into an offscreen layer; each frame
   is one faint copy of it, one masked copy of the lit square, one glow. The
   loop stops when the stage is off screen or the tab is hidden, and with
   reduced motion it paints a single still frame. */
(function initStageLight() {
  const stage = document.querySelector('.stage');
  const cv = stage && stage.querySelector('.stage-canvas');
  const h1 = stage && stage.querySelector('.h1-big');
  if (!cv || !h1 || !cv.getContext) return;

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ctx = cv.getContext('2d');
  const layer = document.createElement('canvas');
  const lctx = layer.getContext('2d');
  const lit = document.createElement('canvas');
  const tctx = lit.getContext('2d');

  const INTRO = 1500;
  const LINE = '170,200,255';
  let W = 0, H = 0, dpr = 1, R = 300, x0 = 0;
  let rest = { x: 0, y: 0 };
  const L = { x: 0, y: 0, tx: 0, ty: 0 };
  let t0 = 0, lastPointer = -1e9, raf = 0, visible = true, ready = false;

  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function line(c, x1, y1, x2, y2, a, dash) {
    c.globalAlpha = a;
    c.setLineDash(dash || []);
    c.beginPath();
    c.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    c.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    c.stroke();
  }
  function label(c, text, x, y, align, a) {
    c.globalAlpha = a == null ? 0.95 : a;
    c.textAlign = align || 'left';
    c.fillText(text, x, y);
  }

  /* Read the headline's real geometry and draw the construction layer. */
  function build() {
    const sr = stage.getBoundingClientRect();
    W = Math.round(sr.width);
    H = Math.round(sr.height);
    dpr = Math.min(window.devicePixelRatio || 1, W * H > 900000 ? 1.5 : 2);
    for (const c of [cv, layer, lit]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    R = clamp(Math.min(W, H) * 0.42, 170, 430);

    const inner = stage.querySelector('.stage-in').getBoundingClientRect();
    x0 = inner.left - sr.left;
    const x1 = inner.right - sr.left;
    const cs = getComputedStyle(h1);
    const fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) || fs * 0.9;

    // glyph metrics of the face actually rendered
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.font = `800 ${fs}px Syne, sans-serif`;
    const cap = lctx.measureText('H').actualBoundingBoxAscent || fs * 0.7;
    const xh = lctx.measureText('x').actualBoundingBoxAscent || fs * 0.5;
    const desc = lctx.measureText('p').actualBoundingBoxDescent || fs * 0.2;

    const c = lctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    c.strokeStyle = `rgb(${LINE})`;
    c.fillStyle = `rgb(${LINE})`;
    c.lineWidth = 1;
    c.font = '11px ui-monospace, "SF Mono", Consolas, monospace';
    c.textBaseline = 'alphabetic';

    // column grid
    const cols = W < 700 ? 4 : 12;
    const gut = W < 700 ? 16 : 24;
    const cw = (x1 - x0 - gut * (cols - 1)) / cols;
    for (let i = 0; i < cols; i++) {
      const a = x0 + i * (cw + gut);
      line(c, a, 0, a, H, 0.32);
      line(c, a + cw, 0, a + cw, H, 0.32);
    }
    // baseline grid
    for (let y = 0; y < H; y += 24) line(c, 0, y, W, y, 0.08);

    // ruler along the top, measured from the content edge
    const ry = W < 700 ? 74 : 92;
    line(c, 0, ry, W, ry, 0.5);
    for (let x = x0 % 8, n = 0; x < W; x += 8, n++) {
      const v = Math.round(x - x0);
      const big = v % 64 === 0;
      line(c, x, ry, x, ry + (big ? 8 : 3), big ? 0.7 : 0.35);
      if (v % 128 === 0 && v >= 0 && x < W - 30) label(c, String(v), x + 3, ry + 18, 'left', 0.7);
    }

    // margin: the content edge and its distance from the screen edge
    line(c, x0, 0, x0, H, 0.85);
    line(c, x1, 0, x1, H, 0.5);
    const my = H - (W < 700 ? 150 : 120);
    line(c, 0, my, x0, my, 0.7);
    line(c, 1, my - 4, 1, my + 4, 0.7);
    line(c, x0, my - 4, x0, my + 4, 0.7);
    if (x0 > 34) label(c, `${Math.round(x0)}`, x0 / 2, my - 7, 'center');

    // the headline: per line baseline, cap height, x-height, descender
    const lines = h1.querySelectorAll('.ln');
    let firstBase = 0, lastBase = 0, maxEnd = 0;
    lines.forEach((ln, i) => {
      const bl = ln.querySelector('.bl');
      if (!bl) return;
      const br = bl.getBoundingClientRect();
      const y = br.top - sr.top;
      const end = br.left - sr.left;
      if (!i) firstBase = y;
      lastBase = y;
      maxEnd = Math.max(maxEnd, end);
      line(c, 0, y, W, y, 0.55);
      line(c, x0 - 14, y, end + 14, y, 1);
      line(c, 0, y - cap, W, y - cap, 0.55, [6, 6]);
      line(c, 0, y - xh, W, y - xh, 0.4, [2, 4]);
      line(c, x0, y + desc, end, y + desc, 0.3, [6, 6]);
      line(c, end, y - cap - 10, end, y + 10, 0.85);
      if (i === 0 && W >= 700) {
        label(c, `cap ${Math.round(cap)}`, x1 - 4, y - cap - 6, 'right');
        label(c, `x ${Math.round(xh)}`, x1 - 4, y - xh - 6, 'right');
        label(c, `baseline`, x1 - 4, y - 6, 'right');
      }
      if (W >= 700) label(c, `${Math.round(end - x0)}`, end + 6, y - cap + 12, 'left', 0.8);
    });

    // type size and leading, read off the computed style
    if (lines.length > 1 && W >= 700) {
      const lx = Math.min(maxEnd + 70, x1 - 120);
      const ly = firstBase + lh;
      line(c, lx, firstBase, lx, ly, 0.85);
      line(c, lx - 4, firstBase, lx + 4, firstBase, 0.85);
      line(c, lx - 4, ly, lx + 4, ly, 0.85);
      label(c, `${Math.round(fs)} / ${Math.round(lh)}`, lx + 8, firstBase + lh / 2 + 4, 'left');
    }

    // one construction circle: the light's own shape, centred on the last line
    c.globalAlpha = 0.28;
    c.setLineDash([3, 5]);
    c.beginPath();
    c.arc(maxEnd, lastBase - cap / 2, cap * 1.1, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;

    rest = { x: clamp(maxEnd - fs * 0.6, W * 0.35, W * 0.78), y: clamp(firstBase + lh * 0.4, H * 0.25, H * 0.7) };
    if (!ready) { L.x = L.tx = rest.x; L.y = L.ty = rest.y; }
    ready = true;
  }

  function paint(now) {
    raf = 0;
    if (!ready) return;
    if (!t0) t0 = now;
    const p = still ? 1 : Math.min(1, (now - t0) / INTRO);
    const e = ease(p);

    if (!still) {
      if (now - lastPointer > 3500) {
        // idle: a slow figure-of-eight around the headline
        const k = now / 1000;
        L.tx = rest.x + Math.sin(k * 0.31) * W * 0.2;
        L.ty = rest.y + Math.sin(k * 0.47 + 1.3) * H * 0.13;
      }
      if (p < 1) {
        // the lamp comes on at the margin and swings over to the headline
        L.x = x0 + (L.tx - x0) * e;
        L.y = L.ty;
      } else {
        L.x += (L.tx - L.x) * 0.085;
        L.y += (L.ty - L.y) * 0.085;
      }
    }

    const r = R * (0.3 + 0.7 * e);
    const D = dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);

    ctx.save();
    if (p < 1) { ctx.beginPath(); ctx.rect(0, 0, cv.width * e, cv.height); ctx.clip(); }
    ctx.globalAlpha = 0.11;
    ctx.drawImage(layer, 0, 0);

    // the lit square only: copy that part of the layer, mask it with the pool
    const sx = clamp(Math.floor((L.x - r) * D), 0, cv.width);
    const sy = clamp(Math.floor((L.y - r) * D), 0, cv.height);
    const sw = clamp(Math.ceil(2 * r * D), 0, cv.width - sx);
    const sh = clamp(Math.ceil(2 * r * D), 0, cv.height - sy);
    if (sw > 0 && sh > 0) {
      tctx.globalCompositeOperation = 'copy';
      tctx.drawImage(layer, sx, sy, sw, sh, sx, sy, sw, sh);
      tctx.globalCompositeOperation = 'destination-in';
      const g = tctx.createRadialGradient(L.x * D, L.y * D, 0, L.x * D, L.y * D, r * D);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.5, 'rgba(0,0,0,.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      tctx.fillStyle = g;
      tctx.fillRect(sx, sy, sw, sh);
      ctx.globalAlpha = 1;
      ctx.drawImage(lit, sx, sy, sw, sh, sx, sy, sw, sh);
    }
    ctx.restore();

    // the light itself, falling on the wall
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(L.x * D, L.y * D, 0, L.x * D, L.y * D, r * 1.5 * D);
    gl.addColorStop(0, `rgba(150,180,255,${0.14 * e})`);
    gl.addColorStop(0.45, `rgba(110,150,255,${0.05 * e})`);
    gl.addColorStop(1, 'rgba(110,150,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';

    if (still || !visible || document.hidden) return;
    const moving = Math.abs(L.tx - L.x) + Math.abs(L.ty - L.y) > 0.3;
    if (p < 1 || moving || now - lastPointer > 3500) raf = requestAnimationFrame(paint);
  }

  function kick() { if (!raf && ready) raf = requestAnimationFrame(paint); }

  if (fine && !still) {
    stage.addEventListener('pointermove', (ev) => {
      const sr = stage.getBoundingClientRect();
      L.tx = ev.clientX - sr.left;
      L.ty = ev.clientY - sr.top;
      lastPointer = performance.now();
      kick();
    }, { passive: true });
    // let the drift take over a moment after the pointer leaves
    stage.addEventListener('pointerleave', () => { lastPointer = performance.now() - 2500; kick(); });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(stage);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); kick(); }, 150);
  });

  const start = () => {
    build();
    stage.classList.add('lit');
    kick();
  };
  // measure with the real face, but never hold the entrance longer than this
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(start);
  // a late font swap moves the lines; redraw on top of the right ones
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { build(); kick(); });
})();
