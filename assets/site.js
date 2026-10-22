// AML test site: home-page flow animation, publication search, and year bar.

// ---- Hero: tracer particles carried by a von Kármán vortex street ----
(() => {
  const canvas = document.getElementById('flow');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, parts = [], vort = [], street = null, speed = 1, running = true, pointer = null, raf = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = Math.max(200, Math.min(380, W / 3.6));
    street = { L, h: 0.281 * L, y0: H * 0.34, G: 1.15 * L, a2: (0.12 * L) ** 2 };
    vort = [];
    for (let k = -2; k < W / L + 3; k++) {
      vort.push({ x: k * L, y: street.y0 - street.h / 2, s: 1 });
      vort.push({ x: k * L + L / 2, y: street.y0 + street.h / 2, s: -1 });
    }
    speed = Math.max(0.7, Math.min(1.6, W / 900));
    const n = Math.round(Math.min(1700, W * 1.25));
    parts = Array.from({ length: n }, () => spawn(true));
    ctx.clearRect(0, 0, W, H);
  }

  function gauss() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); }

  function spawn(anywhere) {  // dye is released in a band around the wake, like a smoke-wire visualization
    return { x: anywhere ? Math.random() * W : -Math.random() * 60, y: street.y0 + gauss() * 1.05 * street.h,
             life: 260 + Math.random() * 520 };
  }

  function velocity(x, y) {
    let u = 1, v = 0;
    const { G, a2 } = street;
    for (const p of vort) {
      const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + 1e-6;
      const f = (p.s * G / (2 * Math.PI * r2)) * (1 - Math.exp(-r2 / a2));
      u -= dy * f; v += dx * f;
    }
    if (pointer) {  // the cursor stirs the flow like a small rotating cylinder
      const dx = x - pointer.x, dy = y - pointer.y, r2 = dx * dx + dy * dy + 1e-6;
      const f = (0.9 * street.L * pointer.k / (2 * Math.PI * r2)) * (1 - Math.exp(-r2 / (0.5 * street.a2)));
      u -= dy * f; v += dx * f;
    }
    return [u, v];
  }

  function step(draw) {
    const drift = 0.62 * speed, span = vort.length / 2 * street.L;
    for (const p of vort) { p.x += drift; if (p.x > W + 2 * street.L) p.x -= span; }
    if (pointer) { pointer.k *= 0.985; if (pointer.k < 0.02) pointer = null; }
    if (draw) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.028)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    const buckets = [new Path2D(), new Path2D(), new Path2D()];
    for (const q of parts) {
      const [u, v] = velocity(q.x, q.y);
      const nx = q.x + u * speed * 1.6, ny = q.y + v * speed * 1.6;
      const sp = Math.hypot(u, v);
      const b = sp > 1.55 ? 2 : sp > 1.1 ? 1 : 0;
      buckets[b].moveTo(q.x, q.y); buckets[b].lineTo(nx, ny);
      q.x = nx; q.y = ny; q.life -= 1;
      if (q.x > W + 10 || q.y < -20 || q.y > H + 20 || q.life <= 0) Object.assign(q, spawn(q.life <= 0));
    }
    if (draw) {
      ctx.lineWidth = 1.15; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(200,168,255,0.30)'; ctx.stroke(buckets[0]);
      ctx.strokeStyle = 'rgba(228,210,255,0.50)'; ctx.stroke(buckets[1]);
      ctx.strokeStyle = 'rgba(255,255,255,0.78)'; ctx.stroke(buckets[2]);
    }
  }

  function frame() {
    if (!running) { raf = 0; return; }
    step(true);
    raf = requestAnimationFrame(frame);
  }

  resize();
  if (reduce) {  // one still image of the streaks instead of motion
    for (let i = 0; i < 90; i++) step(true);
  } else {
    raf = requestAnimationFrame(frame);
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running && !raf) raf = requestAnimationFrame(frame); }).observe(canvas);
    const hero = canvas.parentElement;
    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top, k: 1 };
    });
  }
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(resize, 150); });
})();

// ---- Publications: live search and year bar ----
(() => {
  const q = document.getElementById('pub-q');
  if (!q) return;
  const arts = [...document.querySelectorAll('.pub')];
  const sections = [...document.querySelectorAll('.pub-year')];
  const hay = arts.map(a => a.textContent.toLowerCase().replace(/\s+/g, ' '));
  const count = document.getElementById('pub-count');
  q.addEventListener('input', () => {
    const terms = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let n = 0;
    arts.forEach((a, i) => { const ok = terms.every(t => hay[i].includes(t)); a.hidden = !ok; if (ok) n++; });
    sections.forEach(s => { s.hidden = !s.querySelector('.pub:not([hidden])'); });
    count.textContent = terms.length ? `${n} of ${arts.length} papers` : `${arts.length} papers`;
  });
  const chips = new Map([...document.querySelectorAll('.pub-jump a')].map(a => [a.getAttribute('href').slice(1), a]));
  const seen = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { chips.forEach(c => c.classList.remove('on')); chips.get(e.target.id)?.classList.add('on'); }
    });
  }, { rootMargin: '-80px 0px -70% 0px' });
  sections.forEach(s => seen.observe(s));
})();
