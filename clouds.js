/* Soft drifting clouds + a gentle sun or moon, tinted to the visitor's time of day.
   Replaces bg.js. Load sky.js before this file. */
(function () {
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-network';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CLOUDS = 7;        // how many clouds
  var SPEED = 0.12;      // drift speed (px per frame)
  var SOFT = 0.8;        // cloud opacity

  var W, H, clouds = [], stars = [];
  function makeCloud(x) {
    var w = 160 + Math.random() * 220, puffs = [], n = 5 + Math.floor(Math.random() * 4);
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1);
      puffs.push({ dx: (u - .5) * w, dy: -Math.sin(Math.PI * u) * w * (.12 + Math.random() * .1) + (Math.random() - .5) * 10,
                   r: w * (.18 + Math.sin(Math.PI * u) * .16 + Math.random() * .05) });
    }
    return { x: x, y: H * (.08 + Math.random() * .8), puffs: puffs, w: w,
             v: SPEED * (.6 + Math.random() * .8), a: .6 + Math.random() * .4 };
  }
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clouds = []; for (var i = 0; i < CLOUDS; i++) clouds.push(makeCloud(Math.random() * (W + 400) - 200));
    stars = []; for (var j = 0; j < 60; j++) stars.push({ x: Math.random() * W, y: Math.random() * H * .7, r: .6 + Math.random() * 1.1, p: Math.random() * 6 });
  }

  function puff(x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y - r * .15, r * .1, x, y, r);
    g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
    g.addColorStop(.6, 'rgba(' + col + ',' + a * .55 + ')');
    g.addColorStop(1, 'rgba(' + col + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }

  function frame(now) {
    var s = window.skyState || { hour: 12, rise: 7, set: 19, cloud: [255, 255, 255], dark: false };
    var col = s.cloud.map(Math.round).join(',');
    ctx.clearRect(0, 0, W, H);

    // night-ness: 1 deep night, 0 day
    var h = s.hour, night = h < s.rise - .5 || h > s.set + .8 ? 1 : (h < s.rise + .5 ? (s.rise + .5 - h) : (h > s.set - .2 ? (h - s.set + .2) : 0));
    night = Math.max(0, Math.min(1, night));

    // stars (night only)
    if (night > 0) {
      stars.forEach(function (st) {
        var tw = .5 + .5 * Math.sin(now / 900 + st.p);
        ctx.fillStyle = s.dark ? 'rgba(255,255,255,' + (.7 * tw * night) + ')' : 'rgba(150,145,200,' + (.45 * tw * night) + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7); ctx.fill();
      });
    }

    // sun (day) or moon (night) gliding along an arc
    var day = (h - s.rise) / (s.set - s.rise), body, bx, by;
    if (day >= -.05 && day <= 1.05) { body = 'sun'; }
    else { body = 'moon'; var nh = h < s.rise ? h + 24 : h; day = (nh - s.set) / (24 - (s.set - s.rise)); }
    day = Math.max(0, Math.min(1, day));
    bx = W * (.08 + .84 * day); by = H * (.78 - .62 * Math.sin(Math.PI * day));
    var R = Math.min(W, H) * .32, g = ctx.createRadialGradient(bx, by, 0, bx, by, R);
    if (body === 'sun') {
      var warm = 1 - Math.sin(Math.PI * day);             // warmer near sunrise / sunset
      var c = [255, Math.round(225 - 60 * warm), Math.round(140 - 60 * warm)].join(',');
      g.addColorStop(0, 'rgba(' + c + ',' + (s.dark ? .30 : .45) + ')');
      g.addColorStop(.25, 'rgba(' + c + ',' + (s.dark ? .12 : .18) + ')');
      g.addColorStop(1, 'rgba(' + c + ',0)');
    } else {
      g.addColorStop(0, s.dark ? 'rgba(230,235,255,.28)' : 'rgba(200,205,240,.40)');
      g.addColorStop(.2, s.dark ? 'rgba(200,210,255,.08)' : 'rgba(190,195,235,.14)');
      g.addColorStop(1, 'rgba(200,210,255,0)');
    }
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R, 0, 7); ctx.fill();

    // clouds
    clouds.forEach(function (cl) {
      if (!still) cl.x += cl.v;
      if (cl.x - cl.w > W + 60) { var n = makeCloud(-cl.w - 60); cl.x = n.x; cl.y = n.y; cl.puffs = n.puffs; cl.w = n.w; cl.v = n.v; cl.a = n.a; }
      var a = SOFT * cl.a * (s.dark ? .45 : 1) * (1 - .35 * night);
      var shade = s.dark ? '20,24,40' : '150,165,200';
      cl.puffs.forEach(function (p) { puff(cl.x + p.dx, cl.y + p.dy + p.r * .22, p.r * 1.02, shade, a * (s.dark ? .5 : .28)); });
      cl.puffs.forEach(function (p) { puff(cl.x + p.dx, cl.y + p.dy, p.r, col, a); });
    });

    if (!still && !document.hidden) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () { resize(); if (still) frame(performance.now()); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !still) requestAnimationFrame(frame); });
  resize(); requestAnimationFrame(frame);
  if (still) setInterval(function () { frame(performance.now()); }, 60000);
})();
