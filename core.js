/* ══════════════════════════════════════════════════════════════════
   core.js — موتور مشترک مطالعه
   این فایل را ویرایش نکنید مگر اینکه دقیقاً بدانید چه می‌کنید.

   مسئولیت‌ها:
     • ساخت و نگهداری جلسه (کد شرکت‌کننده، گروه، نسخه تکلیف)
     • تصادفی‌سازی ۵۰/۵۰ گروه مداخله و کنترل
     • ذخیره مطمئن داده: صف محلی + تلاش مجدد + ارسال هنگام خروج
     • زمان‌سنجی میلی‌ثانیه‌ای همه کلیک‌ها
     • نمایش خودکار پرسش‌ها از روی «مشخصات» (spec)
     • مسیریابی و ازسرگیری در صورت رفرش یا قطع اینترنت
   ══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var CFG = global.CFG || {};
  var NS = 'fsj1.';

  /* ───────────────────────── ابزارهای پایه ───────────────────────── */

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }
  function now() { return Math.round(performance.now()); }
  function iso() { return new Date().toISOString(); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function store(key, val) {
    try {
      if (val === undefined) {
        var v = localStorage.getItem(NS + key);
        return v === null ? null : JSON.parse(v);
      }
      localStorage.setItem(NS + key, JSON.stringify(val));
      return val;
    } catch (e) { return null; }
  }

  /** بُر زدن آرایه با الگوریتم فیشر-ییتس */
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** عدد تصادفی امن رمزنگارانه در بازه [0,1) — برای تصادفی‌سازی گروه */
  function secureRandom() {
    try {
      var b = new Uint32Array(1);
      crypto.getRandomValues(b);
      return b[0] / 4294967296;
    } catch (e) { return Math.random(); }
  }

  /* ───────────────────────── مراحل مطالعه ───────────────────────── */

  var STEPS = [
    { file: 'index.html',        name: 'خوش‌آمد و رضایت',        mins: 2 },
    { file: 'demographics.html', name: 'درباره شما',              mins: 2 },
    { file: 'contact.html',      name: 'آشنایی‌ها و سرگرمی',      mins: 3 },
    { file: 'wellbeing.html',    name: 'حال این روزهای شما',      mins: 1 },
    { file: 'vision.html',       name: 'بررسی دید',               mins: 2 },
    { file: 'cmcq.html',         name: 'موقعیت‌های روزمره',       mins: 7 },
    { file: 'fsj_pre.html',      name: 'بازی شباهت چهره',         mins: 3 },
    { file: 'trust_pre.html',    name: 'بازی سرمایه‌گذاری',       mins: 3 },
    { file: 'sta.html',          name: 'نگاه اول',                mins: 2 },
    { file: 'intervention.html', name: 'استراحت کوتاه',           mins: 3 },
    { file: 'piaq.html',         name: 'حس شما در این لحظه',      mins: 2 },
    { file: 'fsj_post.html',     name: 'بازی شباهت چهره — دور دوم', mins: 3 },
    { file: 'trust_post.html',   name: 'بازی سرمایه‌گذاری — دور دوم', mins: 3 },
    { file: 'complete.html',     name: 'پایان',                   mins: 1 }
  ];

  function stepIndex(file) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].file === file) return i;
    return -1;
  }

  function currentFile() {
    var p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* ───────────────────────── جلسه ───────────────────────── */

  var S = null;

  function makePID() {
    var t = Date.now().toString(36).toUpperCase();
    var r = Math.floor(secureRandom() * 1679616).toString(36).toUpperCase();
    while (r.length < 4) r = '0' + r;
    return 'P' + t.slice(-6) + r;
  }

  function initSession() {
    /* پارامتر ?fresh=1 در آدرس صفحه اول: یک جلسه کاملاً تازه و
       دوباره‌تصادفی‌سازی‌شده می‌سازد، حتی اگر جلسه قبلی (با گروه
       قبلی) هنوز در حافظه این مرورگر نیمه‌کاره یا حتی کامل‌شده
       باشد. عمداً فقط روی index.html اثر می‌کند تا هرگز به‌طور
       تصادفی یک جلسه واقعیِ در حال انجام (مثلاً با دکمه Back مرورگر)
       پاک نشود.

       چرا این لازم بود: بدون این پارامتر، هر بار که کسی دوباره لینک
       مطالعه را باز می‌کند — even روزها بعد — همان جلسه و همان گروه
       قبلی از localStorage بازخوانی می‌شود (خط بعدی همین تابع). این
       رفتار برای شرکت‌کننده واقعی درست و لازم است (ادامه خودکار پس
       از قطع اینترنت)، ولی باعث می‌شود شما هنگام آزمایش دستی، هر بار
       که فقط لینک را دوباره باز می‌کنید، همان یک ویدیویی را ببینید
       که در اولین بازدید به‌طور تصادفی انتخاب شده — نه ویدیوی
       تصادفیِ تازه. برای شرکت‌کننده واقعی این پارامتر هرگز در لینکی
       که پخش می‌کنید نیست، پس رفتار عادی او دست‌نخورده می‌ماند. */
    if (currentFile() === 'index.html' && /[?&]fresh=1(&|$)/.test(location.search)) {
      Object.keys(localStorage).forEach(function (k) {
        if (k.indexOf(NS) === 0) localStorage.removeItem(k);
      });
    }

    S = store('session');
    if (S && S.pid) return S;

    // ── تصادفی‌سازی: دقیقاً ۵۰٪ مداخله، ۵۰٪ کنترل ──
    var group = secureRandom() < 0.5 ? 1 : 0;      // 1 = ویدیوی A، 0 = ویدیوی B
    var variant = secureRandom() < 0.5 ? 'sim' : 'del';  // نسخه تکلیف چهره
    var cbPre = secureRandom() < 0.5 ? 'A' : 'B';
    var cbPost = secureRandom() < 0.5 ? 'A' : 'B';

    S = {
      pid: makePID(),
      group: group,
      variant: variant,
      cb_pre: cbPre,
      cb_post: cbPost,
      started_at: iso(),
      t0: Date.now(),
      ua: navigator.userAgent,
      lang: navigator.language,
      screen_w: screen.width,
      screen_h: screen.height,
      dpr: window.devicePixelRatio || 1,
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      touch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
      version: '2.0'
    };
    store('session', S);
    return S;
  }

  /* ───────────────────────── صف ارسال داده ───────────────────────── */

  var Q = {
    key: 'queue',

    all: function () { return store(this.key) || []; },

    push: function (payload) {
      payload.participant_id = S.pid;
      payload.group = S.group;
      payload.variant = S.variant;
      payload.cb_pre = S.cb_pre;
      payload.cb_post = S.cb_post;
      payload.client_ts = iso();
      payload.elapsed_s = Math.round((Date.now() - S.t0) / 1000);
      payload._qid = S.pid + '_' + payload.task_type + '_' + Date.now();

      var q = this.all();
      q.push({ id: payload._qid, tries: 0, body: payload });
      store(this.key, q);
      // یک نسخه پشتیبان جدا نگه می‌داریم تا اگر صف پاک شد، داده نپرد
      var bk = store('backup') || [];
      bk.push(payload);
      store('backup', bk);
      return this.flush();
    },

    remove: function (id) {
      store(this.key, this.all().filter(function (x) { return x.id !== id; }));
    },

    /** یک آیتم را می‌فرستد. true اگر موفق بود. */
    sendOne: function (item) {
      if (CFG.DEBUG) return Promise.resolve(true);
      if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE') === 0) return Promise.resolve(false);

      return fetch(CFG.API_URL, {
        method: 'POST',
        // بدون Content-Type سفارشی → درخواست «ساده» می‌شود و preflight لازم ندارد
        body: JSON.stringify(item.body),
        redirect: 'follow',
        keepalive: true
      })
        .then(function (r) { return r.text(); })
        .then(function (txt) { return txt.indexOf('"ok"') !== -1 || txt.indexOf('ok') !== -1; })
        .catch(function () {
          // اگر CORS خطا داد، حالت no-cors را امتحان می‌کنیم (بدون تأیید دریافت)
          return fetch(CFG.API_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify(item.body), keepalive: true
          }).then(function () { return 'blind'; }).catch(function () { return false; });
        });
    },

    _busy: null,

    /**
     * صف را خالی می‌کند.
     * قفل نرم: اگر ارسالی در جریان باشد، همان وعده برگردانده می‌شود
     * تا یک رکورد دو بار فرستاده نشود (مثلاً وقتی هم‌زمان
     * boot و finish هر دو flush صدا می‌زنند).
     */
    flush: function () {
      var self = this;
      if (this._busy) return this._busy;
      var q = this.all();
      if (!q.length) return Promise.resolve(true);

      this._busy = q.reduce(function (chain, item) {
        return chain.then(function () {
          return self.sendOne(item).then(function (ok) {
            if (ok === true) { self.remove(item.id); return; }
            if (ok === 'blind') {
              // ارسال شد ولی تأیید نگرفتیم؛ دو بار دیگر تلاش و بعد رها می‌کنیم
              item.tries = (item.tries || 0) + 1;
              if (item.tries >= 2) self.remove(item.id);
              else {
                var qq = self.all().map(function (x) { return x.id === item.id ? item : x; });
                store(self.key, qq);
              }
              return;
            }
            item.tries = (item.tries || 0) + 1;
            var qq2 = self.all().map(function (x) { return x.id === item.id ? item : x; });
            store(self.key, qq2);
          });
        });
      }, Promise.resolve()).then(function () {
        self._busy = null;
        return self.all().length === 0;
      }, function (e) {
        self._busy = null;
        throw e;
      });

      return this._busy;
    },

    /** آخرین تلاش موقع بستن صفحه */
    beacon: function () {
      if (CFG.DEBUG || !navigator.sendBeacon) return;
      if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE') === 0) return;
      this.all().forEach(function (item) {
        try {
          navigator.sendBeacon(CFG.API_URL,
            new Blob([JSON.stringify(item.body)], { type: 'text/plain' }));
        } catch (e) { /* بی‌صدا */ }
      });
    }
  };

  /* ───────────────────────── ثبت رویداد و زمان ───────────────────── */

  function Logger(section) {
    this.section = section;
    this.t0 = now();
    this.events = [];
  }
  Logger.prototype.mark = function (type, detail) {
    this.events.push({ t: now() - this.t0, type: type, d: detail === undefined ? null : detail });
  };
  Logger.prototype.since = function () { return now() - this.t0; };
  Logger.prototype.reset = function () { this.t0 = now(); };

  /* ───────────────────────── رابط کاربری ───────────────────────── */

  function toast(msg, ms) {
    var old = $('.toast'); if (old) old.remove();
    var t = el('div', 'toast', msg);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, ms || 2600);
  }

  function mountBar(file, subLabel) {
    var idx = stepIndex(file);
    if (idx < 0) return;
    var done = 0, total = 0;
    STEPS.forEach(function (s, i) { total += s.mins; if (i < idx) done += s.mins; });
    var pct = Math.round((done / total) * 100);

    var bar = el('div', 'bar');
    bar.innerHTML =
      '<div class="bar-inner">' +
      '<div class="bar-row">' +
      '<span class="bar-name"></span>' +
      '<span class="bar-count"></span>' +
      '</div><div class="track"><div class="fill" id="pbar"></div></div></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    $('.bar-name', bar).textContent = STEPS[idx].name;
    $('.bar-count', bar).textContent = subLabel || ('بخش ' + fa(idx + 1) + ' از ' + fa(STEPS.length));
    requestAnimationFrame(function () { $('#pbar').style.width = pct + '%'; });
  }

  function setBarCount(txt) { var e = $('.bar-count'); if (e) e.textContent = txt; }
  function setBarFill(pct) { var e = $('#pbar'); if (e) e.style.width = Math.max(0, Math.min(100, pct)) + '%'; }

  /* ───────────────────────── نمایش پرسش‌ها ───────────────────────── */
  /*
     spec = [
       { id:'M1', type:'choice', q:'متن سؤال',
         options:[{v:0,label:'...'}, ...], keys:['الف','ب','ج','د'] },
       { id:'PIAQ_EMP', type:'likert7', q:'...', left:'کاملاً مخالفم', right:'کاملاً موافقم' },
       { id:'D01', type:'select', q:'...', options:[...], placeholder:'انتخاب کنید' },
       { id:'note', type:'html', html:'...' }
     ]
  */
  function renderForm(container, spec, opts) {
    opts = opts || {};
    var answers = {};
    var log = new Logger(opts.section || 'form');
    var required = {};

    spec.forEach(function (item, i) {
      if (item.type === 'html') {
        var box = el('div', 'note'); box.innerHTML = item.html;
        container.appendChild(box); return;
      }

      var card = el('div', 'card');
      var qt = el('div', 'q-text');
      qt.textContent = (opts.number === false ? '' : fa(i + 1) + '. ') + item.q;
      card.appendChild(qt);
      if (item.hint) card.appendChild(el('div', 'q-hint', item.hint));
      if (item.required !== false) required[item.id] = true;

      if (item.type === 'choice') {
        var wrap = el('div', 'opts');
        var keys = item.keys || ['الف', 'ب', 'ج', 'د', 'ه', 'و'];
        var order = item.shuffle ? shuffle(item.options.map(function (_, k) { return k; }))
          : item.options.map(function (_, k) { return k; });
        order.forEach(function (srcIdx, pos) {
          var o = item.options[srcIdx];
          var b = el('button', 'opt');
          b.type = 'button';
          b.setAttribute('aria-pressed', 'false');
          var kc = el('span', 'opt-key', keys[pos] || String(pos + 1));
          var bd = el('span', 'opt-body', o.label);
          b.appendChild(kc); b.appendChild(bd);
          b.addEventListener('click', function () {
            [].forEach.call(wrap.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            answers[item.id] = o.v;
            answers[item.id + '_pos'] = pos + 1;      // جایگاه نمایش گزینه
            log.mark('pick', { id: item.id, v: o.v, pos: pos + 1 });
            check();
          });
          wrap.appendChild(b);
        });
        card.appendChild(wrap);

      } else if (item.type === 'likert7' || item.type === 'likert5') {
        var n = item.type === 'likert7' ? 7 : 5;
        var lk = el('div', 'likert');
        var sc = el('div', 'likert-scale');
        if (n === 5) sc.style.gridTemplateColumns = 'repeat(5,1fr)';
        for (var v = 1; v <= n; v++) {
          (function (val) {
            var b = el('button', 'likert-btn', fa(val));
            b.type = 'button'; b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
              [].forEach.call(sc.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
              b.setAttribute('aria-pressed', 'true');
              answers[item.id] = val;
              log.mark('pick', { id: item.id, v: val });
              check();
            });
            sc.appendChild(b);
          })(v);
        }
        lk.appendChild(sc);
        var ends = el('div', 'likert-ends');
        ends.appendChild(el('span', null, item.left || ''));
        ends.appendChild(el('span', null, item.right || ''));
        lk.appendChild(ends);
        card.appendChild(lk);

      } else if (item.type === 'select') {
        var lab = el('label', 'field');
        var sel = el('select');
        sel.appendChild(new Option(item.placeholder || 'انتخاب کنید', ''));
        item.options.forEach(function (o) { sel.appendChild(new Option(o.label, o.v)); });
        sel.addEventListener('change', function () {
          answers[item.id] = sel.value === '' ? undefined : sel.value;
          log.mark('select', { id: item.id, v: sel.value });
          check();
        });
        lab.appendChild(sel);
        card.appendChild(lab);

      } else if (item.type === 'text') {
        var inp = el('input');
        inp.type = item.inputType || 'text';
        inp.placeholder = item.placeholder || '';
        if (item.maxlength) inp.maxLength = item.maxlength;
        if (item.inputmode) inp.inputMode = item.inputmode;
        inp.addEventListener('input', function () {
          answers[item.id] = inp.value.trim() || undefined;
          check();
        });
        card.appendChild(inp);
      }

      container.appendChild(card);
    });

    var btn = el('button', 'btn', opts.buttonText || 'ادامه');
    btn.type = 'button'; btn.disabled = true;
    var foot = el('div', 'footbar');
    var inner = el('div', 'inner');
    inner.appendChild(btn); foot.appendChild(inner);
    document.body.appendChild(foot);

    function missing() {
      return Object.keys(required).filter(function (k) {
        return answers[k] === undefined || answers[k] === null;
      });
    }
    function check() { btn.disabled = missing().length > 0; }

    btn.addEventListener('click', function () {
      var m = missing();
      if (m.length) {
        toast('هنوز ' + fa(m.length) + ' سؤال بی‌پاسخ مانده است');
        return;
      }
      btn.disabled = true;
      btn.textContent = 'در حال ذخیره…';
      answers._events = log.events;
      answers._duration_ms = log.since();
      opts.onDone(answers);
    });

    check();
    return { answers: answers, log: log, button: btn };
  }

  /* ───────────────────────── بارگذاری تصاویر ───────────────────────── */

  function preload(urls, onProgress) {
    var done = 0, total = urls.length;
    if (!total) return Promise.resolve();
    return Promise.all(urls.map(function (u) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = im.onerror = function () {
          done++; if (onProgress) onProgress(done, total); res();
        };
        im.src = u;
      });
    }));
  }

  function faceURL(id) { return CFG.FACES_BASE + id + '.jpg'; }

  /* ───────────────────────── مسیریابی ───────────────────────── */

  function markDone(file) {
    var d = store('done') || {};
    d[file] = iso();
    store('done', d);
  }

  function next(fromFile) {
    var i = stepIndex(fromFile);
    var nxt = STEPS[i + 1];
    if (!nxt) return 'complete.html';
    if (nxt.file === 'sta.html' && CFG.ENABLE_STA === false) return STEPS[i + 2].file;
    return nxt.file;
  }

  function go(file) { location.href = file; }

  /** اگر کاربر مرحله‌ای را رد کرده باشد، به اولین مرحله ناتمام برمی‌گردد */
  function guard(file) {
    if (file === 'index.html' || file === 'complete.html') return true;
    var d = store('done') || {};
    var i = stepIndex(file);
    for (var k = 0; k < i; k++) {
      var f = STEPS[k].file;
      if (f === 'sta.html' && CFG.ENABLE_STA === false) continue;
      if (!d[f]) { location.replace(f); return false; }
    }
    return true;
  }

  /** پایان یک بخش: ذخیره، علامت‌گذاری و رفتن به بخش بعد */
  function finish(file, payload) {
    return Q.push(payload)
      .catch(function () { })
      .then(function () {
        markDone(file);
        go(next(file));
      });
  }

  /* ───────────────────────── راه‌اندازی صفحه ───────────────────────── */

  function boot(opts) {
    opts = opts || {};
    initSession();
    var file = currentFile();
    if (opts.guard !== false && !guard(file)) return null;
    if (opts.bar !== false) mountBar(file, opts.barCount);

    // تلاش برای ارسال هرچه در صف مانده
    Q.flush();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') Q.beacon();
      else Q.flush();
    });
    window.addEventListener('pagehide', function () { Q.beacon(); });
    window.addEventListener('online', function () { Q.flush(); });

    return { session: S, file: file };
  }

  /* ───────────────────────── صادرات ───────────────────────── */

  global.Core = {
    fa: fa, now: now, iso: iso, $: $, el: el, sleep: sleep,
    shuffle: shuffle, store: store, toast: toast,
    Logger: Logger, Q: Q,
    renderForm: renderForm, preload: preload, faceURL: faceURL,
    boot: boot, finish: finish, go: go, next: next, markDone: markDone,
    STEPS: STEPS, setBarCount: setBarCount, setBarFill: setBarFill,
    session: function () { return S; }
  };

})(window);
