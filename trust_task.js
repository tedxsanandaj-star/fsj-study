/* ══════════════════════════════════════════════════════════════════
   trust_task.js — نسخهٔ یکپارچه ۸٫۰: بازی سرمایه‌گذاری (چهار انتخاب پولی غیرخنثی، بدون گزینهٔ «مساوی»)

   سرمایهٔ ۱۰۰۰ تومان بین دو شریک تقسیم می‌شود. گزینه‌ها:
     ۱۰۰۰/۰ ، ۷۵۰/۲۵۰ ، ۲۵۰/۷۵۰ ، ۰/۱۰۰۰   (۵۰۰/۵۰۰ عمداً وجود ندارد؛ مقادیر از T.amounts در trials_trust.js می‌آیند)
   ⇒ هر پاسخ لزوماً به نفع یکی از دو چهره است؛ شرکت‌کننده نمی‌تواند با «سهم مساوی» از قضاوت دربارهٔ چهره‌ها بگریزد.

   اصلاحات نسبت به پایلوت:
     • سمت نمایش (الف/ب) در هر کوشش با سکهٔ مستقل از سناریو انداخته می‌شود (پایلوت: flip با پاریتی سناریو درهم‌آمیخته بود).
     • شریک مرجع P1 در ثبت داده: ME اگر در سناریو باشد، وگرنه نژاد با ترتیب W<H<EA<B. همه‌چیز نسبت به P1 کدگذاری می‌شود.
     • چهره‌ها فقط از فرم FSJ همان بلوک‌اند (هیچ چهره‌ای بین پیش و پس تکرار نمی‌شود).
     • ضریب‌ها در نیمی از سناریوها برابر و در نیمی نابرابرند؛ بهتر بودن پاداش، مستقل از نژاد قرینه شده است (dF ثبت می‌شود).
   محدودیت: در نسخهٔ آنلاین بازخورد واقعی پرداخت داده نمی‌شود.
   ══════════════════════════════════════════════════════════════════ */
