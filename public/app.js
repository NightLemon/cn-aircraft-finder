/* CN Aircraft Finder — vanilla JS, no build step. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qInput     = $('q');
  const clearBtn   = $('clearBtn');
  const regionSel  = $('region');
  const categorySel= $('category');
  const statusEl   = $('status');
  const resultBox  = $('resultBox');
  const suggestList= $('suggestList');
  const topOps     = $('topOperators');
  const topTypes   = $('topTypes');
  const aboutBtn   = $('aboutBtn');
  const aboutDlg   = $('aboutDialog');
  const metaLine   = $('metaLine');

  let DATA = [];
  let META = {};

  /* ---------------- helpers ---------------- */
  const REGION_LABEL = {
    mainland: '中国大陆', hk: '香港', macau: '澳门', tw: '台湾',
    biz: '公务机', gov: '政府/校飞', other: '其他',
  };

  // Normalize a registration: strip dashes, uppercase. "B2445"/"b-2445" → "B2445".
  const normReg = (s) => (s || '').toString().toUpperCase().replace(/[\s-]/g, '');

  // Normalize a free-form query: trim + lower; we'll match against multiple
  // (already-lowered) fields below. Keep dashes for partial reg matches like "B-2".
  const normQ = (s) => (s || '').toString().trim().toLowerCase();

  // Build a per-record search blob once (lowercased) for fast indexOf.
  function buildBlob(a) {
    const parts = [
      a.reg, normReg(a.reg),
      a.type, a.type_zh, a.type_en, a.model, a.manufacturer,
      a.operator_zh, a.operator_short_zh, a.operator_en,
      a.operator_icao, a.operator_iata,
      a.owner_raw, a.operator_raw,
    ].filter(Boolean).map((s) => s.toString().toLowerCase());
    return parts.join('|');
  }

  function matchScore(a, qTokens, qReg) {
    if (!qTokens.length) return 0;
    // Whole-query short-circuit on registration: "B-2445" or "B2445" must hit the
    // canonical reg form first, regardless of how many tokens the user typed.
    const fullReg = qTokens.join('').toUpperCase().replace(/-/g, '');
    if (fullReg.length >= 2 && fullReg[0] === 'B') {
      if (a._reg === fullReg) return 1000;
      if (a._reg.startsWith(fullReg)) return 800 - (a._reg.length - fullReg.length);
    }
    // Every token must appear somewhere in the blob (AND match).
    let score = 0;
    for (const t of qTokens) {
      if (!t) continue;
      if (a._blob.includes(t)) {
        score += 100;
        if (a._regLower.includes(t)) score += 30;
      } else {
        return 0;
      }
    }
    return score;
  }

  /* ---------------- rendering ---------------- */
  function regionTag(region) {
    const cls = ['hk','tw','macau','biz','gov'].includes(region) ? region : 'mainland';
    return `<span class="region-tag ${cls}">${REGION_LABEL[region] || '中国'}</span>`;
  }

  function escapeHtml(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderCabin(c) {
    if (!c || !c.layout) return '';
    const total = c.total ? `<span class="total">共 ${c.total} 座</span>` : '';
    const src   = c.source === 'curated'
      ? `<span class="src" title="按航司+机型整理的典型布局">航司典型</span>`
      : `<span class="src fallback" title="该航司无具体数据，使用机型通用布局">通用布局</span>`;
    const notes = c.notes ? `<div class="notes">${escapeHtml(c.notes)}</div>` : '';
    return `
      <div class="cabin">
        ${src}
        <span class="layout">${escapeHtml(c.layout)}</span>
        ${total ? '&nbsp;·&nbsp;' + total : ''}
        ${notes}
      </div>`;
  }

  function renderCard(a) {
    const opLine = a.operator_zh && a.operator_zh !== '—'
      ? `${escapeHtml(a.operator_zh)}${a.operator_short_zh ? ` <span class="small">(${escapeHtml(a.operator_short_zh)})</span>` : ''}${a.operator_icao ? ` <span class="small">${escapeHtml(a.operator_icao)}${a.operator_iata ? '/' + escapeHtml(a.operator_iata) : ''}</span>` : ''}`
      : '<span class="small">未匹配到航司</span>';
    const typeLine = a.type_zh
      ? `${escapeHtml(a.type_zh)} <span class="small">${escapeHtml(a.type || '')}</span>${a.model && a.model !== a.type_zh ? ` <span class="small">· ${escapeHtml(a.model)}</span>` : ''}`
      : (a.model ? escapeHtml(a.model) : '<span class="small">未知机型</span>');
    const built = a.built ? `<div class="line"><span class="label">出厂</span><span class="val">${escapeHtml(a.built)}</span></div>` : '';
    const serial = a.serial ? `<div class="line"><span class="label">序列号</span><span class="val">${escapeHtml(a.serial)}</span></div>` : '';
    const icao24 = a.icao24 ? `<div class="line"><span class="label">ICAO24</span><span class="val" style="font-family:var(--mono)">${escapeHtml(a.icao24.toUpperCase())}</span></div>` : '';

    return `
      <article class="result-card" data-reg="${escapeHtml(a.reg)}">
        <div class="row1">
          <span class="reg">${escapeHtml(a.reg)}</span>
          ${regionTag(a.region)}
        </div>
        <div class="line"><span class="label">机型</span><span class="val b">${typeLine}</span></div>
        <div class="line"><span class="label">航司</span><span class="val b">${opLine}</span></div>
        ${renderCabin(a.cabin)}
        ${built}${serial}${icao24}
      </article>`;
  }

  function renderResults(list, q) {
    if (!list.length) {
      resultBox.innerHTML = `<div class="hint">无匹配结果。试试只输入注册号尾几位，或换个关键词。</div>`;
      return;
    }
    const head = q
      ? `<div class="hint">共 ${list.length} 条，显示前 ${Math.min(80, list.length)} 条</div>`
      : '';
    const cards = list.slice(0, 80).map(renderCard).join('');
    resultBox.innerHTML = head + cards;
  }

  /* ---------------- main search ---------------- */
  let searchTimer = null;
  function doSearch() {
    const raw = qInput.value || '';
    const qTokens = normQ(raw).split(/\s+/).filter(Boolean);
    const qReg = normReg(raw);
    const region = regionSel.value;
    const cat = categorySel.value;

    clearBtn.hidden = !raw.trim();

    // No query and no filters → show suggestions instead of a giant list.
    if (!qTokens.length && !region && !cat) {
      resultBox.innerHTML = '';
      suggestList.hidden = false;
      statusEl.textContent = `已加载 ${DATA.length.toLocaleString()} 架飞机。试着搜搜你常见的注册号。`;
      return;
    }
    suggestList.hidden = true;

    const filtered = [];
    for (const a of DATA) {
      if (region && a.region !== region) continue;
      if (cat && a.category !== cat) continue;
      const s = qTokens.length ? matchScore(a, qTokens, qReg) : 1;
      if (!qTokens.length || s > 0) {
        filtered.push([s, a]);
      }
    }
    filtered.sort((x, y) => y[0] - x[0] || x[1].reg.localeCompare(y[1].reg));
    const list = filtered.map(p => p[1]);

    statusEl.textContent = qTokens.length || region || cat
      ? `匹配 ${list.length} 条`
      : `已加载 ${DATA.length.toLocaleString()} 架飞机`;
    renderResults(list, qTokens.join(' '));
  }

  function debouncedSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 80);
  }

  /* ---------------- suggestions ---------------- */
  function renderSuggestions() {
    const ops = Object.entries(META.by_operator || {})
      .filter(([k]) => k && k !== '—')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
    topOps.innerHTML = ops.map(([k, n]) =>
      `<button class="chip" data-q="${escapeHtml(k)}">${escapeHtml(k)}<span class="count">${n}</span></button>`
    ).join('');

    const types = Object.entries(META.by_type || {})
      .filter(([k]) => k)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14);
    topTypes.innerHTML = types.map(([k, n]) =>
      `<button class="chip" data-q="${escapeHtml(k)}">${escapeHtml(k)}<span class="count">${n}</span></button>`
    ).join('');
  }

  function renderMetaLine() {
    const t = META.total_aircraft;
    const src = META.source_csv || '';
    const gen = META.generated_at || '';
    metaLine.textContent = `共 ${t} 条记录 · 数据快照: ${src.replace('metadata/aircraft-database-complete-','').replace('.csv','')} · 构建: ${gen}`;
  }

  /* ---------------- bootstrap ---------------- */
  async function load() {
    try {
      statusEl.textContent = '加载数据中…';
      const [acRes, metaRes] = await Promise.all([
        fetch('data/aircraft.json', { cache: 'force-cache' }),
        fetch('data/meta.json',     { cache: 'force-cache' }),
      ]);
      if (!acRes.ok) throw new Error('aircraft.json HTTP ' + acRes.status);
      DATA = await acRes.json();
      META = metaRes.ok ? await metaRes.json() : {};

      // Build pre-computed index fields
      for (const a of DATA) {
        a._reg = normReg(a.reg);
        a._regLower = (a.reg || '').toLowerCase();
        a._blob = buildBlob(a);
      }
      renderSuggestions();
      renderMetaLine();
      doSearch();
    } catch (err) {
      console.error(err);
      statusEl.textContent = '数据加载失败：' + err.message;
      statusEl.classList.add('error');
    }
  }

  /* ---------------- events ---------------- */
  qInput.addEventListener('input', debouncedSearch);
  regionSel.addEventListener('change', doSearch);
  categorySel.addEventListener('change', doSearch);
  clearBtn.addEventListener('click', () => {
    qInput.value = ''; clearBtn.hidden = true; doSearch(); qInput.focus();
  });
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      qInput.value = chip.dataset.q;
      doSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  aboutBtn.addEventListener('click', () => {
    if (typeof aboutDlg.showModal === 'function') aboutDlg.showModal();
    else aboutDlg.setAttribute('open', '');
  });

  // Allow ?reg=B-2445 deep links
  const params = new URLSearchParams(location.search);
  const initial = params.get('q') || params.get('reg');
  if (initial) qInput.value = initial;

  load();
})();
