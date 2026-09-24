(function () {
  var burger = document.getElementById("burger");
  var nav = document.getElementById("main-nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      nav.classList.toggle("is-open");
    });
  }

  function parseModels(el) {
    try {
      return JSON.parse(el.getAttribute("data-models") || "{}");
    } catch (e) {
      return {};
    }
  }

  function fillModels(modelSel, make, selected) {
    if (!modelSel) return;
    var models = modelSel._models || {};
    var list = make ? models[make] || [] : [];
    var prev = selected != null && selected !== "" ? selected : modelSel.value;
    modelSel.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Все модели";
    modelSel.appendChild(opt0);
    list.forEach(function (m) {
      var o = document.createElement("option");
      o.value = m;
      o.textContent = m;
      if (m === prev) o.selected = true;
      modelSel.appendChild(o);
    });
    if (prev && modelSel.value !== prev) modelSel.value = prev;
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  function fillSelectOptions(sel, values, selected, emptyLabel) {
    if (!sel) return;
    var prev = selected != null && selected !== "" ? selected : sel.value;
    sel.innerHTML = "";
    var opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = emptyLabel;
    sel.appendChild(opt0);
    (values || []).forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      if (String(v) === String(prev)) o.selected = true;
      sel.appendChild(o);
    });
    if (prev && sel.value !== prev) sel.value = prev;
  }

  function applyFilterMeta(form, meta) {
    if (!meta) return;
    var makeSel = form.querySelector('select[name="make"]');
    var modelSel = form.querySelector('select[name="model"]');
    var yearFrom = form.querySelector('select[name="year_from"], input[name="year_from"]');
    var yearTo = form.querySelector('select[name="year_to"], input[name="year_to"]');
    var fuelSel = form.querySelector('select[name="fuel"]');
    var transSel = form.querySelector('select[name="transmission"]');
    var models = meta.models_by_make || {};
    form.setAttribute("data-models", JSON.stringify(models));
    if (modelSel) modelSel._models = models;
    var makeVal = makeSel ? makeSel.value : "";
    fillSelectOptions(makeSel, meta.makes || [], makeVal, "Все марки");
    if (modelSel) fillModels(modelSel, makeSel ? makeSel.value : "", "");
    if (yearFrom && yearFrom.tagName === "SELECT") {
      fillSelectOptions(yearFrom, meta.year_options || [], yearFrom.value, "Год от");
    } else if (yearFrom) {
      yearFrom.placeholder = meta.year_min != null ? String(meta.year_min) : "";
    }
    if (yearTo && yearTo.tagName === "SELECT") {
      fillSelectOptions(yearTo, meta.year_options || [], yearTo.value, "Год до");
    } else if (yearTo) {
      yearTo.placeholder = meta.year_max != null ? String(meta.year_max) : "";
    }
    fillSelectOptions(fuelSel, meta.fuels || [], fuelSel ? fuelSel.value : "", "Любое");
    fillSelectOptions(transSel, meta.transmissions || [], transSel ? transSel.value : "", "Любая");
  }

  function wireFinder(form) {
    if (!form) return;
    var models = parseModels(form);
    var makeSel = form.querySelector('select[name="make"]');
    var modelSel = form.querySelector('select[name="model"]');
    var countUrl = form.getAttribute("data-count-url");
    var metaUrl = form.getAttribute("data-meta-url");
    var isHero = form.id === "hero-finder";
    var countEl = isHero
      ? document.getElementById("hero-count")
      : document.getElementById("cat-count");
    var countTop = document.getElementById("cat-count-top");
    var countWords = form.querySelectorAll("[data-count-word]");
    if (modelSel) modelSel._models = models;

    var initialModel = modelSel ? modelSel.getAttribute("data-selected") || "" : "";
    if (makeSel && modelSel) {
      fillModels(modelSel, makeSel.value, initialModel);
      makeSel.addEventListener("change", function () {
        fillModels(modelSel, makeSel.value, "");
        updateCount();
      });
    }

    var srcTabs = form.querySelectorAll('.finder__tab[data-src]');
    var srcInput = form.querySelector('input[name="src"]');
    srcTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        srcTabs.forEach(function (t) {
          t.classList.remove("is-active");
        });
        tab.classList.add("is-active");
        if (srcInput) srcInput.value = tab.getAttribute("data-src") || "all";
        updateCount();
      });
    });

    var vehicleTabs = form.querySelectorAll("[data-vehicle]");
    var vehicleInput = form.querySelector('input[name="vehicle"]');
    function currentVehicle() {
      if (vehicleInput && vehicleInput.value) return vehicleInput.value;
      var active = form.querySelector("[data-vehicle].is-active");
      return (active && active.getAttribute("data-vehicle")) || "car";
    }
    vehicleTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        vehicleTabs.forEach(function (t) {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        tab.classList.add("is-active");
        tab.setAttribute("aria-selected", "true");
        var v = tab.getAttribute("data-vehicle") || "car";
        if (vehicleInput) vehicleInput.value = v;
        countWords.forEach(function (el) {
          el.textContent = v === "moto" ? "мото" : "машин";
        });
        if (metaUrl) {
          fetch(metaUrl + "?vehicle=" + encodeURIComponent(v), {
            headers: { Accept: "application/json" },
          })
            .then(function (r) {
              return r.json();
            })
            .then(function (meta) {
              applyFilterMeta(form, meta);
              updateCount();
            })
            .catch(function () {
              updateCount();
            });
        } else {
          updateCount();
        }
      });
    });

    function collect() {
      var fd = new FormData(form);
      var params = new URLSearchParams();
      ["src", "q", "make", "model", "year_from", "year_to", "vehicle"].forEach(function (k) {
        var v = fd.get(k);
        if (v) params.set(k, v);
      });
      if (!params.get("src")) params.set("src", "all");
      if (!params.get("vehicle")) params.set("vehicle", currentVehicle());
      return params;
    }

    function updateCount() {
      if (!countUrl) return;
      var params = collect();
      fetch(countUrl + "?" + params.toString(), {
        headers: { Accept: "application/json" },
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var n = data && data.count != null ? data.count : 0;
          if (countEl) countEl.textContent = n;
          if (countTop) countTop.textContent = n;
        })
        .catch(function () {});
    }

    form.addEventListener("input", debounce(updateCount, 200));
    form.addEventListener("change", updateCount);

    if (countUrl) updateCount();
  }

  wireFinder(document.getElementById("hero-finder"));
  wireFinder(document.getElementById("catalog-finder"));

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtNum(n) {
    if (n == null || n === "") return "0";
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function renderBrandLot(item) {
    var ph = escapeHtml(item.make || "Авто");
    var photo = item.photo_url
      ? '<img src="' +
        escapeHtml(item.photo_url) +
        '" alt="' +
        escapeHtml(item.title) +
        '" loading="lazy" data-ph="' +
        ph +
        '" onerror="var d=document.createElement(\'div\');d.className=\'lot-card__placeholder\';d.textContent=this.getAttribute(\'data-ph\')||\'Авто\';this.replaceWith(d)">'
      : '<div class="lot-card__placeholder">' + ph + "</div>";
    var badges =
      (item.is_new ? '<span class="badge badge--new">NEW</span>' : "");
    var turnkey =
      item.turnkey != null
        ? '<div class="price price--turnkey">под ключ ≈ ' +
          fmtNum(item.turnkey) +
          " ₽</div>"
        : "";
    var specs = [
      item.year || "—",
      fmtNum(item.mileage_km || 0) + " км",
      item.fuel || "—",
      item.transmission || "—",
      item.body || "",
    ]
      .filter(Boolean)
      .map(function (s) {
        return "<span>" + escapeHtml(s) + "</span>";
      })
      .join("");
    return (
      '<a class="lot-card" href="' +
      escapeHtml(item.url || "#") +
      '" target="_blank" rel="noopener">' +
      '<div class="lot-card__photo">' +
      photo +
      '<span class="lot-card__flag">' +
      escapeHtml(item.flag || "") +
      "</span>" +
      badges +
      "</div>" +
      '<div class="lot-card__body">' +
      '<div class="lot-card__title">' +
      escapeHtml(item.title) +
      "</div>" +
      '<div class="lot-card__specs">' +
      specs +
      "</div>" +
      '<div class="lot-card__prices">' +
      '<div class="price">' +
      fmtNum(item.price_rub) +
      " ₽</div>" +
      turnkey +
      "</div></div></a>"
    );
  }

  var brandGrid = document.getElementById("brand-grid");
  var brandLootGrid = document.getElementById("brand-lot-grid");
  var brandEmpty = document.getElementById("brand-empty");
  var brandTitle = document.getElementById("brand-results-title");
  var brandN = document.getElementById("brand-results-n");
  var brandLink = document.getElementById("brand-results-link");
  var brandResults = document.getElementById("brand-results");
  var brandTypeTabs = document.getElementById("brand-type-tabs");
  var brandTimer;
  var brandSeq = 0;
  var brandVehicle = (brandGrid && brandGrid.getAttribute("data-vehicle")) || "car";

  function parseBrandList(kind) {
    if (!brandGrid) return [];
    try {
      var raw = brandGrid.getAttribute("data-brands-" + kind) || "[]";
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function brandLogoInner(b) {
    if (b.logo) {
      return (
        '<img class="brand-card__img" src="' +
        escapeHtml(b.logo) +
        '" alt="" width="56" height="56" loading="lazy" ' +
        'onerror="this.remove();this.parentNode.textContent=\'' +
        escapeHtml((b.name || "").slice(0, 2)) +
        '\'">'
      );
    }
    return escapeHtml((b.name || "").slice(0, 2));
  }

  function brandCardHtml(b, activeMake) {
    var active = b.name === activeMake ? " is-active" : "";
    var empty = b.has_lots ? "" : " is-empty";
    return (
      '<button type="button" class="brand-card' +
      active +
      empty +
      '" data-make="' +
      escapeHtml(b.name) +
      '" data-count="' +
      escapeHtml(b.count) +
      '" data-vehicle="' +
      escapeHtml(b.vehicle || brandVehicle) +
      '" role="listitem" title="' +
      escapeHtml(b.name) +
      (b.count ? " — " + escapeHtml(b.count) + " лотов" : "") +
      '">' +
      '<span class="brand-card__logo" aria-hidden="true">' +
      brandLogoInner(b) +
      "</span>" +
      '<span class="brand-card__name">' +
      escapeHtml(b.name) +
      "</span></button>"
    );
  }

  function setVehicle(vehicle) {
    brandVehicle = vehicle === "moto" ? "moto" : "car";
    if (brandGrid) brandGrid.setAttribute("data-vehicle", brandVehicle);
    if (brandResults) brandResults.setAttribute("data-vehicle", brandVehicle);
    if (brandTypeTabs) {
      brandTypeTabs.querySelectorAll(".tab").forEach(function (t) {
        var on = t.getAttribute("data-vehicle") === brandVehicle;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
    }
    var list = parseBrandList(brandVehicle);
    var first = list.length ? list[0].name : "";
    if (brandGrid) {
      brandGrid.innerHTML = list.map(function (b) {
        return brandCardHtml(b, first);
      }).join("");
      brandGrid.hidden = list.length === 0;
    }
    var emptyCar = document.getElementById("brand-grid-empty");
    var emptyMoto = document.getElementById("brand-grid-empty-moto");
    if (emptyCar) {
      if (brandVehicle === "car" && !list.length) emptyCar.removeAttribute("hidden");
      else emptyCar.setAttribute("hidden", "");
    }
    if (emptyMoto) {
      if (brandVehicle === "moto" && !list.length) emptyMoto.removeAttribute("hidden");
      else emptyMoto.setAttribute("hidden", "");
    }
    if (first) loadBrand(first);
    else {
      if (brandLootGrid) brandLootGrid.innerHTML = "";
      if (brandEmpty) brandEmpty.setAttribute("hidden", "");
      if (brandTitle) brandTitle.textContent = "Выберите марку";
      if (brandLink) brandLink.href = "/catalog?src=all";
      if (brandResults) brandResults.classList.remove("is-loading");
    }
  }

  if (brandTypeTabs) {
    brandTypeTabs.addEventListener("click", function (e) {
      var tab = e.target.closest(".tab[data-vehicle]");
      if (!tab) return;
      setVehicle(tab.getAttribute("data-vehicle"));
    });
  }

  function loadBrand(make) {
    if (!brandLootGrid) return;
    var seq = ++brandSeq;
    if (brandResults) brandResults.classList.add("is-loading");
    if (brandTitle) {
      brandTitle.innerHTML =
        escapeHtml(make) + " — <span id=\"brand-results-n\">…</span> лотов";
      brandN = document.getElementById("brand-results-n");
    }
    if (brandLink) {
      brandLink.href = "/catalog?src=all&make=" + encodeURIComponent(make);
    }
    if (brandResults) brandResults.setAttribute("data-make", make);

    fetch(
      "/api/lots?make=" +
        encodeURIComponent(make) +
        "&vehicle=" +
        encodeURIComponent(brandVehicle) +
        "&limit=8",
      {
        headers: { Accept: "application/json" },
      }
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (seq !== brandSeq) return;
        var items = (data && data.items) || [];
        brandLootGrid.innerHTML = items.map(renderBrandLot).join("");
        if (brandN) brandN.textContent = items.length;
        if (brandEmpty) {
          if (items.length) brandEmpty.setAttribute("hidden", "");
          else brandEmpty.removeAttribute("hidden");
        }
        if (brandResults) brandResults.classList.remove("is-loading");
      })
      .catch(function () {
        if (seq !== brandSeq) return;
        if (brandResults) brandResults.classList.remove("is-loading");
      });
  }

  if (brandGrid) {
    brandGrid.addEventListener("click", function (e) {
      var card = e.target.closest(".brand-card");
      if (!card) return;
      var make = card.getAttribute("data-make");
      if (!make) return;
      brandGrid.querySelectorAll(".brand-card").forEach(function (el) {
        el.classList.remove("is-active");
      });
      card.classList.add("is-active");
      clearTimeout(brandTimer);
      brandTimer = setTimeout(function () {
        loadBrand(make);
      }, 80);
    });
  }
})();

