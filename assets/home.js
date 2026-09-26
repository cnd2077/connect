// Home page. Old links point to the site root, so hand them over to the right page:
//   #https://...  — subscription link from the bot  -> /add/
//   #k=<token>    — personal cabinet link           -> /cabinet/
(function () {
  var hash = location.hash.slice(1);
  if (/^https?%3A|^https?:\/\//i.test(hash)) { location.replace(App.url("/add/") + location.hash); return; }
  if (/(^|&)k=/.test(hash)) { location.replace(App.url("/cabinet/") + location.hash); return; }

  App.info().then(function (info) {
    var box = App.$("tariffs");
    box.innerHTML = "";
    info.tariffs.forEach(function (t) {
      var row = document.createElement("div");
      row.className = "row";
      var name = document.createElement("span"); name.textContent = "📱 " + t.title;
      var price = document.createElement("b"); price.textContent = t.price + " ₽/мес";
      row.appendChild(name); row.appendChild(price);
      box.appendChild(row);
    });
  }, function (err) { App.$("tariffs").textContent = err.message; });
})();
