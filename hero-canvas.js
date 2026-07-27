/*
 * hero-canvas — the drifting light field behind the hero.
 *
 * Replaces the old fixed fragment shader with a particle field that reacts:
 *   drift   ambient flow, particles pushed around by the cursor
 *   gather  every ~20s the field pulls itself into a slowly turning sphere
 *   hold    the sphere spins; it is breakable
 *   burst   click it (or anywhere) and it blows apart, then settles back
 *
 * 2D canvas rather than WebGL on purpose: the interaction is the point, and
 * this stays readable and dependency-free. Cost is kept down by scaling the
 * particle count to the viewport, never allocating inside the frame loop, and
 * parking the loop whenever the hero is off-screen or the tab is hidden.
 */
(function initHeroCanvas() {
  var canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  var hero = canvas.parentElement;
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)');

  // ---- tunables -----------------------------------------------------------
  var DRIFT_MIN = 16000, DRIFT_MAX = 24000; // ms between shape appearances
  var GATHER_MS = 1700;                     // pull-in duration
  var HOLD_MS   = 9000;                     // how long the sphere stays up
  var SETTLE_MS = 1100;                     // burst -> drift
  var CURSOR_R  = 150;                      // cursor influence radius, px
  var CURSOR_F  = 26;                       // cursor push strength

  var W = 0, H = 0, DPR = 1;
  var parts = [], count = 0;
  var mode = 'drift', modeUntil = 0;
  var spin = 0;
  var cx = 0, cy = 0, radius = 0;
  var flash = 0;                            // white pop on break, decays to 0
  var px = -9999, py = -9999, pointerIn = false;
  var raf = 0, running = false, last = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- sizing -------------------------------------------------------------
  function measure() {
    W = hero.clientWidth || window.innerWidth;
    H = hero.clientHeight || window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // sphere sits under the glass panel on desktop, so it reads through it
    // mostly in the gap between the copy and the glass panel, clipping its edge
    // just enough that the panel frosts the part behind it
    cx = W * (W > 900 ? 0.57 : 0.5);
    cy = H * 0.46;
    // the perspective divide shrinks the drawn ball to ~0.6 of this, so the
    // figure is deliberately larger than the radius you actually see
    radius = Math.max(120, Math.min(Math.min(W, H) * 0.32, 300));
  }

  function targetCount() {
    var byArea = Math.round((W * H) / 5200);
    var cap = W < 700 ? 140 : 380;
    return Math.max(70, Math.min(byArea, cap));
  }

  function build() {
    var want = targetCount();
    if (want === count && parts.length) return;
    count = want;
    parts.length = 0;
    for (var i = 0; i < count; i++) {
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: rand(-0.12, 0.12), vy: rand(-0.12, 0.12),
        tx: 0, ty: 0, tz: 0,
        // a handful of much larger, very faint motes give the field depth so it
        // reads as drifting light rather than a starfield
        r: Math.random() < 0.12 ? rand(5, 11) : rand(0.8, 2.4),
        hot: Math.random() < 0.14,        // a few brighter nodes
        ph: Math.random() * Math.PI * 2   // per-particle phase, keeps drift varied
      });
    }
  }

  // Fibonacci lattice — evenly spread points on a sphere, no clustering at the
  // poles. Recomputed as it turns so the shape actually rotates.
  function sphereTargets() {
    var golden = Math.PI * (3 - Math.sqrt(5));
    var cosY = Math.cos(spin), sinY = Math.sin(spin);
    var tilt = 0.42, cosX = Math.cos(tilt), sinX = Math.sin(tilt);
    for (var i = 0; i < count; i++) {
      var p = parts[i];
      var y = 1 - (i / (count - 1 || 1)) * 2;
      var rr = Math.sqrt(Math.max(0, 1 - y * y));
      var th = golden * i;
      var x0 = Math.cos(th) * rr, y0 = y, z0 = Math.sin(th) * rr;
      // rotate Y then X
      var x1 = x0 * cosY + z0 * sinY, z1 = z0 * cosY - x0 * sinY;
      var y1 = y0 * cosX - z1 * sinX, z2 = z1 * cosX + y0 * sinX;
      var depth = 1 / (1.7 - z2 * 0.55);   // cheap perspective
      p.tx = cx + x1 * radius * depth;
      p.ty = cy + y1 * radius * depth;
      p.tz = depth;
    }
  }

  function burst(ox, oy, power) {
    for (var i = 0; i < count; i++) {
      var p = parts[i];
      var dx = p.x - ox, dy = p.y - oy;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var k = power * (1 - Math.min(d / (radius * 2.4), 1));
      p.vx += (dx / d) * k + rand(-0.8, 0.8);
      p.vy += (dy / d) * k + rand(-0.8, 0.8);
    }
  }

  function setMode(m, now) {
    mode = m;
    if (m === 'drift') modeUntil = now + rand(DRIFT_MIN, DRIFT_MAX);
    else if (m === 'gather') modeUntil = now + GATHER_MS;
    else if (m === 'hold') modeUntil = now + HOLD_MS;
    else modeUntil = now + SETTLE_MS;
  }

  // ---- frame --------------------------------------------------------------
  function step(now) {
    raf = 0;
    // clamped to a positive window: a stale frame after a resume, or a clock
    // that steps backwards, would otherwise hand the integrator a negative dt
    // and run the whole field in reverse
    var dt = Math.min(Math.max(now - last, 0) || 16, 50) / 16.67;
    last = now;

    if (now > modeUntil) {
      if (mode === 'drift') setMode('gather', now);
      else if (mode === 'gather') setMode('hold', now);
      else if (mode === 'hold') { flash = 0.5; burst(cx, cy, 5); setMode('burst', now); }
      else setMode('drift', now);
    }

    var shaping = mode === 'gather' || mode === 'hold';
    if (shaping) {
      spin += 0.0032 * dt;
      sphereTargets();
    }
    // ease-in so the pull-in starts gently instead of snapping
    var pull = mode === 'gather'
      ? 0.09 * (1 - (modeUntil - now) / GATHER_MS)
      : (mode === 'hold' ? 0.11 : 0);

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    var t = now * 0.0004;
    for (var i = 0; i < count; i++) {
      var p = parts[i];

      if (shaping) {
        p.vx += (p.tx - p.x) * pull * 0.1 * dt;
        p.vy += (p.ty - p.y) * pull * 0.1 * dt;
        p.vx *= 0.90; p.vy *= 0.90;
      } else {
        // flow field: cheap layered sines, enough to look like drifting light
        p.vx += Math.cos(p.y * 0.004 + t + p.ph) * 0.020 * dt;
        p.vy += Math.sin(p.x * 0.004 - t + p.ph) * 0.020 * dt;
        p.vx *= 0.975; p.vy *= 0.975;
      }

      if (pointerIn) {
        var dx = p.x - px, dy = p.y - py;
        var d2 = dx * dx + dy * dy;
        if (d2 < CURSOR_R * CURSOR_R) {
          var d = Math.sqrt(d2) || 1;
          var f = (1 - d / CURSOR_R) * CURSOR_F / d;
          p.vx += dx * f * 0.01 * dt;
          p.vy += dy * f * 0.01 * dt;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // wrap only while drifting; a wrap mid-shape would tear it apart
      if (!shaping) {
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      }

      var depth = shaping ? p.tz : 1;
      var big = p.r > 4;
      // large motes stay faint, otherwise they turn into blobs
      var size = (big ? p.r : p.r) * (shaping ? 0.75 + depth * 0.7 : 1);
      var a = (big ? 0.06 : (p.hot ? 0.85 : 0.42)) * (shaping ? 0.5 + depth * 0.6 : 1);
      if (a > 1) a = 1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, 6.283185);
      ctx.fillStyle = p.hot
        ? 'rgba(160,200,255,' + a.toFixed(3) + ')'
        : 'rgba(74,126,255,' + a.toFixed(3) + ')';
      ctx.fill();
    }

    if (flash > 0.01) {
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2);
      g.addColorStop(0, 'rgba(150,190,255,' + (flash * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(150,190,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - radius * 2.2, cy - radius * 2.2, radius * 4.4, radius * 4.4);
      flash *= 0.90;
    }

    ctx.globalCompositeOperation = 'source-over';
    if (running) raf = requestAnimationFrame(step);
  }

  // one static frame for reduced motion / when parked
  function drawStill() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < count; i++) {
      var p = parts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283185);
      ctx.fillStyle = p.r > 4
        ? 'rgba(74,126,255,0.06)'
        : (p.hot ? 'rgba(160,200,255,0.85)' : 'rgba(74,126,255,0.42)');
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function start() {
    if (running || still.matches) return;
    running = true;
    last = performance.now();
    if (!modeUntil) setMode('drift', last);
    else modeUntil = last + 1200; // resume without instantly firing a transition
    if (!raf) raf = requestAnimationFrame(step);
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  // ---- wiring -------------------------------------------------------------
  function resize() {
    measure();
    build();
    if (still.matches || !running) drawStill();
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }, { passive: true });

  if (fine.matches) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = hero.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      pointerIn = px > -CURSOR_R && px < W + CURSOR_R && py > -CURSOR_R && py < H + CURSOR_R;
    }, { passive: true });
    window.addEventListener('pointerleave', function () { pointerIn = false; });
  }

  // break it — but never swallow a click meant for a button or link
  hero.addEventListener('pointerdown', function (e) {
    if (still.matches) return;
    if (e.target.closest('a,button,input,textarea,select,label')) return;
    var r = hero.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    if (mode === 'gather' || mode === 'hold') {
      flash = 0.55;
      burst(cx, cy, 5.5);
      setMode('burst', performance.now());
    } else {
      burst(x, y, 2.2); // a nudge anywhere else
    }
  });

  // park the loop when it cannot be seen
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  }

  measure();
  build();

  if (still.matches) {
    drawStill();
  } else {
    start();
  }
})();
