(function () {
  var link = "";
  try { link = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  if (/^https?:\/\/\S+$/.test(link)) {
    App.renderConnect(App.$("connect"), link);
    // Opened from the Telegram mini app ("Добавить в INCY"): hand the subscription to INCY right away.
    if (/(^|[?&])go=1(&|$)/.test(location.search.slice(1))) location.href = "incy://add/" + link;
  } else {
    App.show(App.$("bad"), true);
  }
})();
