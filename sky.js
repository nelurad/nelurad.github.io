/* Time-of-day sky: tints the soft blurred background to match the visitor's local sky.
   Uses only the visitor's clock (no location, no permissions). Load after style.css. */
(function () {
  var root = document.documentElement;
  var darkMq = window.matchMedia('(prefers-color-scheme: dark)');

  // [base color, blob1, blob2, blob3, blob4] as [r,g,b,a]
  var LIGHT = {
    night:   [[236,238,248,1],[120,130,205,.30],[150,120,205,.28],[ 95,115,180,.26],[170,170,225,.26]],
    dawn:    [[251,243,240,1],[255,188,165,.42],[248,168,200,.36],[190,170,240,.30],[255,218,180,.36]],
    morning: [[242,247,253,1],[150,200,245,.40],[190,225,250,.42],[255,232,185,.30],[165,215,235,.36]],
    midday:  [[238,246,253,1],[115,182,245,.42],[165,212,250,.42],[205,232,255,.42],[135,198,240,.36]],
    golden:  [[253,245,236,1],[255,198,125,.44],[255,168,138,.36],[150,190,240,.30],[255,224,165,.40]],
    dusk:    [[246,239,246,1],[240,148,170,.40],[170,140,222,.36],[255,178,140,.32],[120,140,212,.32]]
  };
  var DARK = {
    night:   [[ 12, 13, 24,1],[ 45, 55,130,.30],[ 80, 50,140,.26],[ 30, 60,120,.24],[ 70, 70,150,.22]],
    dawn:    [[ 22, 16, 22,1],[200,110, 90,.22],[180, 80,130,.22],[110, 80,190,.20],[210,150, 90,.18]],
    morning: [[ 14, 18, 26,1],[ 60,120,200,.24],[ 90,150,210,.22],[200,170, 90,.14],[ 60,140,170,.20]],
    midday:  [[ 13, 18, 27,1],[ 50,120,210,.26],[ 80,150,220,.24],[110,170,230,.20],[ 50,130,190,.22]],
    golden:  [[ 24, 18, 14,1],[220,140, 60,.24],[210,110, 80,.20],[ 70,110,190,.16],[230,170, 80,.20]],
    dusk:    [[ 20, 14, 22,1],[190, 80,120,.24],[110, 70,190,.24],[210,110, 80,.18],[ 60, 80,170,.22]]
  };

  var CLOUD_LIGHT = { night:[225,228,245], dawn:[255,236,232], morning:[255,255,255], midday:[255,255,255], golden:[255,240,222], dusk:[250,226,236] };
  var CLOUD_DARK  = { night:[120,130,170], dawn:[200,150,160], morning:[170,185,210], midday:[175,195,220], golden:[210,170,130], dusk:[180,130,170] };

  function dayOfYear(d) { return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); }

  // Approximate location from the visitor's time zone (no permission prompt, nothing sent anywhere).
  var TZ_PLACES = {
    'America/New_York':[40.7,-74],'America/Detroit':[42.3,-83],'America/Toronto':[43.7,-79.4],'America/Chicago':[41.9,-87.6],
    'America/Denver':[39.7,-105],'America/Phoenix':[33.4,-112],'America/Los_Angeles':[34.1,-118.2],'America/Vancouver':[49.3,-123.1],
    'America/Anchorage':[61.2,-149.9],'Pacific/Honolulu':[21.3,-157.9],'America/Halifax':[44.6,-63.6],'America/Mexico_City':[19.4,-99.1],
    'America/Bogota':[4.7,-74.1],'America/Lima':[-12,-77],'America/Sao_Paulo':[-23.5,-46.6],'America/Argentina/Buenos_Aires':[-34.6,-58.4],
    'America/Santiago':[-33.4,-70.7],'Europe/London':[51.5,-0.1],'Europe/Dublin':[53.3,-6.3],'Europe/Lisbon':[38.7,-9.1],
    'Europe/Madrid':[40.4,-3.7],'Europe/Paris':[48.9,2.4],'Europe/Berlin':[52.5,13.4],'Europe/Amsterdam':[52.4,4.9],
    'Europe/Rome':[41.9,12.5],'Europe/Stockholm':[59.3,18.1],'Europe/Athens':[38,23.7],'Europe/Istanbul':[41,29],
    'Europe/Moscow':[55.8,37.6],'Africa/Cairo':[30,31.2],'Africa/Lagos':[6.5,3.4],'Africa/Nairobi':[-1.3,36.8],
    'Africa/Johannesburg':[-26.2,28],'Asia/Dubai':[25.3,55.3],'Asia/Tehran':[35.7,51.4],'Asia/Karachi':[24.9,67],
    'Asia/Kolkata':[19.1,72.9],'Asia/Calcutta':[19.1,72.9],'Asia/Dhaka':[23.8,90.4],'Asia/Bangkok':[13.8,100.5],
    'Asia/Singapore':[1.35,103.8],'Asia/Jakarta':[-6.2,106.8],'Asia/Shanghai':[31.2,121.5],'Asia/Hong_Kong':[22.3,114.2],
    'Asia/Taipei':[25,121.6],'Asia/Seoul':[37.6,127],'Asia/Tokyo':[35.7,139.7],'Australia/Perth':[-31.95,115.9],
    'Australia/Adelaide':[-34.9,138.6],'Australia/Brisbane':[-27.5,153],'Australia/Sydney':[-33.9,151.2],
    'Australia/Melbourne':[-37.8,145],'Pacific/Auckland':[-36.8,174.8]
  };
  var SOUTH = /^(Australia|Antarctica)\/|^Pacific\/(Auckland|Fiji|Chatham)|^America\/(Sao_Paulo|Argentina|Santiago|Montevideo|Asuncion|La_Paz|Lima)|^Africa\/(Johannesburg|Maputo|Harare|Windhoek|Lusaka)|^Indian\/(Mauritius|Reunion)/;

  function timeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  function place(d) {
    var tz = timeZone(), p = TZ_PLACES[tz];
    if (p) return { lat: p[0], lon: p[1] };
    var offH = -d.getTimezoneOffset() / 60;                       // rough guess from the UTC offset
    return { lat: SOUTH.test(tz) ? -33 : 38, lon: offH * 15 };
  }

  // Sunrise / sunset in the visitor's local clock hours, for their (approximate) place and today's date
  function sunTimes(d) {
    var p = place(d), N = dayOfYear(d), rad = Math.PI / 180;
    var decl = 23.44 * Math.sin(2 * Math.PI * (284 + N) / 365) * rad;
    var B = 2 * Math.PI * (N - 81) / 364;
    var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);       // minutes
    var tzH = -d.getTimezoneOffset() / 60;
    var noon = 12 - p.lon / 15 + tzH - eot / 60;
    var cosW = (Math.sin(-0.833 * rad) - Math.sin(p.lat * rad) * Math.sin(decl)) / (Math.cos(p.lat * rad) * Math.cos(decl));
    cosW = Math.max(-1, Math.min(1, cosW));                                          // polar day / night safe
    var half = Math.acos(cosW) / rad / 15;
    return { rise: noon - half, set: noon + half, noon: noon };
  }

  function mix(a, b, t) { return a.map(function (c, i) { return c.map(function (v, j) { return v + (b[i][j] - v) * t; }); }); }
  function rgba(c) { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + c[3].toFixed(2) + ')'; }

  function skyAt(hour, d) {
    var s = sunTimes(d), P = darkMq.matches ? DARK : LIGHT, C = darkMq.matches ? CLOUD_DARK : CLOUD_LIGHT;
    function withCloud(a, b, t) {
      var m = mix(a.p, b.p, t), ca = C[a.n], cb = C[b.n];
      m.cloud = ca.map(function (v, i) { return v + (cb[i] - v) * t; });
      return m;
    }
    var stops = [
      [s.rise - 1.3, 'night'], [s.rise, 'dawn'], [s.rise + 2, 'morning'], [s.noon, 'midday'],
      [s.set - 1.6, 'golden'], [s.set, 'dusk'], [s.set + 1.3, 'night']
    ];
    var N = { p: P.night, n: 'night' };
    if (hour <= stops[0][0] || hour >= stops[stops.length - 1][0]) return withCloud(N, N, 0);
    for (var i = 0; i < stops.length - 1; i++) {
      if (hour < stops[i + 1][0]) {
        var t = (hour - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        t = t * t * (3 - 2 * t);                       // smooth blend
        return withCloud({ p: P[stops[i][1]], n: stops[i][1] }, { p: P[stops[i + 1][1]], n: stops[i + 1][1] }, t);
      }
    }
    return withCloud(N, N, 0);
  }

  function apply(hourOverride) {
    var d = new Date();
    var hour = hourOverride != null ? hourOverride : d.getHours() + d.getMinutes() / 60;
    var c = skyAt(hour, d);
    root.style.background = rgba(c[0]);
    for (var i = 1; i <= 4; i++) root.style.setProperty('--blob' + i, rgba(c[i]));
    var st = sunTimes(d);
    window.skyState = { hour: hour, rise: st.rise, set: st.set, cloud: c.cloud, dark: darkMq.matches };
  }

  window.skyPreview = apply;            // for previewing only: skyPreview(18) shows 6pm; skyPreview() = now
  function refresh() { if (!window.__skyLocked) apply(); }
  apply();
  // keep in sync: every 15 seconds, whenever the tab/laptop wakes up or regains focus,
  // and right away if the computer's time zone changes (e.g. after a flight)
  var lastTz = timeZone(), lastOffset = new Date().getTimezoneOffset();
  setInterval(function () {
    var tz = timeZone(), off = new Date().getTimezoneOffset();
    if (tz !== lastTz || off !== lastOffset) { lastTz = tz; lastOffset = off; }
    refresh();
  }, 15000);
  ['focus', 'pageshow', 'timezonechange'].forEach(function (ev) { window.addEventListener(ev, refresh); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  darkMq.addEventListener && darkMq.addEventListener('change', function () { apply(); });
})();
