/* 共用版面（頁首、選單、頁尾）與介面工具 */
(function () {
  'use strict';
  const PAGES = [
    ['index', '首頁'], ['calculators', '基礎計算'], ['travel-risk', '行程風險'],
    ['importation', '輸出病例'], ['branching', '爆發機率'], ['seir', 'SEIR 模擬'],
    ['quarantine', '檢疫策略'], ['airborne', '空氣傳播'], ['rt', '即時 Rt'],
    ['economics', '成本效益'], ['comparison', '跨風險比較'], ['about', '方法與文獻']
  ];
  const current = document.body.dataset.page;

  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
      <a class="skip" href="#main">跳到主要內容</a>
      <div class="topbar"><div class="inner">
        <a class="brand" href="index.html">旅行流行病學工具箱<small>Travel Epidemiology Toolkit</small></a>
        <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">選單</button>
      </div></div>
      <nav class="nav" id="site-nav" aria-label="主選單"><ul>
        ${PAGES.map(([id, label]) => `<li><a href="${id}.html"${id === current ? ' class="active" aria-current="page"' : ''}>${label}</a></li>`).join('')}
      </ul></nav>`;
    const btn = header.querySelector('.menu-toggle'), nav = header.querySelector('.nav');
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `
      <footer class="site"><div class="inner">
        <div class="footer-grid">
          <div><strong>旅行流行病學工具箱</strong><p>開源的旅行健康事件建模工具。所有計算都在你的瀏覽器中執行，不會上傳或儲存任何輸入資料。</p></div>
          <div><strong>使用限制</strong><p>本工具僅供教育與研究用途。結果取決於輸入參數，不能取代醫師的個別評估或衛生主管機關的正式建議。</p></div>
          <div><strong>連結</strong><p><a href="about.html">方法與文獻</a><br><a href="tests.html">模型驗證測試</a></p></div>
        </div>
        <p class="fine">程式碼以 MIT 授權釋出。版面配色參考紐約大學網站風格，本站與紐約大學無任何關聯。</p>
      </div></footer>`;
  }

  const PALETTE = ['#57068c', '#e07b00', '#8900e1', '#2a7f62', '#b17ad6', '#330662', '#8a8a8a'];

  window.UI = {
    PALETTE,
    num(id, { min = -Infinity, max = Infinity, int = false } = {}) {
      const el = document.getElementById(id);
      const label = (document.querySelector(`label[for="${id}"]`)?.textContent || el.getAttribute('aria-label') || id).trim();
      const raw = el.value.trim(), v = Number(raw);
      if (raw === '' || !Number.isFinite(v)) throw new Error(`「${label}」需要填入數字`);
      if (v < min || v > max) throw new Error(`「${label}」應介於 ${min} 與 ${max} 之間`);
      if (int && !Number.isInteger(v)) throw new Error(`「${label}」需要是整數`);
      return v;
    },
    text: id => document.getElementById(id).value.trim(),
    checked: id => document.getElementById(id).checked,
    fmt(x, d = 2) {
      if (!Number.isFinite(x)) return x > 0 ? '∞' : (x < 0 ? '−∞' : '—');
      if (x !== 0 && Math.abs(x) < 10 ** -d) return x.toExponential(2);
      return x.toLocaleString('zh-TW', { maximumFractionDigits: d });
    },
    pct(x, d = 2) { return Number.isFinite(x) ? UI.fmt(x * 100, d) + '%' : '—'; },
    esc(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    kpis(id, items) {
      document.getElementById(id).innerHTML = items
        .map(([l, v]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
    },
    // 綁定按鈕並回傳處理函式；計算放在 setTimeout 中，讓按鈕先顯示「計算中」
    run(btnId, fn) {
      const btn = document.getElementById(btnId);
      const box = document.getElementById(btn.dataset.error || 'error');
      const handler = () => {
        if (box) { box.hidden = true; box.textContent = ''; }
        const label = btn.textContent;
        btn.disabled = true;
        btn.textContent = '計算中…';
        setTimeout(() => {
          try { fn(); }
          catch (e) {
            console.error(e);
            if (box) { box.textContent = e.message; box.hidden = false; } else alert(e.message);
          } finally { btn.disabled = false; btn.textContent = label; }
        }, 15);
      };
      btn.addEventListener('click', handler);
      return handler;
    },
    plot(id, data, layout = {}) {
      const axis = { gridcolor: '#e6e6e6', zerolinecolor: '#bbbbbb', linecolor: '#999999', ticks: 'outside', automargin: true };
      const L = Object.assign({
        font: { family: getComputedStyle(document.body).fontFamily, size: 13, color: '#1d1d1d' },
        colorway: PALETTE, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
        margin: { l: 64, r: 24, t: 48, b: 64 },
        legend: { orientation: 'h', x: 0, y: -0.22 }, hovermode: 'closest'
      }, layout);
      L.xaxis = Object.assign({}, axis, layout.xaxis);
      L.yaxis = Object.assign({}, axis, layout.yaxis);
      if (typeof layout.title === 'string') L.title = { text: layout.title, x: 0, xanchor: 'left', font: { size: 15 } };
      Plotly.react(id, data, L, { responsive: true, displaylogo: false });
    },
    downloadCSV(filename, rows) {
      const cell = v => {
        let s = String(v ?? '');
        if (/^[=+\-@]/.test(s) && !Number.isFinite(Number(s))) s = "'" + s; // 防止試算表公式注入
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = rows.map(r => r.map(cell).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    initTabs() {
      document.querySelectorAll('.tabs').forEach(tabs => {
        const buttons = tabs.querySelectorAll('button[data-tab]');
        buttons.forEach(b => b.addEventListener('click', () => {
          buttons.forEach(x => {
            const on = x === b;
            x.classList.toggle('active', on);
            x.setAttribute('aria-selected', String(on));
            document.getElementById(x.dataset.tab).classList.toggle('active', on);
          });
          window.dispatchEvent(new Event('resize')); // 讓隱藏分頁中的圖表重新排版
        }));
      });
    }
  };
})();