(function (g) {
  'use strict';

  function money(n) { return Core.fa(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')); }

  g.runTrust = function (BLOCK) {
    var b = Core.boot();
    if (!b) return;

    var S = Core.session();
    var T = window.TRUST;
    var form = BLOCK === 'pre' ? S.cb_pre : S.cb_post;
    var scen = Core.shuffle(T.forms[form].scenarios);
    var AM = T.amounts;                                  // مبلغ به «الف»؛ مابقی به «ب»
    var range = Core.barRange(BLOCK === 'pre' ? 'trust_pre.html' : 'trust_post.html');
    var app = Core.$('#app');
    var idx = 0, responses = [];
    var log = new Core.Logger('trust_' + BLOCK);

    var urls = [];
    scen.forEach(function (s) { urls.push(Core.faceURL(s.a), Core.faceURL(s.b)); });
    app.innerHTML = '<div class="center-screen"><div class="spinner"></div><p class="small">در حال آماده‌سازی…</p></div>';
    Core.preload(urls).then(intro);

    function intro() {
      app.innerHTML = '';
      var w = Core.el('div');
      w.appendChild(Core.el('h1', null, BLOCK === 'post' ? 'بازی سرمایه‌گذاری — دور دوم' : 'بازی سرمایه‌گذاری'));
      var p = Core.el('p', 'lead');
      p.textContent = 'در هر مرحله ۱۰۰۰ تومان دارید و دو نفر را می‌بینید. پول را بین آن دو تقسیم می‌کنید.';
      w.appendChild(p);
      var card = Core.el('div', 'card');
      card.appendChild(Core.el('div', 'q-text', 'قاعدهٔ بازی'));
      var ul = Core.el('ul', 'plain');
      [
        'هر مبلغی که به یک نفر بدهید، نزد او چند برابر می‌شود. مثلاً ×۳ یعنی سه برابر.',
        'بعد او درصدی از پول بزرگ‌شده را به شما برمی‌گرداند. این درصد در هر مرحله نوشته شده است.',
        'ضریب هر نفر در هر مرحله فرق می‌کند؛ به آن توجه کنید.',
        'در هر مرحله باید به یکی از دو نفر بیشتر بدهید؛ گزینهٔ تقسیم مساوی وجود ندارد.',
        'آن دو نفر را نمی‌شناسید. به برداشت خودتان تکیه کنید.',
        Core.fa(scen.length) + ' مرحله است و حدود سه دقیقه طول می‌کشد.'
      ].forEach(function (t) { ul.appendChild(Core.el('li', null, t)); });
      card.appendChild(ul); w.appendChild(card);
      var ex = Core.el('div', 'note');
      ex.innerHTML = '<strong>یک مثال:</strong> اگر ۱۰۰۰ تومان به کسی بدهید که ضریبش ×۳ است و درصد بازگشت ۵۰٪ باشد، پول او ۳۰۰۰ تومان می‌شود و ۱۵۰۰ تومان به شما برمی‌گردد.';
      w.appendChild(ex);
      var btn = Core.el('button', 'btn', 'شروع');
      btn.type = 'button';
      btn.addEventListener('click', function () { this.disabled = true; app.innerHTML = ''; next(); }, { once: true });
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner');
      inner.appendChild(btn); f.appendChild(inner); w.appendChild(f);
      app.appendChild(w);
      window.scrollTo(0, 0);
    }

    function next() {
      if (idx >= scen.length) return done();
      var s = scen[idx];
      Core.setBarCount('مرحله ' + Core.fa(idx + 1) + ' از ' + Core.fa(scen.length));
      Core.setBarFill(range[0] + (idx / scen.length) * (range[1] - range[0]));
      app.innerHTML = '';
      var t0 = Core.now(), clicks = [], chosen = null, finished = false;

      var p1Right = Core.rand() < 0.5;                    // سکهٔ مستقل برای هر نمایش
      var P1 = { who: 'P1', face: s.a, mult: s.f1 }, P2 = { who: 'P2', face: s.b, mult: s.f2 };
      var right = p1Right ? P1 : P2, left = p1Right ? P2 : P1;     // الف = راست، ب = چپ

      var card = Core.el('div', 'card');
      card.appendChild(Core.el('div', 'q-text', 'شما ' + money(1000) + ' تومان دارید. چطور تقسیم می‌کنید؟'));
      var row = Core.el('div', 'partners');
      [[right, 'الف'], [left, 'ب']].forEach(function (pair) {
        var d = Core.el('div', 'partner');
        var im = Core.el('img'); im.src = Core.faceURL(pair[0].face); im.alt = '';
        d.appendChild(im);
        d.appendChild(Core.el('div', 'partner-name', 'نفر ' + pair[1]));
        d.appendChild(Core.el('div', 'partner-mult', 'پول نزد او ×' + Core.fa(pair[0].mult) + ' می‌شود'));
        row.appendChild(d);
      });
      card.appendChild(row);
      var ret = Core.el('div', 'note');
      ret.innerHTML = 'هر کدام <strong>' + Core.fa(s.ret) + '٪</strong> از پول بزرگ‌شده را به شما برمی‌گردانند.';
      card.appendChild(ret);
      app.appendChild(card);

      var oc = Core.el('div', 'card'), opts = Core.el('div', 'opts');
      AM.forEach(function (toAlef, i) {
        var toBe = 1000 - toAlef;
        var btn = Core.el('button', 'opt');
        btn.type = 'button'; btn.setAttribute('aria-pressed', 'false');
        btn.appendChild(Core.el('span', 'opt-key', Core.fa(i + 1)));
        var body = Core.el('span', 'opt-body split-opt');
        var line = toAlef === 1000 ? 'همهٔ ' + money(1000) + ' تومان به نفر الف'
          : toBe === 1000 ? 'همهٔ ' + money(1000) + ' تومان به نفر ب'
          : money(toAlef) + ' تومان به الف، ' + money(toBe) + ' تومان به ب';
        body.appendChild(Core.el('span', 'split-line', line));
        btn.appendChild(body); opts.appendChild(btn);
        btn.addEventListener('click', function () {
          if (finished) return;
          [].forEach.call(opts.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          var toP1 = (right.who === 'P1') ? toAlef : toBe;
          chosen = { display: i + 1, toP1: toP1, toP2: 1000 - toP1 };
          clicks.push({ display: i + 1, toP1: toP1, t: Core.now() - t0 });
          go.disabled = false;
        });
      });
      oc.appendChild(opts); app.appendChild(oc);

      var go = Core.el('button', 'btn', 'تأیید و بعدی');
      go.type = 'button'; go.disabled = true;
      var f = Core.el('div', 'footbar'), inner = Core.el('div', 'inner');
      inner.appendChild(go); f.appendChild(inner); app.appendChild(f);
      var timer = CFG.TIMEOUT_TRUST > 0 ? setTimeout(function () { record(true); }, CFG.TIMEOUT_TRUST) : null;
      go.addEventListener('click', function () { record(false); });

      function record(timeout) {
        if (finished) return;
        finished = true;
        if (timer) clearTimeout(timer);
        responses.push({
          i: idx + 1, id: s.id, block: BLOCK, form: form,
          faceP1: s.a, faceP2: s.b, raceP1: s.ra, raceP2: s.rb, gender: s.g, ageP1: s.age_a, ageP2: s.age_b,
          factorP1: s.f1, factorP2: s.f2, dF: s.dF, ret: s.ret, expP1: s.exp_a, expP2: s.exp_b,
          P1_side: p1Right ? 'right' : 'left',
          share_P1: chosen ? chosen.toP1 : null,                 // یکی از {۰، ۲۵۰، ۷۵۰، ۱۰۰۰} تومان به P1 (۵۰۰ ممکن نیست)
          amount_P1: chosen ? chosen.toP1 : null, amount_P2: chosen ? chosen.toP2 : null,
          choose_P1: chosen ? (chosen.toP1 > 500 ? 1 : 0) : null,
          display_choice: chosen ? chosen.display : null,
          rt_ms: clicks.length ? clicks[clicks.length - 1].t : null,
          first_click_ms: clicks.length ? clicks[0].t : null,
          n_clicks: clicks.length, confirm_ms: Core.now() - t0, timeout: timeout ? 1 : 0
        });
        log.mark('scenario', { id: s.id, v: chosen ? chosen.toP1 : null });
        idx++; window.scrollTo(0, 0); next();
      }
      window.scrollTo(0, 0);
    }

    function done() {
      app.innerHTML = '<div class="center-screen"><div class="spinner"></div><p class="small">در حال ذخیره…</p></div>';
      var ans = responses.filter(function (r) { return r.share_P1 !== null; });
      function mean(a, k) { return a.length ? a.reduce(function (s, r) { return s + r[k]; }, 0) / a.length : null; }
      var meP1 = ans.filter(function (r) { return r.raceP1 === 'ME'; });        // در سناریوهای ME، P1 همیشه ME است
      Core.finish(BLOCK === 'pre' ? 'trust_pre.html' : 'trust_post.html', {
        task_type: 'trust_game', block: BLOCK, trust_form: form, trust_version: T.version, n_scenarios: responses.length,
        mean_share_P1: ans.length ? +mean(ans, 'share_P1').toFixed(1) : '',
        mean_share_ME_when_present: meP1.length ? +mean(meP1, 'share_P1').toFixed(1) : '',
        choose_ME_rate: meP1.length ? +mean(meP1, 'choose_P1').toFixed(3) : '',
        mean_rt_ms: ans.length ? Math.round(mean(ans, 'rt_ms')) : '',
        n_timeout: responses.filter(function (r) { return r.timeout; }).length,
        duration_ms: log.since(), trials_json: JSON.stringify(responses)
      });
    }
  };
})(window);
