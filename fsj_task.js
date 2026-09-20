/* ══════════════════════════════════════════════════════════════════
   fsj_task.js — موتور تکلیف قضاوت شباهت چهره (۴ گزینه‌ای اجباری)

   دو نسخه:
     sim  — چهره مرجع و چهار گزینه با هم روی صفحه‌اند (ادراک آنی)
     del  — چهره مرجع ۱۲۰۰ میلی‌ثانیه، سپس ماسک بصری ۵۰۰ میلی‌ثانیه،
            سپس گزینه‌ها (بار حافظه کاری)

   هر شرکت‌کننده در هر بلوک می‌بیند:
     ۱۰ کوشش درون‌گروه + ۱۰ برون‌گروه  (تحلیل اصلی)
     ۴ کوشش مرجع‌ساز                    (خارج از تحلیل ORE)
     ۲ کوشش توجه                        (کنترل کیفیت)

   برای هر کوشش ثبت می‌شود:
     شناسه کوشش، شرط، SPD، گزینه انتخابی، درست/غلط،
     زمان واکنش دقیق بر حسب میلی‌ثانیه، همه کلیک‌ها (حتی تغییر نظر)،
     جایگاه نمایش هر گزینه، و زمان واقعی بارگذاری تصویرها.
   ══════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  function pickRandom(arr, n) {
    return Core.shuffle(arr).slice(0, Math.min(n, arr.length));
  }

  /** ماسک بصری: تکه‌های تصادفی چند چهره روی یک بوم */
  function buildMask(imgUrls, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = null;
    try { ctx = c.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return null;            // بدون canvas، ماسک ساده CSS استفاده می‌شود
    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, size, size);
    var loaded = 0;
    imgUrls.forEach(function (u) {
      var im = new Image();
      im.onload = function () {
        for (var i = 0; i < 26; i++) {
          var sw = 20 + Math.random() * 40, sh = 20 + Math.random() * 40;
          var sx = Math.random() * Math.max(1, im.width - sw);
          var sy = Math.random() * Math.max(1, im.height - sh);
          var dx = Math.random() * (size - sw), dy = Math.random() * (size - sh);
          try { ctx.drawImage(im, sx, sy, sw, sh, dx, dy, sw, sh); } catch (e) { }
        }
        loaded++;
      };
      im.src = u;
    });
    return c;
  }

  g.runFSJ = function (BLOCK) {
    var b = Core.boot();
    if (!b) return;

    var S = Core.session();
    var T = window.FSJ_TRIALS;
    var pool = T[BLOCK];
    var cfgShow = T.show;
    var variant = S.variant;                 // 'sim' یا 'del'

    var main = pickRandom(pool.ingroup, cfgShow.ingroup)
      .concat(pickRandom(pool.outgroup, cfgShow.outgroup))
      .concat(pickRandom(pool.ref, cfgShow.ref));
    var catches = pickRandom(pool.catch, cfgShow.catch);

    // کوشش‌های توجه در جایگاه‌های تصادفی، ولی نه دو تای پشت سر هم
    var trials = Core.shuffle(main);
    var slots = [Math.floor(trials.length * 0.25), Math.floor(trials.length * 0.7)];
    catches.forEach(function (c, i) { trials.splice(slots[i] + i, 0, c); });

    var app = Core.$('#app');
    var idx = 0;
    var responses = [];
    var log = new Core.Logger('fsj_' + BLOCK);
    var maskCanvas = null;

    /* ───────── پیش‌بارگذاری ───────── */
    var urls = [];
    trials.forEach(function (t) {
      urls.push(Core.faceURL(t.t), Core.faceURL(t.g));
      t.d.forEach(function (x) { urls.push(Core.faceURL(x)); });
    });
    urls = urls.filter(function (v, i, a) { return a.indexOf(v) === i; });

    app.innerHTML =
      '<div class="center-screen"><div class="spinner"></div>' +
      '<p class="small" id="pl">در حال آماده‌سازی تصویرها… <span id="plp">۰</span>٪</p>' +
      '<p class="small">اگر اینترنت کند است، چند لحظه صبر کنید.</p></div>';

    var loadT0 = Core.now();
    Core.preload(urls, function (done, total) {
      var p = Math.round(done / total * 100);
      var e = Core.$('#plp');
      if (e) e.textContent = Core.fa(p);
    }).then(function () {
      log.mark('preload_done', { ms: Core.now() - loadT0, n: urls.length });
      if (variant === 'del') maskCanvas = buildMask(urls.slice(0, 6), 300);
      intro();
    });

    /* ───────── صفحه توضیح ───────── */
    function intro() {
      var isPost = BLOCK === 'post';
      app.innerHTML = '';
      var wrap = Core.el('div');

      if (isPost) {
        var breathe = Core.el('div', 'note');
        breathe.innerHTML = '<strong>لطفاً یک نفس عمیق بکشید.</strong><br>' +
          'چند ثانیه آرام باشید، بعد ادامه دهید.';
        wrap.appendChild(breathe);
      }

      var h = Core.el('h1', null, isPost ? 'بازی شباهت چهره — دور دوم' : 'بازی شباهت چهره');
      wrap.appendChild(h);

      var p = Core.el('p', 'lead');
      p.textContent = variant === 'sim'
        ? 'یک عکس بالا می‌آید و چهار عکس پایین آن. عکسی را بزنید که به نظر شما بیشتر از بقیه شبیه عکس بالایی است.'
        : 'اول یک عکس برای لحظه‌ای نشان داده می‌شود، بعد محو می‌شود. سپس چهار عکس می‌آید و شما باید شبیه‌ترین را بزنید.';
      wrap.appendChild(p);

      var card = Core.el('div', 'card');
      var ul = Core.el('ul', 'plain');
      [
        'جواب درست و غلط قطعی وجود ندارد — نظر خود شما مهم است.',
        'در مجموع ' + Core.fa(trials.length) + ' عکس می‌بینید. حدود سه دقیقه طول می‌کشد.',
        'برای هر عکس تا ' + Core.fa(Math.round(CFG.TIMEOUT_FSJ / 1000)) + ' ثانیه وقت دارید. عجله نکنید.',
        variant === 'del'
          ? 'عکس اول کوتاه نشان داده می‌شود؛ با دقت نگاهش کنید.'
          : 'هر وقت تصمیم گرفتید، بزنید.'
      ].forEach(function (t) { ul.appendChild(Core.el('li', null, t)); });
      card.appendChild(ul);
      wrap.appendChild(card);

      var btn = Core.el('button', 'btn', 'شروع');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        this.disabled = true;
        app.innerHTML = '';
        nextTrial();
      }, { once: true });
      var f = Core.el('div', 'footbar');
      var inner = Core.el('div', 'inner');
      inner.appendChild(btn);
      f.appendChild(inner);
      wrap.appendChild(f);

      app.appendChild(wrap);
      window.scrollTo(0, 0);
    }

    /* ───────── یک کوشش ───────── */
    function nextTrial() {
      if (idx >= trials.length) return done();
      var t = trials[idx];
      Core.setBarCount('عکس ' + Core.fa(idx + 1) + ' از ' + Core.fa(trials.length));
      Core.setBarFill((BLOCK === 'pre' ? 50 : 82) + (idx / trials.length) * 8);

      app.innerHTML = '';
      var stage = Core.el('div', 'stage');
      app.appendChild(stage);

      if (variant === 'sim') {
        stage.appendChild(targetBox(t));
        showOptions(t, stage);
      } else {
        stage.appendChild(Core.el('div', 'stage-label', 'با دقت نگاه کنید'));
        var tb = targetBox(t);
        stage.appendChild(tb);
        setTimeout(function () {
          tb.remove();
          var mb = Core.el('div', 'mask-box');
          if (maskCanvas) {
            var cc = maskCanvas.cloneNode(true);
            try { cc.getContext('2d').drawImage(maskCanvas, 0, 0); } catch (e) { }
            cc.style.width = cc.style.height = '100%';
            cc.style.display = 'block';
            mb.appendChild(cc);
          } else {
            // ماسک جایگزین: الگوی شطرنجی خاکستری
            mb.style.background =
              'repeating-conic-gradient(#7a7a7a 0% 25%, #a8a8a8 0% 50%) 0/18px 18px';
          }
          stage.insertBefore(mb, stage.firstChild.nextSibling || null);
          setTimeout(function () {
            mb.remove();
            stage.innerHTML = '';
            stage.appendChild(Core.el('div', 'stage-label', 'کدام‌یک شبیه‌تر بود؟'));
            showOptions(t, stage);
          }, CFG.DELAY_MASK_MS);
        }, CFG.DELAY_TARGET_MS);
      }
      window.scrollTo(0, 0);
    }

    function targetBox(t) {
      var box = Core.el('div', 'target-box');
      var im = Core.el('img');
      im.src = Core.faceURL(t.t);
      im.alt = '';
      box.appendChild(im);
      return box;
    }

    function showOptions(t, stage) {
      if (!stage.querySelector('.stage-label')) {
        stage.appendChild(Core.el('div', 'stage-label', 'کدام‌یک شبیه‌تر است؟'));
      }
      var ids = [t.g].concat(t.d);
      var order = Core.shuffle([0, 1, 2, 3]);
      var t0 = Core.now();
      var clicks = [];
      var chosen = null;
      var finished = false;
      var KEYS = ['الف', 'ب', 'ج', 'د'];

      var grid = Core.el('div', 'grid4');
      order.forEach(function (srcIdx, pos) {
        var btn = Core.el('button', 'face-opt');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        var im = Core.el('img');
        im.src = Core.faceURL(ids[srcIdx]);
        im.alt = '';
        btn.appendChild(im);
        btn.appendChild(Core.el('span', 'k', KEYS[pos]));
        btn.addEventListener('click', function () {
          if (finished) return;
          [].forEach.call(grid.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          chosen = { face: ids[srcIdx], isGolden: srcIdx === 0, pos: pos + 1 };
          clicks.push({ face: ids[srcIdx], pos: pos + 1, t: Core.now() - t0 });
          confirm.disabled = false;
        });
        grid.appendChild(btn);
      });
      stage.appendChild(grid);

      var confirm = Core.el('button', 'btn', 'تأیید و بعدی');
      confirm.type = 'button';
      confirm.disabled = true;
      var f = Core.el('div', 'footbar');
      var inner = Core.el('div', 'inner');
      inner.appendChild(confirm);
      f.appendChild(inner);
      app.appendChild(f);

      var timer = null;
      if (CFG.TIMEOUT_FSJ > 0) {
        timer = setTimeout(function () { record(true); }, CFG.TIMEOUT_FSJ);
      }
      confirm.addEventListener('click', function () { record(false); });

      function record(timeout) {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);

        responses.push({
          i: idx + 1,
          id: t.id,
          cond: t.r,
          spd: t.s,
          se: t.se === undefined ? null : t.se,
          target: t.t,
          golden: t.g,
          options: order.map(function (o) { return ids[o]; }).join('|'),
          chosen: chosen ? chosen.face : null,
          chosen_pos: chosen ? chosen.pos : null,
          correct: chosen ? (chosen.isGolden ? 1 : 0) : null,
          rt_ms: chosen ? clicks[clicks.length - 1].t : null,
          first_click_ms: clicks.length ? clicks[0].t : null,
          n_clicks: clicks.length,
          confirm_ms: Core.now() - t0,
          timeout: timeout ? 1 : 0,
          is_catch: t.c ? 1 : 0,
          clicks: clicks
        });
        log.mark('trial', { id: t.id, c: chosen ? (chosen.isGolden ? 1 : 0) : null });
        idx++;
        nextTrial();
      }
    }

    /* ───────── جمع‌بندی ───────── */
    function done() {
      app.innerHTML = '<div class="center-screen"><div class="spinner"></div>' +
        '<p class="small">در حال ذخیره…</p></div>';

      function sub(cond) { return responses.filter(function (r) { return r.cond === cond; }); }
      function acc(rs) {
        var a = rs.filter(function (r) { return r.correct !== null; });
        return a.length ? a.reduce(function (s, r) { return s + r.correct; }, 0) / a.length : null;
      }
      function meanRT(rs) {
        var a = rs.filter(function (r) { return r.rt_ms !== null; });
        return a.length ? Math.round(a.reduce(function (s, r) { return s + r.rt_ms; }, 0) / a.length) : null;
      }

      var inR = sub('ingroup'), outR = sub('outgroup'), catchR = sub('catch');
      var accIn = acc(inR), accOut = acc(outR);
      var catchWrong = catchR.filter(function (r) { return r.correct === 0 || r.correct === null; }).length;
      var timeouts = responses.filter(function (r) { return r.timeout; }).length;
      var allRT = responses.filter(function (r) { return r.rt_ms !== null; })
        .map(function (r) { return r.rt_ms; });
      var meanAll = allRT.length ? allRT.reduce(function (a, x) { return a + x; }, 0) / allRT.length : 0;

      var out = {
        task_type: 'fsj',
        block: BLOCK,
        fsj_variant: variant,
        n_trials: responses.length,
        Acc_in: accIn === null ? '' : +accIn.toFixed(4),
        Acc_out: accOut === null ? '' : +accOut.toFixed(4),
        ORE_acc: (accIn !== null && accOut !== null) ? +(accIn - accOut).toFixed(4) : '',
        DT_in: meanRT(inR),
        DT_out: meanRT(outR),
        ORE_DT: (meanRT(inR) !== null && meanRT(outR) !== null) ? meanRT(outR) - meanRT(inR) : '',
        mean_rt_ms: Math.round(meanAll),
        Attention_FSJ_Flag: catchWrong > 1 ? 1 : 0,
        n_catch_wrong: catchWrong,
        Miss_Flag: (timeouts / responses.length) > 0.2 ? 1 : 0,
        n_timeout: timeouts,
        Speed_Flag: meanAll < 1500 ? 1 : 0,
        preload_ms: Core.now() - loadT0,
        duration_ms: log.since(),
        trials_json: JSON.stringify(responses)
      };

      Core.finish(BLOCK === 'pre' ? 'fsj_pre.html' : 'fsj_post.html', out);
    }
  };

})(window);
