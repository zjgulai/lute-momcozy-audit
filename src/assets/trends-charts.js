(function () {
  var raw = JSON.parse(document.getElementById("sessions-data").textContent);
  var methodFilter = document.getElementById("method-filter");
  var routeFilter = document.getElementById("route-filter");
  var statusGrid = document.getElementById("latest-threshold-grid");
  var instances = [];

  var palette = {
    accent: "#16684d",
    risk: "#92512c",
    muted: "#56665d",
    line: "#cbd3ca"
  };

  var statusDefs = [
    {metric: "lcp", label: "LCP", threshold: 2.5, unit: "s", decimals: 2},
    {metric: "fcp", label: "FCP", threshold: 1.8, unit: "s", decimals: 2},
    {metric: "ttfb", label: "TTFB", threshold: 800, unit: "ms", decimals: 0},
    {metric: "cls", label: "CLS", threshold: 0.1, unit: "score", decimals: 4},
    {metric: "tbt", label: "TBT", threshold: 200, unit: "ms", decimals: 0},
    {metric: "domNodes", label: "DOM Nodes", threshold: 1500, unit: "count", decimals: 0},
    {metric: "totalRequests", label: "Requests", threshold: 400, unit: "count", decimals: 0},
    {metric: "jsKb", label: "JS KB", threshold: 500, unit: "KB", decimals: 0},
    {metric: "thirdPartyFailures", label: "3P failures", threshold: 10, unit: "count", decimals: 0}
  ];

  function toUnixDate(value) {
    return Math.floor(new Date(value).getTime() / 1000);
  }

  function thresholdPlugin(threshold, color) {
    return {
      hooks: {
        draw: [function (u) {
          var ctx = u.ctx;
          var y = u.valToPos(threshold, "y", true);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(u.bbox.left, y);
          ctx.lineTo(u.bbox.left + u.bbox.width, y);
          ctx.stroke();
          ctx.restore();
        }]
      }
    };
  }

  function makeChart(el, chartData, dates, threshold, decimals) {
    if (!el) return null;
    var values = chartData || [];
    var plugins = threshold != null ? [thresholdPlugin(threshold, palette.risk)] : [];
    var opts = {
      width: el.offsetWidth || 480,
      height: 220,
      cursor: {show: true},
      legend: {show: false},
      axes: [
        {
          stroke: palette.muted,
          ticks: {stroke: palette.line},
          grid: {stroke: palette.line},
          values: function (u, vals) {
            return vals.map(function (v) {
              return new Date(v * 1000).toLocaleDateString("en-US", {month: "short", day: "numeric"});
            });
          }
        },
        {
          stroke: palette.muted,
          ticks: {stroke: palette.line},
          grid: {stroke: palette.line},
          values: function (u, vals) {
            return vals.map(function (v) { return v == null ? "" : v.toFixed(decimals); });
          }
        }
      ],
      series: [
        {},
        {
          stroke: palette.accent,
          width: 2,
          fill: "rgba(22,104,77,0.08)",
          points: {show: true, size: 8, fill: palette.accent}
        }
      ],
      plugins: plugins
    };

    return new uPlot(opts, [dates, values], el);
  }

  function summarizeRoutes(session) {
    if (!Array.isArray(session.routeSummaries)) return [];
    return session.routeSummaries;
  }

  function getSessionMetric(session, routeId, viewport, metric) {
    var route = null;
    var value = null;

    if (routeId === "all") {
      var top = viewport === "desktop" ? session.metrics : session.mobile;
      return top && top[metric] != null ? top[metric] : null;
    }

    var routes = summarizeRoutes(session);
    for (var i = 0; i < routes.length; i++) {
      if (routes[i].routeId === routeId) {
        route = routes[i];
        break;
      }
    }

    if (!route) return null;
    value = viewport === "desktop" ? route.desktop : route.mobile;
    return value && value[metric] != null ? value[metric] : null;
  }

  function inFilteredScope(session) {
    var method = session.isAutomated ? "automated" : "manual";
    if (methodFilter.value !== "all" && methodFilter.value !== method) return false;

    if (routeFilter.value === "all") return true;

    var routes = summarizeRoutes(session);
    for (var i = 0; i < routes.length; i++) {
      if (routes[i].routeId === routeFilter.value) return true;
    }
    return false;
  }

  function hasRouteData(session) {
    return Array.isArray(session.routeSummaries) && session.routeSummaries.length > 0;
  }

  function buildRouteOptions() {
    var seen = {};
    var order = [];

    for (var i = 0; i < raw.length; i++) {
      var session = raw[i];
      if (!hasRouteData(session)) continue;
      var routes = summarizeRoutes(session);
      for (var j = 0; j < routes.length; j++) {
        var id = routes[j].routeId;
        if (!seen[id]) {
          seen[id] = routes[j].label || id;
          order.push(id);
        }
      }
    }

    for (var k = 0; k < order.length; k++) {
      var id = order[k];
      var option = document.createElement("option");
      option.value = id;
      option.textContent = seen[id];
      routeFilter.appendChild(option);
    }
  }

  function hideRouteTables(isFiltered) {
    var method = methodFilter.value;
    var route = routeFilter.value;
    var methodBreakRows = document.querySelectorAll(".method-break-row");
    var rows = document.querySelectorAll(".session-row");

    rows.forEach(function (row) {
      var rowMethod = row.getAttribute("data-method");
      var routeIds = (row.getAttribute("data-route-ids") || "").split(",").filter(Boolean);
      var inMethod = (method === "all" || method === rowMethod);
      var inRoute = (route === "all" || routeIds.indexOf(route) !== -1);
      row.style.display = (inMethod && inRoute) ? "" : "none";
    });

    methodBreakRows.forEach(function (row) {
      row.style.display = isFiltered ? "none" : "";
    });
  }

  function statusClassFromValue(value, threshold) {
    if (value == null) return "status-na";
    return value <= threshold ? "status-pass" : "status-fail";
  }

  function statusValueText(value, decimals, unit) {
    if (value == null) return "N/A";
    return Number(value).toFixed(decimals) + " " + unit;
  }

  function statusDeltaText(current, previous, decimals) {
    if (current == null || previous == null) return "No previous comparable point";
    var delta = current - previous;
    if (delta === 0) return "Flat";
    var sign = delta > 0 ? "↑" : "↓";
    var changed = Math.abs(delta);
    var trend = delta > 0 ? "worse" : "better";
    return sign + " " + changed.toFixed(decimals) + " " + trend;
  }

  function renderLatestStatusCards(filteredSessions) {
    var activeRoute = routeFilter.value;
    var candidates = filteredSessions.filter(function (session) {
      if (!session.isAutomated) return false;
      if (activeRoute === "all") return true;
      var routeIds = session.routeIds || [];
      return routeIds.indexOf(activeRoute) !== -1;
    });

    if (!statusGrid) return;
    statusGrid.innerHTML = "";

    if (candidates.length === 0) {
      var empty = document.createElement("p");
      empty.className = "status-empty";
      empty.textContent = "No automated session available for this scope.";
      statusGrid.appendChild(empty);
      return;
    }

    var latest = candidates[candidates.length - 1];
    var previous = candidates.length >= 2 ? candidates[candidates.length - 2] : null;
    var routeForScope = activeRoute === "all" ? "all" : activeRoute;

    statusDefs.forEach(function (def) {
      var latestValue = getSessionMetric(latest, routeForScope, "desktop", def.metric);
      var previousValue = previous ? getSessionMetric(previous, routeForScope, "desktop", def.metric) : null;
      var statusClass = statusClassFromValue(latestValue, def.threshold);
      var statusText = latestValue == null ? "N/A" : (latestValue <= def.threshold ? "PASS" : "FAIL");
      var trend = statusDeltaText(latestValue, previousValue, def.decimals);

      var card = document.createElement("article");
      card.className = "status-card " + statusClass;

      var label = document.createElement("p");
      label.className = "status-label";
      label.textContent = def.label;
      card.appendChild(label);

      var value = document.createElement("p");
      value.className = "status-value";
      value.textContent = statusValueText(latestValue, def.decimals, def.unit);
      card.appendChild(value);

      var meta = document.createElement("p");
      meta.className = "status-meta";
      meta.textContent = "Threshold: " + def.threshold + " " + def.unit + " · " + statusText + " · " + trend;
      card.appendChild(meta);

      statusGrid.appendChild(card);
    });
  }

  function getFilteredSessions() {
    return raw.filter(inFilteredScope);
  }

  function buildAll() {
    var filtered = getFilteredSessions();
    var dates = filtered.map(function (session) { return toUnixDate(session.observedAt); });
    var hasRouteScope = routeFilter.value !== "all";
    var activeRoute = routeFilter.value;

    instances.forEach(function (instance) { try { instance.destroy(); } catch (e) {} });
    instances = [];

    chartDefs.forEach(function (def) {
      var el = document.getElementById(def.id);
      if (!el) return;
      el.innerHTML = "";
      var values = filtered.map(function (session) {
        return getSessionMetric(
          session,
          hasRouteScope ? activeRoute : "all",
          "desktop",
          def.metric
        );
      });
      var chart = makeChart(el, values, dates, def.thresh, def.dec);
      if (chart) instances.push(chart);
    });

    renderLatestStatusCards(filtered);
    hideRouteTables(routeFilter.value !== "all" || methodFilter.value !== "all");
  }

  var chartDefs = [
    {id: "chart-lcp",      metric: "lcp",             thresh: statusDefs[0].threshold,      dec: statusDefs[0].decimals},
    {id: "chart-fcp",      metric: "fcp",             thresh: statusDefs[1].threshold,      dec: statusDefs[1].decimals},
    {id: "chart-ttfb",     metric: "ttfb",            thresh: statusDefs[2].threshold,      dec: statusDefs[2].decimals},
    {id: "chart-cls",      metric: "cls",             thresh: statusDefs[3].threshold,      dec: statusDefs[3].decimals},
    {id: "chart-3p",       metric: "thirdPartyFailures", thresh: statusDefs[8].threshold,     dec: statusDefs[8].decimals},
    {id: "chart-requests", metric: "totalRequests",   thresh: null,                         dec: statusDefs[6].decimals},
    {id: "chart-js",       metric: "jsKb",            thresh: statusDefs[7].threshold,      dec: statusDefs[7].decimals},
    {id: "chart-dom",      metric: "domNodes",        thresh: statusDefs[5].threshold,      dec: statusDefs[5].decimals}
  ];

  buildRouteOptions();
  buildAll();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildAll, 150);
  });

  methodFilter.addEventListener("change", buildAll);
  routeFilter.addEventListener("change", buildAll);

})();
