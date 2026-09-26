(function () {
  var el = App.$("doc");
  App.api("/docs/" + el.getAttribute("data-doc")).then(function (j) { el.textContent = j.text; },
    function (err) { el.textContent = err.message; });
})();
