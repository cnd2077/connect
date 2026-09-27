// Telegram Mini App: the same account as the bot, signed in by Telegram's launch data.
(function () {
  var SITE = window.SITE || {};
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };
  var show = function (el, on) { el.classList.toggle("hidden", !on); };
  var KEY = "vpn_cabinet";
  var token = null, me = null, info = null, polls = 0;

  var DOWNLOADS = {
    ios: ["🍏 iPhone / iPad", "https://apps.apple.com/app/id6756943388"],
    android: ["🤖 Android", "https://play.google.com/store/apps/details?id=llc.itdev.incy"],
    win: ["🪟 Windows", "https://github.com/INCY-DEV/incy-platforms/releases/latest/download/incy-windows-setup.exe"],
    mac: ["🍎 Mac / Linux", "https://github.com/INCY-DEV/incy-platforms/releases/latest"]
  };

  function api(path, body) {
    var headers = {};
    if (token) headers.Authorization = "Bearer " + token;
    if (body) headers["Content-Type"] = "application/json";
    return fetch(SITE.api + path, { method: body ? "POST" : "GET", headers: headers, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ("Ошибка " + r.status)); e.status = r.status; throw e; }
          return j;
        });
      }, function () { throw new Error("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз."); });
  }

  // Older Telegram clients lack newer methods and throw on them, so check the version first.
  var inTg = !!(tg && tg.initData);
  function has(v) { try { return inTg && tg.isVersionAtLeast(v); } catch (e) { return false; } }
  function alertMsg(text) { if (has("6.2")) tg.showAlert(text); else alert(text); }
  function confirmMsg(text, cb) { if (has("6.2")) tg.showConfirm(text, cb); else cb(confirm(text)); }
  function haptic(kind) { if (has("6.1")) try { tg.HapticFeedback.notificationOccurred(kind); } catch (e) {} }
  function openLink(url) { if (inTg) tg.openLink(url); else location.href = url; }

  function os() {
    var ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios"
      : /Android/.test(ua) ? "android" : /Windows/.test(ua) ? "win" : "mac";
  }

  function dateText(ms) {
    return new Date(ms).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  function daysLeft(ms) { return Math.max(0, Math.ceil((ms - Date.now()) / 86400000)); }

  function daysWord(n) {
    var m10 = n % 10, m100 = n % 100;
    return n + (m10 === 1 && m100 !== 11 ? " день" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? " дня" : " дней");
  }

  // ---------- screens ----------
  var current = "s-loading";
  function screen(id) {
    ["s-loading", "s-error", "s-home", "s-connect", "s-buy", "s-balance", "s-wl"].forEach(function (s) { show($(s), s === id); });
    current = id;
    window.scrollTo(0, 0);
    if (has("6.1")) { if (id === "s-home" || id === "s-loading" || id === "s-error") tg.BackButton.hide(); else tg.BackButton.show(); }
  }

  function fail(text) { $("err-text").textContent = text; screen("s-error"); }

  // ---------- home ----------
  function renderHome() {
    $("hello").textContent = me.name ? "Здравствуйте, " + me.name + "!" : "Здравствуйте!";
    var ico = $("st-ico"), title = $("st-title"), sub = $("st-sub");
    if (me.pending) { ico.textContent = "⏳"; title.textContent = "Ждём оплату"; sub.textContent = "Обычно это занимает до минуты"; }
    else if (me.active) {
      ico.textContent = "✅"; title.textContent = "VPN работает";
      sub.textContent = me.expiry_ms ? "Оплачено до " + dateText(me.expiry_ms) + " · ещё " + daysWord(daysLeft(me.expiry_ms)) : "Без ограничения срока";
    } else if (me.link) { ico.textContent = "⛔"; title.textContent = "Срок закончился"; sub.textContent = "Продлите — настраивать заново не нужно"; }
    else { ico.textContent = "👋"; title.textContent = "Подписки пока нет"; sub.textContent = me.trial_available ? "Попробуйте бесплатно — это займёт минуту" : "Купите — и подключим за пару нажатий"; }

    show($("b-trial"), !!me.trial_available);
    $("b-trial-d").textContent = daysWord(me.trial_days || 3) + ", без оплаты";
    show($("b-connect"), !!me.link);
    $("b-connect").classList.toggle("main", !!me.active && !me.trial_available);
    $("b-buy-t").textContent = me.link ? "Продлить" : "Купить";
    $("b-buy").classList.toggle("main", !me.active && !me.trial_available);
    $("b-balance-t").textContent = "Баланс: " + me.balance + " ₽";
    $("b-balance-d").textContent = me.auto_renew ? "продлевается автоматически" : "автопродление выключено";
    show($("b-wl"), !!me.whitelist && !!me.link);
    if (me.whitelist) $("b-wl-d").textContent = "запасной канал · осталось " + me.whitelist.left_gb + " ГБ";
    screen("s-home");
    if (me.pending && polls < 40) { polls++; setTimeout(function () { load(true); }, 4000); }
  }

  function load(check) {
    return api("/me" + (check ? "?check=1" : "")).then(function (j) {
      var wasPending = me && me.pending;
      me = j;
      if (wasPending && !me.pending && me.active) haptic("success");
      if (current === "s-home" || current === "s-loading") renderHome();
      else if (current === "s-balance") renderBalance();
      else if (current === "s-wl") renderWl();
    });
  }

  // ---------- connect ----------
  function renderConnect() {
    var mine = DOWNLOADS[os()];
    $("dl-main").textContent = "Скачать для " + mine[0].replace(/^\S+\s/, "");
    $("dl-main").onclick = function () { openLink(mine[1]); };
    var list = $("dl-list");
    list.innerHTML = "";
    Object.keys(DOWNLOADS).forEach(function (k) {
      var b = document.createElement("button");
      b.className = "btn light"; b.type = "button"; b.textContent = DOWNLOADS[k][0];
      b.onclick = function () { openLink(DOWNLOADS[k][1]); };
      list.appendChild(b);
    });
    $("dl-other").onclick = function (e) { e.preventDefault(); show(list, true); };
    // Telegram can only open web links, so go through the site's page, which hands the link to INCY.
    $("add-incy").onclick = function () { openLink(location.origin + SITE.base + "add/?go=1#" + encodeURIComponent(me.link)); };
    $("copy-link").onclick = function () {
      var done = function () { show($("copied"), true); haptic("success"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(me.link).then(done, function () { prompt("Скопируйте:", me.link); });
      else prompt("Скопируйте:", me.link);
    };
    screen("s-connect");
  }

  // ---------- buy ----------
  var PLAN_TEXT = { 1: "для одного телефона", 3: "для семьи или телефон + компьютер", 5: "для всей семьи" };
  function renderBuy() {
    var box = $("plans");
    box.innerHTML = "";
    info.tariffs.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "act"; b.type = "button";
      b.innerHTML = '<span class="ico">📱</span><span><b></b><span class="d"></span></span>';
      b.querySelector("b").textContent = t.title + " — " + t.price + " ₽ в месяц";
      b.querySelector(".d").textContent = PLAN_TEXT[t.devices] || "";
      b.onclick = function () { pay(t, b); };
      box.appendChild(b);
    });
    $("buy-note").textContent = me.balance > 0 ? "На балансе " + me.balance + " ₽ — они учтутся при оплате." : "";
    screen("s-buy");
  }

  function afterPay(j, okText) {
    if (j.paid) { haptic("success"); alertMsg(okText); load().then(renderHome); return; }
    if (j.pay_url) { me.pending = true; openLink(j.pay_url); screen("s-home"); renderHome(); }
  }

  function pay(t, b) {
    b.disabled = true;
    api("/order", { devices: t.devices, accept_terms: true }).then(function (j) {
      afterPay(j, "✅ Оплачено с баланса. VPN продлён на месяц.");
    }, function (e) { alertMsg(e.message); }).then(function () { b.disabled = false; });
  }

  // ---------- balance ----------
  function renderBalance() {
    $("bal-amount").textContent = me.balance;
    $("auto").checked = !!me.auto_renew;
    var box = $("topups");
    if (!box.childElementCount) {
      [100, 250, 500, 1000].forEach(function (a) {
        var b = document.createElement("button");
        b.className = "btn light"; b.type = "button"; b.textContent = "+" + a + " ₽";
        b.onclick = function () {
          b.disabled = true;
          api("/topup", { amount: a }).then(function (j) { afterPay(j, ""); }, function (e) { alertMsg(e.message); })
            .then(function () { b.disabled = false; });
        };
        box.appendChild(b);
      });
    }
    $("auto").onchange = function () {
      api("/autorenew", { on: $("auto").checked }).then(function () { me.auto_renew = $("auto").checked; haptic("success"); },
        function (e) { alertMsg(e.message); });
    };
    screen("s-balance");
  }

  // ---------- whitelist traffic ----------
  function renderWl() {
    var wl = me.whitelist;
    $("wl-monthly").textContent = wl.monthly_gb;
    $("wl-left").textContent = wl.left_gb + " ГБ";
    var box = $("wl-packs");
    if (!box.childElementCount) {
      wl.packages_gb.forEach(function (gb) {
        var b = document.createElement("button");
        b.className = "btn light"; b.type = "button"; b.textContent = "+" + gb + " ГБ за " + gb * wl.price_per_gb + " ₽";
        b.onclick = function () {
          b.disabled = true;
          api("/wl/buy", { gb: gb }).then(function (j) { afterPay(j, "✅ Добавлено " + gb + " ГБ."); }, function (e) { alertMsg(e.message); })
            .then(function () { b.disabled = false; });
        };
        box.appendChild(b);
      });
    }
    screen("s-wl");
  }

  // ---------- trial & help ----------
  function trial() {
    var go = function () {
      $("b-trial").disabled = true;
      api("/trial", { accept_terms: true }).then(function () {
        haptic("success");
        return load().then(function () { alertMsg("🎁 Готово! Теперь подключим телефон."); renderConnect(); });
      }, function (e) { alertMsg(e.message); }).then(function () { $("b-trial").disabled = false; });
    };
    confirmMsg("Включить бесплатный период? Нажимая «OK», вы соглашаетесь с условиями сервиса.", function (yes) { if (yes) go(); });
  }

  function help() {
    var s = (info && info.support) || "";
    var url = /^@\w+$/.test(s) ? "https://t.me/" + s.slice(1) : /^https?:\/\//.test(s) ? s : null;
    if (url && has("6.1") && /t\.me\//.test(url)) tg.openTelegramLink(url);
    else if (url) openLink(url);
    else alertMsg("Напишите в поддержку через бота: кнопка «🆘 Поддержка».");
  }

  // ---------- start ----------
  function start() {
    screen("s-loading");
    var signIn = inTg
      ? api("/tg/auth", { init_data: tg.initData }).then(function (j) { token = j.token; try { localStorage.setItem(KEY, token); } catch (e) {} })
      : Promise.resolve().then(function () {
          try { token = localStorage.getItem(KEY); } catch (e) {}
          if (!token) throw new Error("Откройте это приложение из нашего Telegram-бота.");
        });
    signIn.then(function () { return api("/info"); })
      .then(function (j) { info = j; document.title = j.service; return load(true); })
      .catch(function (e) { fail(e.message); });
  }

  if (inTg) {
    tg.ready(); tg.expand();
    if (has("6.1")) tg.BackButton.onClick(function () { renderHome(); });
    try { tg.onEvent("activated", function () { if (token) load(true); }); } catch (e) {}  // back from the payment page
  }
  // a way back without Telegram's back button (old clients, a regular browser)
  document.querySelectorAll("main > section h2").forEach(function (h) {
    if (has("6.1")) return;
    var a = document.createElement("a"); a.href = "#"; a.textContent = "← Назад"; a.style.display = "block"; a.style.marginBottom = "10px";
    a.onclick = function (e) { e.preventDefault(); renderHome(); };
    h.parentNode.insertBefore(a, h);
  });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && token && me) load(true); });
  $("err-retry").onclick = start;
  $("b-trial").onclick = trial;
  $("b-connect").onclick = renderConnect;
  $("b-buy").onclick = renderBuy;
  $("b-balance").onclick = renderBalance;
  $("b-wl").onclick = renderWl;
  $("b-help").onclick = help;
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-doc]");
    if (a) { e.preventDefault(); openLink(location.origin + SITE.base + a.getAttribute("data-doc") + "/"); }
  });
  start();
})();
