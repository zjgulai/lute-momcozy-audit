(function () {
  var raw = JSON.parse(document.getElementById("sessions-data").textContent);
  var dates = raw.map(function (s) { return Math.floor(new Date(s.observedAt).getTime() / 1000); });

  var palette = {
    accent: "#16684d",
    risk:   "#92512c",
    muted:  "#56665d",
    line:   "#cbd3ca"
  };

  var thresholds = {lcp: 2.5, fcp: 1.8, ttfb: 800, cls: 0.1, failures: 10, jsKb: 500, domNodes: 1500};

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

  function makeChart(el, values, threshold, decimals) {
    if (!el) return null;
    var plugins = threshold != null ? [thresholdPlugin(threshold, palette.risk)] : [];
    var opts = {
      width:  el.offsetWidth || 480,
      height: 220,
      cursor: {show: true},
      legend: {show: false},
      axes: [
        {
          stroke: palette.muted,
          ticks:  {stroke: palette.line},
          grid:   {stroke: palette.line},
          values: function (u, vals) {
            return vals.map(function (v) {
              return new Date(v * 1000).toLocaleDateString("en-US", {month: "short", day: "numeric"});
            });
          }
        },
        {
          stroke: palette.muted,
          ticks:  {stroke: palette.line},
          grid:   {stroke: palette.line},
          values: function (u, vals) {
            return vals.map(function (v) { return v == null ? "" : v.toFixed(decimals); });
          }
        }
      ],
      series: [
        {},
        {
          stroke: palette.accent,
          width:  2,
          fill:   "rgba(22,104,77,0.08)",
          points: {show: true, size: 8, fill: palette.accent}
        }
      ],
      plugins: plugins
    };
    return new uPlot(opts, [dates, values], el);
  }

  var chartDefs = [
    {id: "chart-lcp",      vals: function(s) { return s.metrics.lcp; },
     thresh: thresholds.lcp, dec: 2},
    {id: "chart-fcp",      vals: function(s) { return s.metrics.fcp; },
     thresh: thresholds.fcp, dec: 2},
    {id: "chart-ttfb",     vals: function(s) { return s.metrics.ttfb; },
     thresh: thresholds.ttfb, dec: 0},
    {id: "chart-cls",      vals: function(s) { return s.metrics.cls; },
     thresh: thresholds.cls, dec: 4},
    {id: "chart-3p",       vals: function(s) { return s.metrics.thirdPartyFailures != null ? s.metrics.thirdPartyFailures : null; },
     thresh: thresholds.failures, dec: 0},
    {id: "chart-requests", vals: function(s) { return s.metrics.totalRequests != null ? s.metrics.totalRequests : null; },
     thresh: null, dec: 0},
    {id: "chart-js",       vals: function(s) { return s.metrics.jsKb != null ? s.metrics.jsKb : null; },
     thresh: thresholds.jsKb, dec: 0},
    {id: "chart-dom",      vals: function(s) { return s.metrics.domNodes != null ? s.metrics.domNodes : null; },
     thresh: thresholds.domNodes, dec: 0}
  ];

  var instances = [];

  function buildAll() {
    instances.forEach(function(u) { try { u.destroy(); } catch(e) {} });
    instances = [];
    chartDefs.forEach(function (def) {
      var el = document.getElementById(def.id);
      if (!el) return;
      el.innerHTML = "";
      var u = makeChart(el, raw.map(def.vals), def.thresh, def.dec);
      if (u) instances.push(u);
    });
  }

  buildAll();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildAll, 150);
  });
})();
