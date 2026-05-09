/* CN Aircraft Finder — vanilla JS, no build step. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qInput     = $('q');
  const clearBtn   = $('clearBtn');
  const regionSel  = $('region');
  const allianceSel= $('alliance');
  const serviceSel = $('service');
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
    us: '美国', ca: '加拿大',
    eu: '欧陆', uk: '英国/爱尔兰',
    jp: '日本', kr: '韩国', sea: '东南亚', in: '南亚',
    me: '中东', oceania: '大洋洲', ru: '俄罗斯',
    latam: '拉美', africa: '非洲',
    biz: '公务机', gov: '政府/校飞', other: '其他',
  };

  const ALLIANCE_LABEL = {
    star:     '星空联盟',
    skyteam:  '天合联盟',
    oneworld: '寰宇一家',
  };
  // Aliases for free-text search ("Star Alliance", "天合", etc.)
  const ALLIANCE_ALIASES = {
    star:     ['星空联盟', '星空', 'star alliance', 'staralliance'],
    skyteam:  ['天合联盟', '天合', 'skyteam', 'sky team'],
    oneworld: ['寰宇一家', '寰宇', 'oneworld', 'one world'],
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
      a.type, a.type_zh, a.type_en, a.model,
      a.operator_zh, a.operator_short_zh, a.operator_en,
      a.operator_icao, a.operator_iata,
      a.country,
    ].filter(Boolean).map((s) => s.toString().toLowerCase());
    if (a.alliance) {
      parts.push(a.alliance);
      const aliases = ALLIANCE_ALIASES[a.alliance];
      if (aliases) for (const x of aliases) parts.push(x.toLowerCase());
    }
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
    const known = ['mainland','hk','tw','macau','us','ca','eu','uk','jp','kr','sea','in','me','oceania','ru','latam','africa','biz','gov'];
    const cls = known.includes(region) ? region : 'other';
    return `<span class="region-tag ${cls}">${REGION_LABEL[region] || region || '—'}</span>`;
  }

  function allianceTag(al) {
    if (!al || !ALLIANCE_LABEL[al]) return '';
    return `<span class="alliance-tag ${al}" title="${ALLIANCE_LABEL[al]}">${ALLIANCE_LABEL[al]}</span>`;
  }

  function statusTag(a) {
    if (a.retired) {
      const d = a.retired_at ? ` · ${escapeHtml(a.retired_at)}` : '';
      return `<span class="status-tag retired" title="根据 OpenSky regUntil 字段判定该注册号已注销，使用中的可能性低。">已退役${d}</span>`;
    }
    return '';
  }

  function shortYear(s) {
    if (!s) return '';
    return s.length >= 4 ? s.slice(0, 4) : s;
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
    const built = a.built ? `<div class="line"><span class="label">出厂</span><span class="val">${escapeHtml(shortYear(a.built))} 年</span></div>` : '';
    const inSvc = a.in_service_at ? `<div class="line"><span class="label">服役</span><span class="val">${escapeHtml(a.in_service_at)} 起</span></div>` : '';
    const retired = a.retired_at ? `<div class="line"><span class="label">退役</span><span class="val" style="color:var(--fg-mute)">${escapeHtml(a.retired_at)}已注销${a.next_reg ? ` · 后续号 <code>${escapeHtml(a.next_reg)}</code>` : ''}</span></div>` : '';
    const serial = a.serial ? `<div class="line"><span class="label">序列号</span><span class="val">${escapeHtml(a.serial)}</span></div>` : '';
    const icao24 = a.icao24 ? `<div class="line"><span class="label">ICAO24</span><span class="val" style="font-family:var(--mono)">${escapeHtml(a.icao24.toUpperCase())}</span></div>` : '';

    return `
      <article class="result-card${a.retired ? ' is-retired' : ''}" data-reg="${escapeHtml(a.reg)}">
        <div class="row1">
          <span class="reg">${escapeHtml(a.reg)}</span>
          ${regionTag(a.region)}
          ${allianceTag(a.alliance)}
          ${statusTag(a)}
        </div>
        <div class="line"><span class="label">机型</span><span class="val b">${typeLine}</span></div>
        <div class="line"><span class="label">航司</span><span class="val b">${opLine}</span></div>
        ${renderCabin(a.cabin)}
        ${built}${inSvc}${retired}${serial}${icao24}
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
    const alliance = allianceSel.value;
    const stStatus = serviceSel.value;
    const cat = categorySel.value;

    clearBtn.hidden = !raw.trim();

    // No query and no filters → show suggestions instead of a giant list.
    if (!qTokens.length && !region && !alliance && !stStatus && !cat) {
      resultBox.innerHTML = '';
      suggestList.hidden = false;
      statusEl.textContent = `已加载 ${DATA.length.toLocaleString()} 架飞机。试着搜搜你常见的注册号。`;
      return;
    }
    suggestList.hidden = true;

    const filtered = [];
    for (const a of DATA) {
      if (region && a.region !== region) continue;
      if (alliance) {
        if (alliance === 'none') {
          if (a.alliance) continue;
        } else if (a.alliance !== alliance) continue;
      }
      if (stStatus === 'active' && a.retired) continue;
      if (stStatus === 'retired' && !a.retired) continue;
      if (cat && a.category !== cat) continue;
      const s = qTokens.length ? matchScore(a, qTokens, qReg) : 1;
      if (!qTokens.length || s > 0) {
        filtered.push([s, a]);
      }
    }
    // Sort: prefer active over retired (when scores tie), then by score, then by reg.
    filtered.sort((x, y) => {
      const ar = x[1].retired ? 1 : 0, br = y[1].retired ? 1 : 0;
      if (ar !== br) return ar - br;
      return y[0] - x[0] || x[1].reg.localeCompare(y[1].reg);
    });
    const list = filtered.map(p => p[1]);

    statusEl.textContent = qTokens.length || region || alliance || stStatus || cat
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
      // Load meta first (small, gives us a version stamp), then fetch data
      // with that stamp as a cache buster so refreshes pick up new data.
      const metaRes = await fetch('data/meta.json', { cache: 'no-cache' });
      META = metaRes.ok ? await metaRes.json() : {};
      const stamp = encodeURIComponent(META.generated_at || Date.now());
      const acRes = await fetch('data/aircraft.json?v=' + stamp);
      if (!acRes.ok) throw new Error('aircraft.json HTTP ' + acRes.status);
      DATA = await acRes.json();

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
  allianceSel.addEventListener('change', doSearch);
  serviceSel.addEventListener('change', doSearch);
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
