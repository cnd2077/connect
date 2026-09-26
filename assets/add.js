(function () {
  var link = "";
  try { link = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
  if (/^https?:\/\/\S+$/.test(link)) App.renderConnect(App.$("connect"), link);
  else App.show(App.$("bad"), true);
})();
