/* ------------------------------------------------------------
   Portfolio — theme toggle, scroll reveal, active nav link.
   No dependencies, no build step.
   ------------------------------------------------------------ */

(function () {
  'use strict';

  var root = document.documentElement;

  /* ── theme ─────────────────────────────────────────────── */

  var STORAGE_KEY = 'jch-theme';

  function storedTheme() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // The inline <head> script already applied this before first paint; repeated
  // here so the toggle still works if that script was stripped.
  var saved = storedTheme();
  if (saved === 'dark' || saved === 'light') root.setAttribute('data-theme', saved);

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* private mode — fine */ }
    });
  }

  /* ── scroll reveal + active nav link ───────────────────────
     Both are driven by one rAF-throttled scroll pass rather than
     IntersectionObserver. IO is the tidier API, but it is paused
     while a tab is backgrounded and its first callback can be
     deferred — which left the page stuck at opacity 0 in embedded
     previews. Measuring rects directly always runs.
     -------------------------------------------------------------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  // Fraction of the viewport ignored at the top and bottom edges. A block is
  // shown once it reaches into the band, and fades again once it leaves — so
  // the fade happens at the edges of the screen, never under the reader's eye.
  var EDGE = 0.14;
  var NAV_OFFSET = 120;

  function sync() {
    var vh = window.innerHeight || root.clientHeight;
    var bandTop = vh * EDGE;
    var bandBottom = vh - vh * EDGE;

    // Two passes: measure everything first, then write. Interleaving reads and
    // class changes would force a synchronous layout on every iteration.
    var shown = [];
    for (var i = 0; i < reveals.length; i++) {
      var r = reveals[i].getBoundingClientRect();
      // Overlaps the band at all — covers blocks taller than the viewport.
      shown[i] = r.bottom > bandTop && r.top < bandBottom;
    }
    for (var n = 0; n < reveals.length; n++) {
      reveals[n].classList.toggle('is-visible', shown[n]);
    }

    if (sections.length) {
      var activeId = null;
      for (var j = 0; j < sections.length; j++) {
        if (sections[j].getBoundingClientRect().top <= NAV_OFFSET) activeId = sections[j].id;
      }
      // Bottom of the page: make sure the final section wins even if it is
      // short enough never to reach the offset.
      if (window.innerHeight + window.scrollY >= root.scrollHeight - 2) {
        activeId = sections[sections.length - 1].id;
      }
      for (var k = 0; k < navLinks.length; k++) {
        navLinks[k].classList.toggle('is-active', navLinks[k].getAttribute('href') === '#' + activeId);
      }
    }
  }

  // Called straight from the scroll event rather than through
  // requestAnimationFrame: rAF is paused whenever the document is hidden, and
  // some embedded preview panes report hidden even while on screen, which left
  // the reveal frozen. The two-pass sync above is cheap enough to run inline.
  sync();
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  // Images and fonts settling can shift every offset on the page, so re-run
  // once everything has its final height.
  window.addEventListener('load', sync);
  document.addEventListener('visibilitychange', sync);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(sync); }
  setTimeout(sync, 300);

  // Safety net. Some embedded preview panes (and background tabs) never deliver
  // scroll events and pause requestAnimationFrame, which would leave the reveal
  // frozen at whatever it computed on load. Polling the offset costs a single
  // property read and only does real work when the page has actually moved.
  var lastY = -1;
  setInterval(function () {
    var y = window.scrollY || root.scrollTop || 0;
    if (y === lastY) return;
    lastY = y;
    sync();
  }, 150);

  /* ── hero line reveal ─────────────────────────────────────
     Splits the hero copy into its rendered lines and wraps each one so
     it can rise into place. Lines depend on where the text actually
     wraps, which changes with width and with the webfont, so this
     re-runs on resize and once the fonts have settled.
     -------------------------------------------------------------- */

  var hero = document.querySelector('.hero');
  var lineEls = hero ? Array.prototype.slice.call(hero.querySelectorAll('[data-lines]')) : [];

  // The hero portrait is optional. If the file is not there, drop the whole
  // figure rather than showing a broken image — the text column then takes the
  // full width, and the re-split below fixes the line breaks for that width.
  var portrait = hero && hero.querySelector('.hero__portrait img');
  if (portrait) {
    var dropPortrait = function () {
      var fig = portrait.closest('.hero__portrait');
      if (fig) fig.remove();
      maybeSplit(true);
    };
    portrait.addEventListener('error', dropPortrait);
    // This script runs at the end of the body, by which point the request has
    // usually already resolved — so a failure that happened before the listener
    // was attached would otherwise go unnoticed.
    if (portrait.complete && portrait.naturalWidth === 0) dropPortrait();
  }

  function splitOne(el, startIndex) {
    if (el.dataset.original === undefined) el.dataset.original = el.innerHTML;
    el.innerHTML = el.dataset.original;

    // Tokenise: text becomes word spans, existing elements stay whole so
    // inline markup inside the hero survives the split.
    var tokens = [];
    var staged = document.createDocumentFragment();
    var source = Array.prototype.slice.call(el.childNodes);
    // Empty the element first. Building the word spans without this leaves the
    // original text in place too, and the tokens are then measured against a
    // doubled-up paragraph — which silently corrupts where the lines break.
    while (el.firstChild) el.removeChild(el.firstChild);
    source.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { staged.appendChild(document.createTextNode(' ')); return; }
          // A browser may break a word after a hyphen, so "reinforcement-learning"
          // is two places a line can end. Treating it as one token strands the
          // tail on a line of its own. Each chunk keeps its own hyphen, and only
          // the first one takes a leading space when the line is reassembled.
          var chunks = part.match(/[^-]*-|[^-]+/g) || [part];
          chunks.forEach(function (chunk, ci) {
            var w = document.createElement('span');
            w.textContent = chunk;
            staged.appendChild(w);
            tokens.push({ el: w, space: ci === 0 });
          });
        });
      } else {
        staged.appendChild(node);
        if (node.nodeType === 1) tokens.push({ el: node, space: true });
      }
    });
    el.appendChild(staged);

    if (!tokens.length) return 0;

    // Group tokens that share a vertical offset — that is one rendered line.
    var lines = [], current = null, lastTop = null;
    tokens.forEach(function (t) {
      var top = t.el.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 2) {
        current = []; lines.push(current); lastTop = top;
      }
      current.push(t);
    });

    var out = document.createDocumentFragment();
    lines.forEach(function (lineTokens, i) {
      var outer = document.createElement('span');
      outer.className = 'ln';
      var inner = document.createElement('span');
      inner.className = 'ln__i';
      inner.style.setProperty('--l', startIndex + i);
      lineTokens.forEach(function (t, j) {
        if (j && t.space) inner.appendChild(document.createTextNode(' '));
        inner.appendChild(t.el);       // moves the node out of its old parent
      });
      // Each line is its own block, so without this the text would copy and
      // read back as "backendsystems" across the wrap. Skipped when the next
      // line continues a hyphenated word, which takes no space.
      var next = lines[i + 1];
      if (next && next[0].space) inner.appendChild(document.createTextNode(' '));
      outer.appendChild(inner);
      out.appendChild(outer);
    });

    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(out);
    return lines.length;
  }

  function splitHero() {
    if (!hero || !lineEls.length) return;
    try {
      var index = 0;
      lineEls.forEach(function (el) { index += splitOne(el, index); });
      // The buttons land after the last line rather than with it.
      var links = hero.querySelector('.hero__links');
      if (links) links.style.setProperty('--i', index + 1);
    } finally {
      // Always mark it split. The stylesheet hides the hero copy until this
      // class lands, so bailing out without it would leave the page headless.
      hero.classList.add('is-split');
    }
    sync();
  }

  // Where the text wraps depends on the webfont's metrics. document.fonts.ready
  // can resolve before a stylesheet-driven font has actually started loading,
  // so ask for the two faces explicitly and only then measure. The race caps
  // the wait: a slow font must not hold the hero hostage.
  function fontsSettled() {
    var waits = [];
    if (document.fonts) {
      if (document.fonts.load) {
        try {
          waits.push(document.fonts.load('1rem Manrope'));
          waits.push(document.fonts.load('700 3rem "Bricolage Grotesque"'));
        } catch (e) { /* older engines — fall through to the timeout */ }
      }
      if (document.fonts.ready) waits.push(document.fonts.ready);
    }
    return Promise.race([
      Promise.all(waits)['catch'](function () {}),
      new Promise(function (done) { setTimeout(done, 1200); })
    ]);
  }

  // Re-split only when something that changes the wrap has actually changed:
  // the measuring width, or the font finally arriving. Cheap enough to poll a
  // few times while the page settles, which avoids betting the layout on any
  // single "everything is ready now" event — none of them is reliable.
  var lastSignature = '';
  function maybeSplit(force) {
    if (!hero || !lineEls.length) return;
    // Measure the element the text actually wraps inside. Watching the outer
    // container would miss the text column narrowing beside the portrait, or
    // widening again if the portrait is removed.
    var gauge = lineEls[0];
    var signature = (gauge ? gauge.clientWidth : 0) + '|' +
                    (document.fonts ? document.fonts.status : 'na');
    if (!force && signature === lastSignature) return;
    lastSignature = signature;
    splitHero();
  }

  if (hero && lineEls.length) {
    fontsSettled().then(function () {
      maybeSplit(true);
      setTimeout(function () { hero.classList.add('is-lit'); }, 60);
    });

    // The wrap can still shift as late CSS, images and fonts land.
    [300, 900, 2000].forEach(function (ms) { setTimeout(function () { maybeSplit(); }, ms); });
    window.addEventListener('load', function () { setTimeout(function () { maybeSplit(); }, 120); });
    document.addEventListener('visibilitychange', function () { maybeSplit(); });
    var observed = hero.querySelector('.hero__text') || hero.querySelector('.hero__inner');
    if (window.ResizeObserver && observed) {
      new ResizeObserver(function () { maybeSplit(); }).observe(observed);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { maybeSplit(); }, 160);
    });
  }

  /* ── sticky nav border ─────────────────────────────────── */

  var nav = document.getElementById('nav');
  if (nav) {
    var setStuck = function () { nav.classList.toggle('is-stuck', window.scrollY > 8); };
    setStuck();
    window.addEventListener('scroll', setStuck, { passive: true });
  }
})();
