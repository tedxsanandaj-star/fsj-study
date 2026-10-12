/* ══════════════════════════════════════════════════════════════════
   fsj_task.js — نسخهٔ ۳: تکلیف قضاوت شباهت چهره با «رتبه‌بندی لمسی» ۴ گزینه

   هر کوشش: یک چهرهٔ مرجع (هدف) + ۴ چهرهٔ گزینه (همجنس و هم‌سن).
   شرکت‌کننده گزینه‌ها را به ترتیب شباهت لمس می‌کند: اول شبیه‌ترین (۱)، بعد (۲)، بعد (۳)؛ چهارمی خودکار است.
   → رتبهٔ کامل ۴ گزینه (۴! = ۲۴ پیامد) = ورودی مدل Plackett–Luce؛ اولین لمس = انتخاب اول (۴AFC) برای
     سازگاری با فاز صفر و پایلوت.

   دو نسخهٔ نمایش (تصادفی بین‌آزمودنی، مثل قبل):
     sim — هدف و گزینه‌ها با هم روی صفحه‌اند.
     del — هدف ۱۲۰۰ms، ماسک ۵۰۰ms، سپس گزینه‌ها.

   فرم‌ها: بانک دو فرم هم‌ارز A و B دارد. پیش‌آزمون فرم S.cb_pre و پس‌آزمون فرم متمم (S.cb_post) را می‌بیند؛
   هیچ هویت چهره‌ای بین پیش و پس مشترک نیست (audit: analysis/output/bank_audit.json).

   نسخهٔ ۳٫۱: قید فاصلهٔ چهره‌های تکراری درون بلوک (MIN_GAP=۶)، پنجرهٔ تصادفی کوشش‌های توجه، و ثبت pos / tgt_seen_before / opt_seen_before.

   اندیس پیشین: ۰ = طلایی پیشین (کلید مدل پیشین)، ۱..۳ = فریبنده‌های رتبه‌بندی‌شدهٔ پیشین.
   نمره‌دهی نهایی با LOPO در تحلیل انجام می‌شود (analysis/build_trials.py: lopo_key / lopo_score_table).
   ══════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  function maxRun(arr) {
    var m = 1, c = 1;
    for (var i = 1; i < arr.length; i++) { c = arr[i].r === arr[i - 1].r ? c + 1 : 1; if (c > m) m = c; }
    return m;
  }

  /* ── قیدهای ترتیب (نسخهٔ ۳٫۱) ──────────────────────────────────────────────────────────
     (۱) سقف ۳ کوشش متوالی هم‌رده.
     (۲) هر چهره‌ای که در دو کوششِ یک بلوک دیده می‌شود (فقط چهره‌های ME: یک‌بار «هدف»، یک‌بار «شریک هم‌نژاد»)
         باید دست‌کم MIN_GAP کوشش از دفعهٔ قبل فاصله داشته باشد؛ و چون ترتیب تصادفی است، ترتیبِ «اول هدف / اول شریک»
         بین افراد خودبه‌خود موازنه می‌شود. این تکرار درون‌بلوکی فقط برای ME وجود دارد (کمبود موجودی: ۲۴ چهره)؛
         پس برای هر کوشش «تعداد دیدار قبلی هدف» ثبت می‌شود (tgt_seen_before) تا اثرش در تحلیل حساسیت کنترل شود.
     (۳) کوشش‌های توجه در پنجره‌های تصادفی ۱۵–۴۰٪ و ۵۵–۸۵٪ (نه جایگاه ثابت و قابل‌پیش‌بینی).                       */
  var MIN_GAP = 6;
  function facesOf(it) { return [it.t, it.g].concat(it.d || []); }
  function sharesFace(a, b) {
    var A = facesOf(a), B = facesOf(b);
    for (var i = 0; i < A.length; i++) if (B.indexOf(A[i]) >= 0) return true;
    return false;
  }
  function gapViolations(list) {
    var v = 0;
    for (var i = 0; i < list.length; i++)
      for (var j = i + 1; j < Math.min(list.length, i + MIN_GAP); j++) if (sharesFace(list[i], list[j])) v++;
    return v;
  }
  function randIn(lo, hi) { return lo + Math.floor(Core.rand() * (hi - lo + 1)); }

  function orderScore(l) { return (maxRun(l) > 3 ? 100 : 0) + gapViolations(l); }

  function orderTrials(main, catches) {
    // شروع تصادفی + جست‌وجوی محلی با جابه‌جایی‌های تصادفی (پذیرش جابه‌جایی‌هایی که تخطی را زیاد نمی‌کنند)
    var best = null, bestScore = 1e9;
    for (var k = 0; k < 40 && bestScore > 0; k++) {
      var s = Core.shuffle(main), sc = orderScore(s);
      for (var it = 0; it < 600 && sc > 0; it++) {
        var i = Math.floor(Core.rand() * s.length), j = Math.floor(Core.rand() * s.length);
        if (i === j) continue;
        var tmp = s[i]; s[i] = s[j]; s[j] = tmp;
        var s2 = orderScore(s);
        if (s2 <= sc) sc = s2; else { tmp = s[i]; s[i] = s[j]; s[j] = tmp; }
      }
      if (sc < bestScore) { best = s.slice(); bestScore = sc; }
    }
    var n = best.length;
    var slots = [randIn(Math.floor(n * 0.15), Math.floor(n * 0.40)), randIn(Math.floor(n * 0.55), Math.floor(n * 0.85))];
    var out = best.slice();
    catches.forEach(function (c, i) { out.splice(slots[i] + i, 0, c); });
    return out;
  }

  function buildMask(imgUrls, size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = null;
    try { ctx = c.getContext('2d'); } catch (e) { ctx = null; }
    if (!ctx) return null;
    ctx.fillStyle = '#888'; ctx.fillRect(0, 0, size, size);
    imgUrls.forEach(function (u) {
      var im = new Image();
      im.onload = function () {
        for (var i = 0; i < 26; i++) {
          var sw = 20 + Math.random() * 40, sh = 20 + Math.random() * 40;
          var sx = Math.random() * Math.max(1, im.width - sw), sy = Math.random() * Math.max(1, im.height - sh);
          var dx = Math.random() * (size - sw), dy = Math.random() * (size - sh);
          try { ctx.drawImage(im, sx, sy, sw, sh, dx, dy, sw, sh); } catch (e) { }
        }
      };
      im.src = u;
    });
    return c;
  }

  g.FSJ_internals = { orderTrials: orderTrials, maxRun: maxRun, gapViolations: gapViolations, MIN_GAP: MIN_GAP };

  g.runFSJ = function (BLOCK) {
    var b = Core.boot();
    if (!b) return;

    var S = Core.session();
    var T = window.FSJ_TRIALS;
    var form = BLOCK === 'pre' ? S.cb_pre : S.cb_post;
    var F = T.forms[form];
    var variant = S.variant;
    var range = Core.barRange(BLOCK === 'pre' ? 'fsj_pre.html' : 'fsj_post.html');
    var TO = (CFG.TIMEOUT_FSJ > 0) ? Math.max(CFG.TIMEOUT_FSJ, 40000) : 0;   // رتبه‌بندی ۳ لمس می‌خواهد

    var main = F.items.slice();
    var catches = F.catch.slice(0, T.show.catch);
    var practice = (BLOCK === 'pre' ? T.practice.slice(0, 2) : T.practice.slice(0, 1)).map(function (p) {
      var q = {}; for (var k in p) q[k] = p[k]; q.pr = 1; q.r = 'practice'; return q;
    });
    var trials = practice.concat(orderTrials(main, catches));
    var nMain = main.length + catches.length;

    var app = Core.$('#app');
    var idx = 0, responses = [];
    var log = new Core.Logger('fsj_' + BLOCK);
    var maskCanvas = null;
    var hidden = 0;
    var seen = {};                       // چهره → تعداد دفعات نمایش در این بلوک (برای tgt_seen_before)
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') hidden++; });

    var urls = [];
    trials.forEach(function (t) {
      urls.push(Core.faceURL(t.t), Core.faceURL(t.g));
      t.d.forEach(function (x) { urls.push(Core.faceURL(x)); });
    });
    urls = urls.filter(function (v, i, a) { return a.indexOf(v) === i; });

    app.innerHTML = '<div class="center-screen"><div class="spinner"></div>' +
      '<p class="small">در حال آماده‌سازی تصویرها… <span id="plp">۰</span>٪</p>' +
      '<p class="small">اگر اینترنت کند است، چند لحظه صبر کنید.</p></div>';

    var loadT0 = Core.now();
    Core.preload(urls, function (done, total) {
      var e = Core.$('#plp'); if (e) e.textContent = Core.fa(Math.round(done / total * 100));
    }).then(function () {
      log.mark('preload_done', { ms: Core.now() - loadT0, n: urls.length, form: form });
      if (variant === 'del') maskCanvas = buildMask(urls.slice(0, 6), 300);
      intro();
    });

    /* ───────── توضیح ───────── */
    function intro() {
      var isPost = BLOCK === 'post';
      app.innerHTML = '';
      var wrap = Core.el('div');
      if (isPost) {
        var br = Core.el('div', 'note');
        br.innerHTML = '<strong>یک نفس عمیق بکشید.</strong><br>دور دوم است؛ همان قاعده، با عکس‌های تازه.';
        wrap.appendChild(br);
      }
      wrap.appendChild(Core.el('h1', null, isPost ? 'بازی شباهت چهره — دور دوم' : 'بازی شباهت چهره'));
      var p = Core.el('p', 'lead');
      p.textContent = variant === 'sim'
        ? 'یک عکس بالا و چهار عکس پایین آن را می‌بینید. عکس‌های پایین را از «شبیه‌ترین» به «کم‌شبیه‌ترین» به عکس بالا مرتب کنید.'
        : 'اول یک عکس برای لحظه‌ای نشان داده می‌شود و محو می‌شود. بعد چهار عکس می‌آید؛ آن‌ها را از «شبیه‌ترین» به «کم‌شبیه‌ترین» به عکس اول مرتب کنید.';
      wrap.appendChild(p);

      var card = Core.el('div', 'card');
      card.appendChild(Core.el('div', 'q-text', 'چطور مرتب کنم؟'));
      var ul = Core.el('ul', 'plain');
      [
        'اول عکسِ «شبیه‌ترین» را لمس کنید (شماره ۱ می‌گیرد)، بعد دومین، بعد سومین. چهارمی خودکار است.',
        'اشتباه لمس کردید؟ دکمهٔ «از نو» را بزنید.',
        'جواب درست و غلطی نمایش داده نمی‌شود؛ برداشت خودتان مهم است.',
        (isPost ? '' : 'اول ' + Core.fa(practice.length) + ' عکس تمرینی می‌آید. ') + 'در مجموع ' + Core.fa(nMain) + ' عکس اصلی است و حدود ' + Core.fa(isPost ? 4 : 5) + ' دقیقه طول می‌کشد.'
      ].forEach(function (t) { if (t) ul.appendChild(Core.el('li', null, t)); });
      card.appendChild(ul);
      wrap.appendChild(card);

      var btn = Core.el('button', 'btn', 'شروع');
      btn.type = 'button';
      btn.addEventListener('click', function () { this.disabled = true; app.innerHTML = ''; nextTrial(); }, { once: true });
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner');
      inner.appendChild(btn); f.appendChild(inner); wrap.appendChild(f);
      app.appendChild(wrap);
      window.scrollTo(0, 0);
    }

    /* ───────── یک کوشش ───────── */
    function nextTrial() {
      if (idx >= trials.length) return done();
      var t = trials[idx];
      var k = idx - practice.length;
      if (t.pr) Core.setBarCount('تمرین ' + Core.fa(idx + 1) + ' از ' + Core.fa(practice.length));
      else Core.setBarCount('عکس ' + Core.fa(k + 1) + ' از ' + Core.fa(nMain));
      Core.setBarFill(range[0] + Math.max(0, k) / nMain * (range[1] - range[0]));

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
            cc.style.width = cc.style.height = '100%'; cc.style.display = 'block';
            mb.appendChild(cc);
          } else {
            mb.style.background = 'repeating-conic-gradient(#7a7a7a 0% 25%, #a8a8a8 0% 50%) 0/18px 18px';
          }
          stage.appendChild(mb);
          setTimeout(function () {
            mb.remove();
            stage.innerHTML = '';
            showOptions(t, stage);
          }, CFG.DELAY_MASK_MS);
        }, CFG.DELAY_TARGET_MS);
      }
      window.scrollTo(0, 0);
    }

    function targetBox(t) {
      var box = Core.el('div', 'target-box tall');
      var im = Core.el('img'); im.src = Core.faceURL(t.t); im.alt = '';
      box.appendChild(im);
      return box;
    }

    function showOptions(t, stage) {
      var hint = Core.el('div', 'stage-label rank-hint', 'کدام عکس «شبیه‌ترین» است؟ آن را لمس کنید');
      stage.appendChild(hint);
      var ids = [t.g].concat(t.d);                   // اندیس پیشین = جایگاه در این آرایه
      var order = Core.shuffle([0, 1, 2, 3]);        // ترتیب نمایش (تصادفی مستقل برای هر کوشش)
      var t0 = Core.now();
      var ranks = [];                                 // [{src, pos, t}]
      var finished = false, undo = 0;
      var KEYS = ['الف', 'ب', 'ج', 'د'];
      var HINTS = ['کدام عکس «شبیه‌ترین» است؟ آن را لمس کنید',
        'حالا «دومین شبیه‌ترین» را لمس کنید', 'حالا «سومین شبیه‌ترین» را لمس کنید', 'آماده است. تأیید کنید.'];

      var grid = Core.el('div', 'grid4');
      var btns = [];
      order.forEach(function (srcIdx, pos) {
        var btn = Core.el('button', 'face-opt');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        var im = Core.el('img'); im.src = Core.faceURL(ids[srcIdx]); im.alt = 'گزینه ' + KEYS[pos];
        btn.appendChild(im);
        var badge = Core.el('span', 'k', KEYS[pos]);
        btn.appendChild(badge);
        btn._badge = badge; btn._key = KEYS[pos]; btn._src = srcIdx; btn._pos = pos;
        btn.addEventListener('click', function () { tap(btn); });
        grid.appendChild(btn); btns.push(btn);
      });
      stage.appendChild(grid);

      var confirm = Core.el('button', 'btn', 'تأیید و بعدی');
      confirm.type = 'button'; confirm.disabled = true;
      confirm.style.marginTop = '0'; confirm.style.flex = '1 1 auto';
      var redo = Core.el('button', 'btn-ghost', 'از نو');
      redo.type = 'button'; redo.disabled = true;
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner rank-foot');
      inner.appendChild(redo); inner.appendChild(confirm); f.appendChild(inner); app.appendChild(f);

      var timer = TO > 0 ? setTimeout(function () { record(true); }, TO) : null;
      confirm.addEventListener('click', function () { record(false); });
      redo.addEventListener('click', function () {
        if (finished || !ranks.length) return;
        undo++; ranks = [];
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); x.classList.remove('ranked', 'auto'); x._badge.textContent = x._key; });
        hint.textContent = HINTS[0]; confirm.disabled = true; redo.disabled = true;
      });

      function tap(btn) {
        if (finished) return;
        if (btn.classList.contains('ranked') || btn.classList.contains('auto')) return;
        ranks.push({ src: btn._src, pos: btn._pos + 1, t: Core.now() - t0 });
        btn.setAttribute('aria-pressed', 'true'); btn.classList.add('ranked');
        btn._badge.textContent = Core.fa(ranks.length);
        redo.disabled = false;
        if (ranks.length === 3) {                    // چهارمی خودکار
          var left = btns.filter(function (x) { return !x.classList.contains('ranked'); })[0];
          left.classList.add('auto'); left._badge.textContent = Core.fa(4);
          ranks.push({ src: left._src, pos: left._pos + 1, t: null, auto: 1 });
        }
        hint.textContent = HINTS[Math.min(ranks.length, 3)];
        confirm.disabled = ranks.length < 4;
      }

      function record(timeout) {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        var tapped = ranks.filter(function (r) { return !r.auto; });
        var first = ranks.length ? ranks[0] : null;
        var shown = [t.t].concat(ids).filter(function (v, i, a) { return a.indexOf(v) === i; });
        var tgtSeen = seen[t.t] || 0;
        var optSeen = ids.filter(function (v, i, a) { return a.indexOf(v) === i && seen[v]; }).length;
        shown.forEach(function (f) { seen[f] = (seen[f] || 0) + 1; });
        var rec = {
          i: idx + 1, pos: t.pr ? 0 : (idx - practice.length + 1), tgt_seen_before: tgtSeen, opt_seen_before: optSeen, id: t.id || ('PR' + (idx + 1)), form: form, cond: t.r, cong: t.c || null, practice: t.pr ? 1 : 0,
          target: t.t, golden: t.g, sr: t.sr || null,
          options: order.map(function (o) { return ids[o]; }).join('|'),
          rank_ids: ranks.map(function (r) { return ids[r.src]; }).join('|'),
          rank_idx: ranks.map(function (r) { return r.src; }).join(''),       // مثلاً «2013»: اندیس‌های پیشین از رتبهٔ ۱ تا ۴
          n_ranked: tapped.length,
          first_idx: first ? first.src : null,
          first_id: first ? ids[first.src] : null,
          first_pos: first ? first.pos : null,
          prior_top1: first ? (first.src === 0 ? 1 : 0) : null,              // موقت: برابر طلایی پیشین (نه کلید نهایی LOPO)
          is_sr_first: (first && t.sr) ? (ids[first.src] === t.sr ? 1 : 0) : null,
          t1_ms: tapped[0] ? tapped[0].t : null,
          t2_ms: tapped[1] ? tapped[1].t : null,
          t3_ms: tapped[2] ? tapped[2].t : null,
          rt_total_ms: tapped.length ? tapped[tapped.length - 1].t : null,
          confirm_ms: Core.now() - t0,
          n_undo: undo, timeout: timeout ? 1 : 0, is_catch: (t.c === 1 && t.r === 'catch') ? 1 : 0,
          hidden: hidden
        };
        responses.push(rec);
        log.mark('trial', { id: rec.id, f: rec.first_idx });
        idx++;
        nextTrial();
      }
    }

    /* ───────── جمع‌بندی ───────── */
    function done() {
      app.innerHTML = '<div class="center-screen"><div class="spinner"></div><p class="small">در حال ذخیره…</p></div>';
      var R = responses.filter(function (r) { return !r.practice; });
      function sel(f) { return R.filter(f); }
      function mean(a, k) { var v = a.map(function (r) { return r[k]; }).filter(function (x) { return x !== null; }); return v.length ? v.reduce(function (s, x) { return s + x; }, 0) / v.length : null; }
      function r4(x) { return x === null ? '' : +x.toFixed(4); }
      var me = sel(function (r) { return r.cond === 'ME'; });
      var ot = sel(function (r) { return ['WH', 'BL', 'EA', 'HI'].indexOf(r.cond) >= 0; });
      var ct = sel(function (r) { return r.cond === 'catch'; });
      var catchWrong = ct.filter(function (r) { return r.first_idx !== 0; }).length;     // در کوشش توجه، طلایی = همان چهره
      var timeouts = R.filter(function (r) { return r.timeout; }).length;
      var posCount = [0, 0, 0, 0];
      R.forEach(function (r) { if (r.first_pos) posCount[r.first_pos - 1]++; });
      var posMax = R.length ? Math.max.apply(null, posCount) / R.length : 0;
      var t1 = R.map(function (r) { return r.t1_ms; }).filter(function (x) { return x !== null; }).sort(function (a, b) { return a - b; });
      var medT1 = t1.length ? t1[Math.floor(t1.length / 2)] : null;

      var out = {
        task_type: 'fsj', block: BLOCK, fsj_form: form, fsj_variant: variant, fsj_version: T.version, ranking_mode: 'tap4',
        n_trials: R.length, n_practice: responses.length - R.length,
        prior_top1_ME: r4(mean(me, 'prior_top1')), prior_top1_other: r4(mean(ot, 'prior_top1')),
        sr_first_ME: r4(mean(me, 'is_sr_first')), sr_first_other: r4(mean(ot, 'is_sr_first')),
        median_t1_ms: medT1, mean_total_ms: r4(mean(R, 'rt_total_ms')),
        Attention_FSJ_Flag: (ct.length > 0 && catchWrong >= Math.ceil(ct.length / 2)) ? 1 : 0,
        n_catch_wrong: catchWrong, n_catch: ct.length,
        Miss_Flag: (R.length && (timeouts / R.length) > 0.2) ? 1 : 0, n_timeout: timeouts,
        PosBias_Flag: posMax > 0.6 ? 1 : 0, pos_max_share: r4(posMax),
        Speed_Flag: (medT1 !== null && medT1 < 900) ? 1 : 0,
        n_hidden: hidden, preload_ms: Core.now() - loadT0, duration_ms: log.since(),
        trials_json: JSON.stringify(responses)
      };
      Core.finish(BLOCK === 'pre' ? 'fsj_pre.html' : 'fsj_post.html', out);
    }
  };

})(window);
