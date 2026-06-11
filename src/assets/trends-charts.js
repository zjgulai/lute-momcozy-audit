(function () {
  var raw = JSON.parse(document.getElementById("sessions-data").textContent);
  var dates = raw.map(function (s) { return Math.floor(new Date(s.observedAt).getTime() / 1000); });

  var palette = {
    accent: "#16684d",
    risk:   "#92512c",
    warn:   "#8a6a00",
    muted:  "#56665d",
    line:   "#cbd3ca"
  };

  var thresholds = {lcp: 2.5, fcp: 1.8, ttfb: 800, cls: 0.1, failures: 10};

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
    if (!el) return;
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
    new uPlot(opts, [dates, values], el);
  }

  makeChart(document.getElementById("chart-lcp"),
    raw.map(function (s) { return s.metrics.lcp; }), thresholds.lcp, 2);

  makeChart(document.getElementById("chart-fcp"),
    raw.map(function (s) { return s.metrics.fcp; }), thresholds.fcp, 2);

  makeChart(document.getElementById("chart-ttfb"),
    raw.map(function (s) { return s.metrics.ttfb; }), thresholds.ttfb, 0);

  makeChart(document.getElementById("chart-cls"),
    raw.map(function (s) { return s.metrics.cls; }), thresholds.cls, 4);

  makeChart(document.getElementById("chart-3p"),
    raw.map(function (s) { return s.metrics.thirdPartyFailures != null ? s.metrics.thirdPartyFailures : null; }),
    thresholds.failures, 0);

  makeChart(document.getElementById("chart-requests"),
    raw.map(function (s) { return s.metrics.totalRequests != null ? s.metrics.totalRequests : null; }),
    null, 0);
})();
