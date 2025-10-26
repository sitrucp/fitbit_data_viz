/**
 * Generic screenshot gallery builder.
 * Requires existing backend endpoint: /api/list_images?root=...&dir1=...&dir2=...
 *
 * Usage example:
 * createScreenshotGallery({
 *   mount: '#gallery',
 *   controls: {
 *     refreshBtn: '#refreshBtn',
 *     daysInput: '#daysInput',        // optional
 *     startDateInput: '#startDateInput' // optional
 *   },
 *   root: 'screenshots',
 *   dir1: 'index_sleep',
 *   dir2: 'sleep_today_sleeplog_by_date',
 *   baseName: 'sleep_today_sleeplog', // filename prefix before _YYYY_MM_DD.png
 *   days: 90,
 *   relativeImagePrefix: '../../',    // relative path from THIS html file to /public/
 *   placeholderHeight: 200,
 *   maxImageWidth: 1600               // CSS max width (can override)
 * });
 */
(function () {

  function createScreenshotGallery(cfg) {
    // Defaults
    cfg = Object.assign({
      days: 30,
      placeholderHeight: 180,
      relativeImagePrefix: '',
      maxImageWidth: 1600
    }, cfg || {});

    // Resolve elements
    const mountEl = typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount;
    if (!mountEl) {
      console.warn('Gallery mount element not found', cfg.mount);
      return;
    }

    const refreshBtn = cfg.controls && cfg.controls.refreshBtn ?
      document.querySelector(cfg.controls.refreshBtn) : null;
    const daysInput = cfg.controls && cfg.controls.daysInput ?
      document.querySelector(cfg.controls.daysInput) : null;
    const startDateInput = cfg.controls && cfg.controls.startDateInput ?
      document.querySelector(cfg.controls.startDateInput) : null;

    if (daysInput && !daysInput.value) daysInput.value = cfg.days;

    function isoDate(d) { return d.toISOString().slice(0, 10); }

    function buildDateArray(days, endDate) {
      const out = [];
      for (let i = 0; i < days; i++) {
        const dt = new Date(endDate.getTime() - i * 86400000);
        out.push(isoDate(dt));
      }
      return out;
    }

    function fileNameFor(dateISO) {
      return `${cfg.baseName}_${dateISO.replace(/-/g, '_')}.png`;
    }

    async function fetchFileList() {
      const url = `/api/list_images?root=${encodeURIComponent(cfg.root)}&dir1=${encodeURIComponent(cfg.dir1)}&dir2=${encodeURIComponent(cfg.dir2)}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('list_images status', res.status);
        return [];
      }
      const j = await res.json();
      return j.files || [];
    }

    function renderLoading() {
      mountEl.innerHTML = `<div style="color:#666;font-size:.85rem;">Loading...</div>`;
    }

    function renderGallery(files, dates) {
      const fileSet = new Set(files);
      const frag = document.createDocumentFragment();

      dates.forEach(dISO => {
        const fn = fileNameFor(dISO);
        const exists = fileSet.has(fn);

        const item = document.createElement('div');
        item.className = 'gallery-item';
        if (cfg.layout !== 'small-multiples') {
          item.style.margin = '0 0 32px 0';
        }

        const h = document.createElement('h3');
        h.style.cssText = 'margin:0 0 6px 0;font-size:0.95rem;font-weight:600;display:flex;justify-content:space-between;align-items:center;';
        const status = document.createElement('span');
        status.style.cssText = 'font-weight:normal;font-size:0.7rem;color:#666;';
        status.textContent = exists ? '' : 'missing';
        h.textContent = dISO;
        h.appendChild(status);
        item.appendChild(h);

        if (exists) {
          const wrap = document.createElement('div');
          wrap.className = 'img-wrapper';
          if (cfg.layout !== 'small-multiples') {
            wrap.style.cssText = `border:1px solid #ccc;background:#fafafa;padding:4px;overflow:hidden;`;
          }
          const img = document.createElement('img');
          img.src = `${cfg.relativeImagePrefix}${cfg.root}/${cfg.dir1}/${cfg.dir2}/${fn}`;
          img.alt = `${cfg.baseName} ${dISO}`;
          img.loading = 'lazy';
          if (cfg.layout !== 'small-multiples') {
            img.style.cssText = `width:100%;height:auto;display:block;max-width:${cfg.maxImageWidth}px;cursor:pointer;`;
          } else {
            img.style.cssText = 'width:100%;height:auto;display:block;cursor:pointer;';
          }
          img.onclick = (e) => {
            e.stopPropagation();
            item.classList.toggle('enlarged');
          };
          wrap.appendChild(img);
          item.appendChild(wrap);
        } else {
          const ph = document.createElement('div');
          ph.className = 'placeholder';
          if (cfg.layout !== 'small-multiples') {
            ph.style.cssText =
              `width:100%;max-width:${cfg.maxImageWidth}px;height:${cfg.placeholderHeight}px;display:flex;align-items:center;justify-content:center;color:#888;` +
              'background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 10px,#e5e5e5 10px,#e5e5e5 20px);' +
              'font-size:0.85rem;border:1px solid #ccc;';
          } else {
            ph.style.cssText =
              `width:100%;height:${cfg.placeholderHeight}px;display:flex;align-items:center;justify-content:center;color:#888;` +
              'background:repeating-linear-gradient(45deg,#f0f0f0,#f0f0f0 10px,#e5e5e5 10px,#e5e5e5 20px);' +
              'font-size:0.65rem;border:1px solid #ccc;';
          }
          ph.textContent = 'No screenshot yet';
          item.appendChild(ph);
        }

        frag.appendChild(item);
      });

      mountEl.innerHTML = '';
      mountEl.appendChild(frag);
    }

    async function build() {
      renderLoading();
      const chosenDays = daysInput ? (parseInt(daysInput.value, 10) || cfg.days) : cfg.days;
      let end = startDateInput && startDateInput.value ? new Date(startDateInput.value) : new Date();
      end.setHours(0, 0, 0, 0);
      let files = [];
      try {
        files = await fetchFileList();
      } catch (e) {
        console.warn('fetchFileList failed', e);
      }
      const dates = buildDateArray(Math.max(1, Math.min(chosenDays, 365)), end);
      renderGallery(files, dates);
    }

    // Wire controls
    if (refreshBtn) refreshBtn.addEventListener('click', build);
    if (daysInput) daysInput.addEventListener('change', build);
    if (startDateInput) startDateInput.addEventListener('change', build);

    build();

    return { rebuild: build, config: cfg };
  }

  window.createScreenshotGallery = createScreenshotGallery;
})();