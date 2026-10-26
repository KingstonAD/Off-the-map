/* Off the Map — vanilla helpers shared by every preview. No framework, no network. */
(function () {
  var CHARSET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%:,.-/+&\'';
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injectInk() {
    if (document.getElementById('otm-ink')) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML =
      '<filter id="otm-ink" x="-10%" y="-10%" width="120%" height="120%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="grain"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="grain" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="rough"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="blot"/>' +
        '<feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.1 0 0 0 1.95" result="m1"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="2" result="speck"/>' +
        '<feColorMatrix in="speck" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3 0 0 0 2.6" result="m2"/>' +
        '<feComposite in="m1" in2="m2" operator="in" result="mask"/>' +
        '<feComposite in="rough" in2="mask" operator="in"/>' +
      '</filter>';
    document.body.appendChild(svg);
  }

  function cell(ch, cls) {
    var c = document.createElement('span');
    c.className = 'otm-cell' + (cls ? ' ' + cls : '');
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<span class="h t"><b></b></span><span class="h b"><b></b></span><span class="h t f1"><b></b></span><span class="h b f2"><b></b></span>';
    setNow(c, ch || ' ');
    return c;
  }
  function parts(c) { var b = c.querySelectorAll('b'); return { t: b[0], b: b[1], f1: b[2], f2: b[3] }; }
  function setNow(c, ch) { var p = parts(c); p.t.textContent = p.b.textContent = p.f1.textContent = p.f2.textContent = ch; c.dataset.ch = ch; }
  function flipTo(c, ch) {
    var p = parts(c), old = c.dataset.ch || ' ';
    if (old === ch) return Promise.resolve();
    p.t.textContent = ch; p.b.textContent = old; p.f1.textContent = old; p.f2.textContent = ch;
    c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
    c.dataset.ch = ch;
    var fd = parseFloat(getComputedStyle(c).getPropertyValue('--fd')) || 55;
    return sleep(fd * 2 + 12).then(function () { p.b.textContent = ch; c.classList.remove('go'); });
  }
  // Spin a cell through a few characters (Solari-style, forward through the drum) and land on target.
  function spin(c, target, extra) {
    if (reduced) { setNow(c, target); return Promise.resolve(); }
    var cur = CHARSET.indexOf(c.dataset.ch || ' '); if (cur < 0) cur = 0;
    var ti = CHARSET.indexOf(target); if (ti < 0) { return flipTo(c, target); }
    var dist = (ti - cur + CHARSET.length) % CHARSET.length;
    var steps = Math.min(dist, 4 + (extra || 0) + Math.floor(Math.random() * 5));
    var seq = [];
    for (var i = steps - 1; i >= 1; i--) seq.push(CHARSET[(ti - i + CHARSET.length) % CHARSET.length]);
    seq.push(target);
    return seq.reduce(function (pr, ch) { return pr.then(function () { return flipTo(c, ch); }); }, Promise.resolve());
  }

  /* board(el, lines, {cols, size:'sm'|'xl'|'', align:'left'|'center', dim}) → {set(lines), cells} */
  function board(el, lines, opts) {
    opts = opts || {};
    var cols = opts.cols || 14, rowsN = opts.rows || lines.length;
    el.innerHTML = '';
    el.setAttribute('role', 'img');
    var rows = [];
    for (var r = 0; r < rowsN; r++) {
      var row = document.createElement('div'); row.className = 'otm-row';
      var cs = [];
      for (var k = 0; k < cols; k++) { var c = cell(' ', opts.size || ''); row.appendChild(c); cs.push(c); }
      el.appendChild(row); rows.push(cs);
    }
    function pad(s) {
      s = (s || '').toUpperCase().slice(0, cols);
      if (opts.align === 'center') { var l = Math.floor((cols - s.length) / 2); s = new Array(l + 1).join(' ') + s; }
      while (s.length < cols) s += ' ';
      return s;
    }
    function set(ls, o) {
      o = o || {};
      el.setAttribute('aria-label', ls.join(' ').trim());
      var all = [];
      rows.forEach(function (cs, r) {
        var s = pad(ls[r]);
        cs.forEach(function (c, k) {
          var d = (o.stagger === 0 ? 0 : (r * 90 + k * 28));
          all.push(sleep(d).then(function () { return o.direct ? flipTo(c, s[k]) : spin(c, s[k], o.extra || 0); }));
        });
      });
      return Promise.all(all);
    }
    function setInstant(ls) { rows.forEach(function (cs, r) { var s = pad(ls[r]); cs.forEach(function (c, k) { setNow(c, s[k]); }); }); el.setAttribute('aria-label', ls.join(' ').trim()); }
    if (opts.instant) setInstant(lines); else set(lines);
    return { set: set, setInstant: setInstant, rows: rows };
  }

  function stampSlam(stampEl, shakeEl) {
    stampEl.classList.remove('slam'); if (shakeEl) shakeEl.classList.remove('otm-shake');
    void stampEl.offsetWidth;
    stampEl.classList.add('slam'); if (shakeEl) shakeEl.classList.add('otm-shake');
  }

  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function countUp(el, to, ms, from) {
    from = from || 0; ms = reduced ? 1 : (ms || 1600);
    var t0 = performance.now();
    return new Promise(function (res) {
      (function tick(now) {
        var p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(tick); else res();
      })(t0);
    });
  }

  /* gate(el, {seconds, loop, onTick, onEnd}) — drives .otm-gate markup */
  function gate(el, o) {
    o = o || {}; var total = o.seconds || 20, t0 = performance.now(), stopped = false;
    var timeEl = el.querySelector('.g-time');
    function frame(now) {
      if (stopped) return;
      var left = Math.max(0, total - (now - t0) / 1000);
      el.style.setProperty('--frac', (left / total).toFixed(4));
      if (timeEl) timeEl.textContent = '0:' + String(Math.ceil(left)).padStart(2, '0');
      el.classList.toggle('final', left <= 3 && left > 0);
      if (o.onTick) o.onTick(left);
      if (left <= 0) {
        el.classList.remove('final');
        if (o.onEnd) o.onEnd();
        if (o.loop) { setTimeout(function () { t0 = performance.now(); requestAnimationFrame(frame); }, o.pause || 1400); }
        return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { stop: function () { stopped = true; }, restart: function () { t0 = performance.now(); } };
  }

  /* seconds until the next 12:00 AM America/New_York */
  function secsToNextFlight() {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
    return 86400 - ((p.hour % 24) * 3600 + p.minute * 60 + p.second);
  }
  function hms(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return [h, m, x].map(function (v) { return String(v).padStart(2, '0'); }).join(':'); }

  var TIERS = {
    tourist: { name: 'Tourist', cls: 't-tourist', emoji: '⬜' },
    backpacker: { name: 'Backpacker', cls: 't-backpacker', emoji: '🟩' },
    explorer: { name: 'Explorer', cls: 't-explorer', emoji: '🟦' },
    uncharted: { name: 'Uncharted', cls: 't-uncharted', emoji: '🟪' },
    lost: { name: 'Lost Luggage', cls: 't-lost', emoji: '⬛' }
  };
  /* Red-Eye is a badge, not a tier: correct answer with 3 seconds or less left. No km. */
  var REDEYE = { name: 'Red-Eye', cls: 't-redeye', emoji: '⏰' };

  /* Scoring: tier from share of players; km = 5,725 × log(1/share) ÷ log(100), capped at 5,725. */
  var MAX_STOP = 5725, CIRCUMFERENCE = 40075;
  function kmFor(share) { if (!(share > 0)) return MAX_STOP; return Math.round(Math.min(MAX_STOP, Math.max(0, MAX_STOP * Math.log(1 / share) / Math.log(100)))); }
  function tierFor(share) { return share >= 0.25 ? 'tourist' : share >= 0.10 ? 'backpacker' : share >= 0.03 ? 'explorer' : 'uncharted'; }

  /* A sample flight used across the screens (km computed from share) */
  var SAMPLE = [
    { prompt: 'Name a capital on the Danube', answer: 'Bratislava', pct: 19 },
    { prompt: 'Name a river in South America', answer: 'Amazon', pct: 58 },
    { prompt: 'Name a country bordering China', answer: 'Kyrgyzstan', pct: 6 },
    { prompt: 'Name an island nation in Africa', answer: 'Comoros', pct: 2 },
    { prompt: 'Name a country with a red and white flag', answer: 'Latvia', pct: 5, redeye: true, left: 2 },
    { prompt: 'Name a US state capital starting with M', answer: 'Montpelier', pct: 24 },
    { prompt: 'Name a landlocked country in Europe', answer: '', pct: 0, lost: true }
  ].map(function (s) {
    s.tier = s.lost ? 'lost' : tierFor(s.pct / 100);
    s.km = s.lost ? 0 : kmFor(s.pct / 100);
    return s;
  });

  function phone(root) {
    root.classList.add('otm-phone');
    var sb = document.createElement('div'); sb.className = 'otm-status';
    sb.innerHTML = '<span>9:41</span><i aria-hidden="true">▮▮▮ ● 100</i>';
    root.insertBefore(sb, root.firstChild);
    var hi = document.createElement('div'); hi.className = 'otm-home-ind'; root.appendChild(hi);
  }

  window.OffTheMap = {
    injectInk: injectInk, board: board, cell: cell, spin: spin, stampSlam: stampSlam,
    countUp: countUp, fmt: fmt, gate: gate, secsToNextFlight: secsToNextFlight, hms: hms,
    TIERS: TIERS, REDEYE: REDEYE, SAMPLE: SAMPLE, kmFor: kmFor, tierFor: tierFor, MAX_STOP: MAX_STOP, CIRCUMFERENCE: CIRCUMFERENCE, phone: phone, sleep: sleep, reduced: reduced
  };
  if (document.body) injectInk(); else document.addEventListener('DOMContentLoaded', injectInk);
})();
