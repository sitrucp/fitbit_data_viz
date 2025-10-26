// Generic Plotly chart screenshot saver.
// Usage (after a Plotly.newPlot(...).then()):
//   captureChart('sleep_today_sleeplog', dateStr, 'sleep_today_sleeplog_by_date');
(function () {
  const attempted = new Set();

  async function captureChart(baseName, dateStr, divId, opts = {}) {
    try {
      if (!baseName || !dateStr) return;
      divId = divId || baseName;
      const key = baseName + '|' + dateStr;
      if (!opts.force && attempted.has(key)) return;

      const el = document.getElementById(divId);
      if (!el) return;

      // Optional small delay (layout settling)
      if (opts.delayMs) {
        await new Promise(r => setTimeout(r, opts.delayMs));
      }

      const dataUrl = await Plotly.toImage(divId, {
        format: 'png',
        height: el.offsetHeight || 400,
        width: el.offsetWidth || 1200,
        scale: opts.scale || 2
      });

      const resp = await fetch('/api/save_chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseName, date: dateStr, imageDataUrl: dataUrl })
      });

      if (!resp.ok) {
        console.warn('captureChart server status', resp.status);
        return;
      }
      const json = await resp.json();
      console.log(`captureChart(${baseName}, ${dateStr}) ->`, json.status);
      attempted.add(key);
      return json;
    } catch (e) {
      console.warn('captureChart error', e);
    }
  }

  window.captureChart = captureChart;
})();