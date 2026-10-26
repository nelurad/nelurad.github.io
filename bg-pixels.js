/* Holographic pixel field: a grid of tiny tiles whose iridescent colors flow like liquid,
   with a soft ripple that follows the cursor. Drop-in alternative to bg.js. */
(function () {
  var canvas = document.createElement('canvas');
  canvas.className = 'bg-network';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');

  var CELL = 9;         // tile size in px (smaller = finer pixels)
  var GAP = 2;          // gap between tiles in px
  var SPEED = 0.00012;  // how fast the colors flow
  var STRENGTH = 0.30;  // overall visibility (0–1)

  var W, H, cols, rows, small, sctx, img, gapPattern;
  var mouse = { x: -1e4, y: -1e4, s: 0 };

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    cols = Math.ceil(W / CELL) + 1; rows = Math.ceil(H / CELL) + 1;
    small = document.createElement('canvas'); small.width = cols; small.height = rows;
    sctx = small.getContext('2d'); img = sctx.createImageData(cols, rows);
    // a tile-shaped mask so each "pixel" has a little gap around it
    var p = document.createElement('canvas'); p.width = p.height = CELL * dpr;
    var pc = p.getContext('2d'); pc.fillStyle = '#000';
    pc.fillRect(0, 0, CELL * dpr, GAP * dpr); pc.fillRect(0, 0, GAP * dpr, CELL * dpr);
    gapPattern = ctx.createPattern(p, 'repeat');
  }

  // smooth flowing field from layered sine waves (cheap "noise")
  function field(x, y, t) {
    return (Math.sin(x * 0.16 + t * 1.3 + 1.6 * Math.sin(y * 0.11 + t)) +
            Math.sin(y * 0.14 - t * 0.9 + 1.6 * Math.sin(x * 0.08 - t * 0.7)) +
            Math.sin((x - y) * 0.09 + t * 0.6) * 0.8) / 2.8 * 0.5 + 0.5;
  }
  function hsl(h, s, l) {      // -> [r,g,b]
    h = ((h % 360) + 360) % 360 / 360;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }

  function frame(now) {
    var t = now * SPEED * 10, d = img.data, dark = darkMq.matches;
    var mc = mouse.x / CELL, mr = mouse.y / CELL;
    mouse.s += ((mouse.x > -1e3 ? 1 : 0) - mouse.s) * 0.06;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var v = field(c, r, t);
        // cool, techy sweep: deep teal -> electric cyan -> cobalt -> indigo, with rare violet glints
        var hue = 215 + 48 * Math.sin(v * 6.0 + t * 0.4 + (c - r) * 0.02);
        var glint = Math.max(0, Math.sin(v * 13 - t * 1.7 + c * 0.05)) ;
        hue += glint * glint * glint * 50;
        var rgb = hsl(hue, dark ? .85 : .9, dark ? .58 : .44);
        var a = Math.max(0, (v - 0.48) / 0.45);  // flowing patches, not a solid sheet
        a = a * a * (3 - 2 * a);
        // keep the middle (where your text sits) mostly clear; pixels live around the edges
        var ex = (c * CELL - W / 2) / (Math.min(W, 760) / 2), ey = (r * CELL - H * 0.47) / (H * 0.46);
        var e = Math.sqrt(ex * ex + ey * ey), clear = Math.min(1, Math.max(0, (e - 0.55) / 0.5));
        a *= 0.12 + 0.88 * clear * clear * (3 - 2 * clear);
        // ripple ring around the cursor
        var dist = Math.hypot(c - mc, r - mr);
        if (dist < 14) a += mouse.s * (0.5 + 0.5 * Math.sin(dist * 0.9 - now * 0.006)) * (1 - dist / 14) * 0.9;
        var i = (r * cols + c) * 4;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
        d[i + 3] = Math.min(255, a * 255 * STRENGTH * (dark ? .8 : 1.45));
      }
    }
    sctx.putImageData(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;                 // crisp square pixels
    ctx.drawImage(small, 0, 0, cols * CELL * dpr, rows * CELL * dpr);
    ctx.globalCompositeOperation = 'destination-out';  // cut the little gaps between tiles
    ctx.fillStyle = gapPattern; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }

  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; if (still) frame(performance.now()); });
  window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { mouse.x = mouse.y = -1e4; } });
  window.addEventListener('touchmove', function (e) { var p = e.touches[0]; mouse.x = p.clientX; mouse.y = p.clientY; }, { passive: true });
  window.addEventListener('touchend', function () { mouse.x = mouse.y = -1e4; });
  window.addEventListener('resize', function () { resize(); if (still) frame(performance.now()); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !still) requestAnimationFrame(frame); });
  resize(); requestAnimationFrame(frame);
})();
