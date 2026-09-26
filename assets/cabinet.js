// Shop (no login yet) and personal cabinet (logged in by the secret #k=<token> link).
(function () {
  var $ = App.$, show = App.show, message = App.message, api = App.api, store = App.store;

  var m = /(?:^|&)k=([\w-]{20,})/.exec(location.hash.slice(1));
  if (m) { store.set(m[1]); history.replaceState(null, "", location.pathname); }
  var token = store.get();
  var info = null;

  function goPay(j) {
    if (j.token) { token = j.token; store.set(j.token); }
    if (j.pay_url) { location.href = j.pay_url; } else { loadCabinet(); }
  }

  function tariffButtons(target, onPick) {
    target.innerHTML = "";
    info.tariffs.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "tariff"; b.type = "button";
      var name = document.createElement("span"); name.textContent = "📱 " + t.title;
      var price = document.createElement("b"); price.textContent = t.price + " ₽/мес";
      b.appendChild(name); b.appendChild(price);
      b.onclick = function () { onPick(t, b); };
      target.appendChild(b);
    });
  }

  function showShop() {
    show($("shop"), true); show($("cabinet"), false);
    var chosen = null;
    var update = function () { $("buy").disabled = !(chosen && $("accept").checked); };
    tariffButtons($("tariffs"), function (t, b) {
      chosen = t;
      Array.prototype.forEach.call($("tariffs").children, function (x) { x.classList.remove("sel"); });
      b.classList.add("sel");
      $("buy").textContent = "Оплатить " + t.price + " ₽";
      update();
    });
    $("accept").onchange = update;
    $("buy").onclick = function () {
      $("buy").disabled = true; message("");
      api("/order", { body: { devices: chosen.devices, accept_terms: true } }).then(goPay, function (err) {
        message(err.message, "err"); update();
      });
    };
  }

  var controlsReady = false;
  function initCabinetControls() {
    if (controlsReady) return;
    controlsReady = true;
    tariffButtons($("c-tariffs"), function (t, b) {
      b.disabled = true; message("");
      api("/order", { token: token, body: { devices: t.devices, accept_terms: true } }).then(function (j) {
        if (j.paid) message("✅ Оплачено с баланса, подписка продлена.", "ok");
        goPay(j);
      }, function (err) { message(err.message, "err"); }).then(function () { b.disabled = false; });
    });
    var topup = function (amount) {
      message("");
      api("/topup", { token: token, body: { amount: amount } }).then(goPay, function (err) { message(err.message, "err"); });
    };
    document.querySelectorAll("[data-topup]").forEach(function (b) {
      b.onclick = function () { topup(+b.getAttribute("data-topup")); };
    });
    $("c-topup").onclick = function () {
      var v = parseInt($("c-amount").value, 10);
      if (!(v >= 50 && v <= 50000)) { message("Сумма от 50 до 50 000 ₽", "err"); return; }
      topup(v);
    };
    $("c-auto").onchange = function () {
      api("/autorenew", { token: token, body: { on: $("c-auto").checked } }).catch(function (err) { message(err.message, "err"); });
    };
    $("c-link").onclick = function () {
      $("c-link").disabled = true;
      api("/link", { token: token, body: {} }).then(function (j) {
        if (j.url) location.href = j.url; else loadCabinet();
      }, function (err) { message(err.message, "err"); }).then(function () { $("c-link").disabled = false; });
    };
    $("c-copykey").onclick = function () { App.copy($("c-key").textContent, function () { show($("c-keycopied"), true); }); };
    $("c-logout").onclick = function (e) {
      e.preventDefault();
      if (confirm("Выйти? Войти снова можно только по сохранённой ссылке на кабинет.")) { store.del(); location.reload(); }
    };
  }

  var polls = 0;
  function loadCabinet(check) {
    initCabinetControls();
    show($("shop"), false); show($("cabinet"), true);
    $("c-key").textContent = location.origin + location.pathname + "#k=" + token;
    api("/me" + (check ? "?check=1" : ""), { token: token }).then(function (me) {
      $("c-status").textContent = me.active ? "🟢 Активна" : me.link ? "🔴 Истекла" : "Не оплачена";
      $("c-until").textContent = me.expiry_ms ? App.fmtDate(me.expiry_ms) : me.active ? "бессрочно" : "—";
      $("c-devices").textContent = me.devices ? App.devicesWord(me.devices) : "—";
      $("c-balance").textContent = me.balance + " ₽";
      $("c-auto").checked = !!me.auto_renew;
      $("c-renew-title").textContent = me.link ? "Продлить на месяц" : "Оплатить подписку";
      show($("c-pending"), me.pending);
      show($("c-tg-linked"), !!me.telegram); show($("c-tg-unlinked"), !me.telegram);
      var keys = me.router_keys || [];
      show($("c-keys"), keys.length > 0);
      $("c-keys-list").innerHTML = "";
      keys.forEach(function (k) {
        var row = document.createElement("div"); row.className = "row";
        var a = document.createElement("span"); a.textContent = (k.expiry_ms > Date.now() ? "🟢 " : "🔴 ") + k.label;
        var b = document.createElement("span"); b.textContent = "до " + App.fmtDate(k.expiry_ms);
        row.appendChild(a); row.appendChild(b); $("c-keys-list").appendChild(row);
      });
      if (me.link) App.renderConnect($("c-connect"), me.link); else show($("c-connect"), false);
      if (me.pending && polls < 40) { polls++; setTimeout(function () { loadCabinet(true); }, 4000); }
    }, function (err) {
      if (err.status === 401) { store.del(); token = null; message("Кабинет не найден. Проверьте ссылку на кабинет.", "err"); showShop(); return; }
      message(err.message, "err");
    });
  }

  App.info().then(function (j) {
    info = j;
    show($("testnote"), j.test_mode);
    if (token) loadCabinet(true); else showShop();
  }, function (err) { message(err.message, "err"); });
})();
