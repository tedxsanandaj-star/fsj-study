/* ══════════════════════════════════════════════════════════════════
   trust_task.js — بازی سرمایه‌گذاری (نسخه انتخاب گسسته پنج‌گزینه‌ای)

   ساختار (جدول الف-۵.۱ پیوست الف):
     سرمایه اولیه ۱۰۰۰ تومان، تقسیم میان دو شریک.
     شریک A = چهره با SPD پایین (درون‌گروه ادراکی)
     شریک B = چهره با SPD بالا  (برون‌گروه ادراکی)
     هر شریک ضریب فایده ۲، ۳ یا ۴ دارد و درصد بازگشت ۳۰ تا ۸۰٪ است.

   کد پاسخ (trust_bias) همیشه نسبت به شریک A ثبت می‌شود:
     ۱ = همه به A   …   ۳ = مساوی   …   ۵ = همه به B
   مقدار بالاتر یعنی سوگیری کمتر به نفع درون‌گروه ادراکی.

   خنثی‌سازی سمت: در نیمی از سناریوها شریک A سمت راست و در نیمی
   دیگر سمت چپ نمایش داده می‌شود (فیلد flip). برچسب‌های روی صفحه
   («الف» و «ب») به جایگاه نمایش بسته‌اند، نه به هویت شریک، تا
   هیچ نشانه‌ای به شرکت‌کننده ندهد.

   محدودیت (مطابق پیوست الف): در نسخه آنلاین هیچ بازخورد واقعی از
   نتیجه سرمایه‌گذاری داده نمی‌شود.
   ══════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  function money(n) { return Core.fa(n.toLocaleString('en-US')); }

  g.runTrust = function (BLOCK) {
    var b = Core.boot();
    if (!b) return;

    var T = window.TRUST;
    var scen = Core.shuffle(T.scenarios.filter(function (s) { return s.block === BLOCK; }));
    var app = Core.$('#app');
    var idx = 0;
    var responses = [];
    var log = new Core.Logger('trust_' + BLOCK);

    var urls = [];
    scen.forEach(function (s) { urls.push(Core.faceURL(s.faceA), Core.faceURL(s.faceB)); });

    app.innerHTML = '<div class="center-screen"><div class="spinner"></div>' +
      '<p class="small">در حال آماده‌سازی…</p></div>';
    Core.preload(urls).then(intro);

    /* ───────── توضیح ───────── */
    function intro() {
      app.innerHTML = '';
      var w = Core.el('div');
      w.appendChild(Core.el('h1', null,
        BLOCK === 'post' ? 'بازی سرمایه‌گذاری — دور دوم' : 'بازی سرمایه‌گذاری'));

      var p = Core.el('p', 'lead');
      p.textContent = 'در هر مرحله ۱۰۰۰ تومان دارید و دو نفر را می‌بینید. ' +
        'پول را هر طور که دوست دارید بین آن دو تقسیم می‌کنید.';
      w.appendChild(p);

      var card = Core.el('div', 'card');
      card.appendChild(Core.el('div', 'q-text', 'قاعده بازی'));
      var ul = Core.el('ul', 'plain');
      [
        'هر مبلغی که به یک نفر بدهید، نزد او چند برابر می‌شود. مثلاً ×۳ یعنی سه برابر.',
        'بعد آن نفر بخشی از پول بزرگ‌شده را به شما برمی‌گرداند. این درصد در هر مرحله نوشته شده است.',
        'ضریب هر نفر و درصد بازگشت، در هر مرحله فرق می‌کند. حواستان به آن‌ها باشد.',
        'شما این دو نفر را نمی‌شناسید و هیچ اطلاعاتی درباره‌شان ندارید. فقط به احساس خودتان تکیه کنید.',
        Core.fa(scen.length) + ' مرحله است و حدود سه دقیقه طول می‌کشد.'
      ].forEach(function (t) { ul.appendChild(Core.el('li', null, t)); });
      card.appendChild(ul);
      w.appendChild(card);

      var ex = Core.el('div', 'note');
      ex.innerHTML = '<strong>یک مثال:</strong> اگر ۱۰۰۰ تومان به کسی بدهید که ضریبش ×۳ است ' +
        'و درصد بازگشت ۵۰٪ باشد، پول شما ۳۰۰۰ تومان می‌شود و او ۱۵۰۰ تومان به شما برمی‌گرداند.';
      w.appendChild(ex);

      var btn = Core.el('button', 'btn', 'شروع');
      btn.type = 'button';
      btn.addEventListener('click', function () {
        this.disabled = true;
        app.innerHTML = '';
        next();
      }, { once: true });
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner');
      inner.appendChild(btn); f.appendChild(inner); w.appendChild(f);
      app.appendChild(w);
      window.scrollTo(0, 0);
    }

    /* ───────── یک سناریو ───────── */
    function next() {
      if (idx >= scen.length) return done();
      var s = scen[idx];
      Core.setBarCount('مرحله ' + Core.fa(idx + 1) + ' از ' + Core.fa(scen.length));
      Core.setBarFill((BLOCK === 'pre' ? 58 : 90) + (idx / scen.length) * 6);

      app.innerHTML = '';
      var t0 = Core.now();
      var clicks = [];
      var chosen = null;
      var finished = false;

      // سمت راست و چپ بر اساس flip
      var right = s.flip === 0
        ? { who: 'A', face: s.faceA, mult: s.factorA }
        : { who: 'B', face: s.faceB, mult: s.factorB };
      var left = s.flip === 0
        ? { who: 'B', face: s.faceB, mult: s.factorB }
        : { who: 'A', face: s.faceA, mult: s.factorA };

      var card = Core.el('div', 'card');
      card.appendChild(Core.el('div', 'q-text', 'شما ' + money(1000) + ' تومان دارید. چطور تقسیم می‌کنید؟'));

      var row = Core.el('div', 'partners');
      [ [right, 'الف'], [left, 'ب'] ].forEach(function (pair) {
        var side = pair[0], label = pair[1];
        var d = Core.el('div', 'partner');
        var im = Core.el('img');
        im.src = Core.faceURL(side.face);
        im.alt = '';
        d.appendChild(im);
        d.appendChild(Core.el('div', 'partner-name', 'نفر ' + label));
        d.appendChild(Core.el('div', 'partner-mult', 'پول نزد او ×' + Core.fa(side.mult) + ' می‌شود'));
        row.appendChild(d);
      });
      card.appendChild(row);

      var ret = Core.el('div', 'note');
      ret.innerHTML = 'هر کدام <strong>' + Core.fa(s.ret) + '٪</strong> از پول بزرگ‌شده را به شما برمی‌گردانند.';
      card.appendChild(ret);
      app.appendChild(card);

      // گزینه‌ها در فضای نمایش (الف = راست، ب = چپ)
      var DISPLAY = [
        { r: 1000, l: 0 },
        { r: 750, l: 250 },
        { r: 500, l: 500 },
        { r: 250, l: 750 },
        { r: 0, l: 1000 }
      ];

      var oc = Core.el('div', 'card');
      var opts = Core.el('div', 'opts');
      DISPLAY.forEach(function (d, i) {
        var btn = Core.el('button', 'opt');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        btn.appendChild(Core.el('span', 'opt-key', Core.fa(i + 1)));
        var body = Core.el('span', 'opt-body split-opt');
        var line;
        if (d.r === 1000) line = 'همه ' + money(1000) + ' تومان به نفر الف';
        else if (d.l === 1000) line = 'همه ' + money(1000) + ' تومان به نفر ب';
        else if (d.r === 500) line = money(500) + ' تومان به هر کدام';
        else line = money(d.r) + ' تومان به الف، ' + money(d.l) + ' تومان به ب';
        body.appendChild(Core.el('span', 'split-line', line));
        opts.appendChild(btn);
        btn.appendChild(body);

        btn.addEventListener('click', function () {
          if (finished) return;
          [].forEach.call(opts.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          // ترجمه به فضای کانونی: چقدر به شریک A رسید
          var toA = (right.who === 'A') ? d.r : d.l;
          var code = [1000, 750, 500, 250, 0].indexOf(toA) + 1;
          chosen = { display: i + 1, code: code, toA: toA, toB: 1000 - toA };
          clicks.push({ display: i + 1, code: code, t: Core.now() - t0 });
          go.disabled = false;
        });
      });
      oc.appendChild(opts);
      app.appendChild(oc);

      var go = Core.el('button', 'btn', 'تأیید و بعدی');
      go.type = 'button';
      go.disabled = true;
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner');
      inner.appendChild(go); f.appendChild(inner); app.appendChild(f);

      var timer = CFG.TIMEOUT_TRUST > 0
        ? setTimeout(function () { record(true); }, CFG.TIMEOUT_TRUST) : null;
      go.addEventListener('click', function () { record(false); });

      function record(timeout) {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        responses.push({
          i: idx + 1,
          id: s.id,
          block: BLOCK,
          faceA: s.faceA, faceB: s.faceB,
          spdA: s.spdA, spdB: s.spdB,
          factorA: s.factorA, factorB: s.factorB,
          ret: s.ret,
          flip: s.flip,
          A_side: right.who === 'A' ? 'right' : 'left',
          trust_bias: chosen ? chosen.code : null,
          amount_A: chosen ? chosen.toA : null,
          amount_B: chosen ? chosen.toB : null,
          display_choice: chosen ? chosen.display : null,
          rt_ms: clicks.length ? clicks[clicks.length - 1].t : null,
          first_click_ms: clicks.length ? clicks[0].t : null,
          n_clicks: clicks.length,
          confirm_ms: Core.now() - t0,
          timeout: timeout ? 1 : 0,
          clicks: clicks
        });
        log.mark('scenario', { id: s.id, code: chosen ? chosen.code : null });
        idx++;
        window.scrollTo(0, 0);
        next();
      }

      window.scrollTo(0, 0);
    }

    /* ───────── جمع‌بندی ───────── */
    function done() {
      app.innerHTML = '<div class="center-screen"><div class="spinner"></div>' +
        '<p class="small">در حال ذخیره…</p></div>';

      var ans = responses.filter(function (r) { return r.trust_bias !== null; });
      var meanBias = ans.length
        ? ans.reduce(function (s, r) { return s + r.trust_bias; }, 0) / ans.length : null;
      var meanA = ans.length
        ? ans.reduce(function (s, r) { return s + r.amount_A; }, 0) / ans.length : null;
      var meanB = ans.length
        ? ans.reduce(function (s, r) { return s + r.amount_B; }, 0) / ans.length : null;
      var meanRT = ans.length
        ? Math.round(ans.reduce(function (s, r) { return s + (r.rt_ms || 0); }, 0) / ans.length) : null;

      Core.finish(BLOCK === 'pre' ? 'trust_pre.html' : 'trust_post.html', {
        task_type: 'trust_game',
        block: BLOCK,
        n_scenarios: responses.length,
        mean_trust_bias: meanBias === null ? '' : +meanBias.toFixed(3),
        mean_amount_A: meanA === null ? '' : Math.round(meanA),
        mean_amount_B: meanB === null ? '' : Math.round(meanB),
        beta_invest: (meanA !== null) ? Math.round(meanB - meanA) : '',
        mean_rt_ms: meanRT,
        n_timeout: responses.filter(function (r) { return r.timeout; }).length,
        duration_ms: log.since(),
        trials_json: JSON.stringify(responses)
      });
    }
  };

})(window);
