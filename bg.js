/* Floating network background: drifting points linked by faint lines that reach toward the mouse. */
(function () {
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-network';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W, H, pts = [], mouse = { x: -9999, y: -9999 };
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LINK = 140;     // how close two points must be to connect
  var REACH = 180;    // how far the mouse reaches
  var SPEED = 0.18;   // drift speed

  function color() {
    return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#999';
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(90, W * H / 16000));
    pts = [];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      pts.push({ x: Math.random() * W, y: Math.random() * H,
                 vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    var c = color();
    ctx.strokeStyle = c; ctx.fillStyle = c;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!still) {
        // gentle pull toward the mouse
        var mx = mouse.x - p.x, my = mouse.y - p.y, md = Math.hypot(mx, my);
        if (md < REACH && md > 1) { p.vx += mx / md * 0.012; p.vy += my / md * 0.012; }
        var sp = Math.hypot(p.vx, p.vy), max = SPEED * 2.2;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        if (sp < SPEED * 0.6) { p.vx *= 1.02; p.vy *= 1.02; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      }
      for (var j = i + 1; j < pts.length; j++) {
        var q = pts[j], d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * 0.35; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      var dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (dm < REACH) {
        ctx.globalAlpha = (1 - dm / REACH) * 0.5; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.globalAlpha = 0.45;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; if (still) frame(); });
  window.addEventListener('mouseout', function () { mouse.x = mouse.y = -9999; });
  window.addEventListener('resize', function () { resize(); if (still) frame(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !still) requestAnimationFrame(frame); });
  resize(); frame();
})();
