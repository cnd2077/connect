// Shared helpers for every page: API calls, cabinet login storage, copy, connect block.
(function () {
  var SITE = window.SITE || {};
  var KEY = "vpn_cabinet";
  var $ = function (id) { return document.getElementById(id); };
  var show = function (el, on) { if (el) el.classList.toggle("hidden", !on); };

  var store = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} },
    del: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  function message(text, cls) {
    var m = $("msg");
    if (!m) return;
    m.textContent = text || "";
    m.className = "card " + (cls || "");
    show(m, !!text);
    if (text) window.scrollTo(0, 0);
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = {};
    if (opts.token) headers.Authorization = "Bearer " + opts.token;
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(SITE.api + path, { method: opts.body ? "POST" : "GET", headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var e = new Error(j.error || ("Ошибка " + r.status)); e.status = r.status; throw e; }
          return j;
        });
      }, function () { throw new Error("Сервер сейчас недоступен. Попробуйте позже или напишите в поддержку."); });
  }

  var infoPromise = null;
  function info() {
    if (!infoPromise) {
      infoPromise = api("/info").then(function (j) {
        document.querySelectorAll("[data-brand]").forEach(function (el) { el.textContent = j.service; });
        document.title = document.title.replace(/VPN$/, j.service);
        var sup = document.querySelector("[data-support]");
        if (sup && j.support) { sup.textContent = " · Поддержка: " + j.support; show(sup, true); }
        return j;
      });
    }
    return infoPromise;
  }

  function copy(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) { prompt("Скопируйте:", text); }
      document.body.removeChild(t);
    }
  }

  function detectOs() {
    var ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "ios"
      : /Android/.test(ua) ? "android" : /Windows/.test(ua) ? "win" : /Mac|Linux/.test(ua) ? "mac" : "";
  }

  function highlightOs(root) {
    var own = (root || document).querySelector('[data-os="' + detectOs() + '"]');
    if (own) own.classList.add("hl");
  }

  // Fills a block made from _includes/connect.html with a subscription link.
  function renderConnect(target, link) {
    var tpl = $("connect-tpl");
    target.innerHTML = "";
    target.appendChild(tpl.content.cloneNode(true));
    highlightOs(target);
    target.querySelector("[data-incy]").href = "incy://add/" + link;
    target.querySelector("[data-happ]").href = "happ://add/" + link;
    target.querySelector("[data-copy]").onclick = function () {
      copy(link, function () { show(target.querySelector("[data-copied]"), true); });
    };
    show(target, true);
  }

  function fmtDate(ms) {
    return new Date(ms).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function devicesWord(n) { return n + (n === 1 ? " устройство" : n > 1 && n < 5 ? " устройства" : " устройств"); }

  window.App = { $: $, show: show, store: store, message: message, api: api, info: info, copy: copy,
                 highlightOs: highlightOs, renderConnect: renderConnect, fmtDate: fmtDate, devicesWord: devicesWord,
                 url: function (path) { return (SITE.base || "/").replace(/\/$/, "") + path; } };

  highlightOs();
  info().catch(function () {});
})();
