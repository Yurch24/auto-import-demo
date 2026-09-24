(function () {
  // Static demo: intercept API fetches and POST forms.
  window.__DEMO_API__ = window.__DEMO_API__ || {};

  function norm(path) {
    if (!path) return "";
    var i = path.indexOf("?");
    var base = i >= 0 ? path.slice(0, i) : path;
    var qs = i >= 0 ? path.slice(i + 1) : "";
    var params = new URLSearchParams(qs);
    // stable order for known endpoints
    if (base === "/api/filter/meta") {
      return base + "?vehicle=" + (params.get("vehicle") || "car");
    }
    if (base === "/api/brands") {
      return base + "?vehicle=" + (params.get("vehicle") || "car");
    }
    if (base === "/api/lots/count") {
      var keys = ["src", "vehicle", "q", "make", "model", "year_from", "year_to"];
      var parts = keys.map(function (k) {
        var v = params.get(k);
        return v ? k + "=" + encodeURIComponent(v) : null;
      }).filter(Boolean);
      if (!params.get("src")) parts.unshift("src=all");
      if (!params.get("vehicle")) parts.push("vehicle=car");
      return base + "?" + parts.join("&");
    }
    if (base === "/api/lots") {
      var p2 = [];
      ["make", "vehicle", "limit"].forEach(function (k) {
        var v = params.get(k);
        if (v != null && v !== "") p2.push(k + "=" + encodeURIComponent(v));
      });
      return base + "?" + p2.join("&");
    }
    return path;
  }

  var store = window.__DEMO_API__;

  function lookup(path) {
    var n = norm(path);
    if (store[n] !== undefined) return store[n];
    // try without optional params
    var base = n.split("?")[0];
    var keys = Object.keys(store);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].split("?")[0] === base && base === "/api/lots/count") {
        // match src/vehicle loosely if present in request
        return store[keys[i]];
      }
    }
    return undefined;
  }

  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    if (url && url.indexOf("/api/") !== -1) {
      var path = url;
      try {
        path = new URL(url, location.href).pathname + new URL(url, location.href).search;
      } catch (e) {}
      var data = lookup(path);
      if (data !== undefined) {
        return Promise.resolve(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ count: 0, items: [], brands: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    if (origFetch) return origFetch.apply(this, arguments);
    return Promise.reject(new Error("fetch unavailable"));
  };

  function demoAlert() {
    alert("Демо-режим: на статической версии формы и API отключены.\n\nПолная версия — с бэкендом и базой данных.");
  }

  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || form.tagName !== "FORM") return;
    var action = form.getAttribute("action") || "";
    var method = (form.getAttribute("method") || "get").toLowerCase();
    if (method === "post" || form.getAttribute("data-demo-form") || action.indexOf("/calculator") !== -1) {
      e.preventDefault();
      demoAlert();
      return;
    }
    // GET catalog filters: keep on static pages (no server) — prevent reload loops
    if (action.indexOf("catalog") !== -1 || form.id === "catalog-finder" || form.id === "hero-finder") {
      // hero finder: navigate to catalog.html with query as hash-less static no-op
      if (form.id === "hero-finder") {
        e.preventDefault();
        var src = (form.querySelector('input[name="src"]') || {}).value || "all";
        var target =
          src === "encar" || src === "bidcars" || src === "che168"
            ? "catalog-" + src + ".html"
            : "catalog.html";
        window.location.href = target;
        return;
      }
      // catalog filter form: stay on page (demo)
      e.preventDefault();
      alert("Фильтры в демо отключены — показан статический снимок каталога.");
    }
  });
})();
