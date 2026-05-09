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
  let LAYOUTS = null;     // { by_operator_type: {...}, fallback_by_type: {...} }

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
      return `<span class="status-tag retired" title="根据 OpenSky regUntil 字段判定该注册号已注销。">已注销${d}</span>`;
    }
    if (a.inactive) {
      return `<span class="status-tag inactive" title="不在 Mictronics tar1090 实时 ADS-B 数据库中，可能已退役 / 封存 / 转售。">久未活跃</span>`;
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
    const svg = renderCabinSvg(c.layout, c.total);
    return `
      <div class="cabin">
        ${src}
        <span class="layout">${escapeHtml(c.layout)}</span>
        ${total ? '&nbsp;·&nbsp;' + total : ''}
        ${notes}
        ${svg}
      </div>`;
  }

  /* Build a stylised cabin diagram from a layout string like "8C + 156Y" or
   * "10F + 42C + 30W + 262Y". Not a real seat map — it's a proportional bar
   * showing the share of each cabin class plus a count. Shape is a flat ribbon
   * which avoids the false precision of drawing fake seats. */
  const CABIN_CLASS = {
    F: { label: '头等', color: '#a83a3a' },
    C: { label: '公务', color: '#1957b8' },
    W: { label: '超经', color: '#7a5cb8' },
    Y: { label: '经济', color: '#1f8a55' },
  };
  function parseLayout(s) {
    if (!s) return null;
    // Tolerate things like "纯货机" that aren't really layouts.
    if (!/[FCWY]/.test(s)) return null;
    const m = s.match(/(\d+)\s*([FCWY])/g) || [];
    const parts = m.map((tok) => {
      const mm = tok.match(/(\d+)\s*([FCWY])/);
      return { n: parseInt(mm[1], 10), cls: mm[2] };
    });
    return parts.length ? parts : null;
  }
  function renderCabinSvg(layoutStr, totalSeats) {
    const parts = parseLayout(layoutStr);
    if (!parts) return '';
    // Use a flex div instead of SVG: easier to overflow-hide text on narrow segments.
    const segs = parts.map((p) =>
      `<div class="cb-seg" style="flex:${p.n};background:${CABIN_CLASS[p.cls].color}" title="${CABIN_CLASS[p.cls].label} ${p.n} 座"><span>${p.n}${p.cls}</span></div>`
    ).join('');
    const legend = parts.map((p) =>
      `<span class="cs"><span class="sw" style="background:${CABIN_CLASS[p.cls].color}"></span>${CABIN_CLASS[p.cls].label} ${p.n}</span>`
    ).join('');
    return `
      <div class="cabin-bar" role="img" aria-label="客舱比例：${escapeHtml(layoutStr)}">${segs}</div>
      <div class="cabin-legend">${legend}</div>`;
  }

  /* Build the row of external deep links. We only add links we can construct
   * safely from the data we already have — registration, ICAO24, IATA op code. */
  function renderLinks(a) {
    const reg = a.reg;
    const regLower = reg.toLowerCase().replace(/\s/g, '');
    const icao24 = (a.icao24 || '').toLowerCase();
    const iata = (a.operator_iata || '').toLowerCase();
    const items = [];
    items.push({ href: `https://www.flightradar24.com/data/aircraft/${encodeURIComponent(regLower)}`,
                 label: '实时位置 ↗', cls: 'fr24', title: 'Flightradar24 — 当前飞行轨迹和历史' });
    if (icao24) {
      items.push({ href: `https://globe.adsbexchange.com/?icao=${encodeURIComponent(icao24)}`,
                   label: 'ADS-B Exchange ↗', cls: 'adsbx', title: '无过滤的实时 ADS-B 追踪' });
    }
    if (iata) {
      items.push({ href: `https://www.aerolopa.com/${encodeURIComponent(iata)}`,
                   label: '真实座位图 ↗', cls: 'aerolopa', title: 'AeroLOPA — 该航司全机型座位图' });
    }
    items.push({ href: `https://www.jetphotos.com/registration/${encodeURIComponent(reg)}`,
                 label: 'JetPhotos ↗', cls: 'jetphotos', title: 'JetPhotos — 这架飞机的照片' });
    items.push({ href: `https://www.planespotters.net/search?q=${encodeURIComponent(reg)}`,
                 label: 'Planespotters ↗', cls: 'planespotters', title: 'Planespotters — 历史与照片' });
    return `<div class="links">${items.map(it =>
      `<a href="${it.href}" target="_blank" rel="noopener" class="link-pill ${it.cls}" title="${escapeHtml(it.title)}">${it.label}</a>`
    ).join('')}</div>`;
  }

  /* Photo lazy loader — talks to Planespotters' free photo API.
   * Uses an in-memory cache keyed by registration. Failures are silent.
   * Bonus: when our base data lacks an operator, we try to recover one from
   * the photo's URL slug (e.g. "/photo/.../b-1245-capital-airlines-airbus-...")
   * and look it up in OPS_INDEX (a slug → operator record map built from DATA). */
  const PHOTO_CACHE = new Map();
  let OPS_INDEX = null;     // { 'capital-airlines': { name_zh, short_zh, ... }, ... }

  function buildOpsIndex() {
    if (OPS_INDEX) return OPS_INDEX;
    OPS_INDEX = {};
    for (const a of DATA) {
      if (!a.operator_en || a.operator_en === '—') continue;
      const slug = a.operator_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!slug) continue;
      // First write wins (later duplicates from oddly-named records won't override).
      if (!OPS_INDEX[slug]) {
        OPS_INDEX[slug] = {
          name_zh:  a.operator_zh,
          short_zh: a.operator_short_zh || '',
          name_en:  a.operator_en,
          icao:     a.operator_icao || '',
          iata:     a.operator_iata || '',
          alliance: a.alliance || '',
          region:   a.region || '',
        };
      }
    }
    // A few common slug aliases that don't appear in DATA literally.
    const ALIASES = {
      'all-nippon-airways': 'all-nippon-airways',
      'china-eastern':      'china-eastern-airlines',
      'china-southern':     'china-southern-airlines',
      'air-china-cargo':    'air-china-cargo',
    };
    for (const [from, to] of Object.entries(ALIASES)) {
      if (OPS_INDEX[to] && !OPS_INDEX[from]) OPS_INDEX[from] = OPS_INDEX[to];
    }
    return OPS_INDEX;
  }

  // Try to extract "<reg>-<airline-slug>-<model-tokens>" from a Planespotters
  // photo URL and return the operator slug (lowercase, dashed). Best-effort.
  function operatorSlugFromPhotoLink(reg, link) {
    if (!link) return '';
    const m = link.match(/\/photo\/\d+\/([a-z0-9-]+)/i);
    if (!m) return '';
    let slug = m[1].toLowerCase();
    // Strip the registration prefix, e.g. "b-1245-capital-airlines-..." → "capital-airlines-..."
    const regSlug = reg.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (slug.startsWith(regSlug + '-')) slug = slug.slice(regSlug.length + 1);
    // Strip the trailing aircraft-type tokens. Look up the longest known prefix in OPS_INDEX.
    const idx = buildOpsIndex();
    const tokens = slug.split('-');
    for (let n = Math.min(6, tokens.length); n >= 1; n--) {
      const cand = tokens.slice(0, n).join('-');
      if (idx[cand]) return cand;
    }
    return '';
  }

  function attachPhoto(card, reg) {
    const slot = card.querySelector('.photo-slot');
    if (!slot || !reg) return;
    if (PHOTO_CACHE.has(reg)) {
      const v = PHOTO_CACHE.get(reg);
      if (v) { injectPhoto(slot, v); maybeFillOperator(card, reg, v); }
      else slot.remove();
      return;
    }
    fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const p = j && j.photos && j.photos[0];
        if (!p) { PHOTO_CACHE.set(reg, null); slot.remove(); return; }
        const v = {
          src: (p.thumbnail_large && p.thumbnail_large.src) || (p.thumbnail && p.thumbnail.src),
          link: p.link,
          photographer: p.photographer || '',
        };
        PHOTO_CACHE.set(reg, v);
        injectPhoto(slot, v);
        maybeFillOperator(card, reg, v);
      })
      .catch(() => { PHOTO_CACHE.set(reg, null); slot.remove(); });
  }
  function injectPhoto(slot, v) {
    if (!v || !v.src) { slot.remove(); return; }
    slot.innerHTML = `
      <a href="${v.link}" target="_blank" rel="noopener" title="${escapeHtml(v.photographer ? '摄影：' + v.photographer : '查看大图')} ↗">
        <img src="${v.src}" alt="" loading="lazy" />
      </a>
      <div class="photo-credit">© ${escapeHtml(v.photographer || 'planespotters.net')}</div>`;
  }

  // If the card is showing "未匹配到航司", try to look the airline up by parsing
  // the Planespotters slug. Update DOM in place. We deliberately do NOT show
  // a cabin layout in this case — we don't know the actual cabin config.
  function maybeFillOperator(card, reg, photo) {
    const opVal = card.querySelector('.row-op .val');
    if (!opVal) return;
    if (!opVal.querySelector('.unmatched')) return;     // already has an operator
    const slug = operatorSlugFromPhotoLink(reg, photo && photo.link);
    if (!slug) return;
    const idx = buildOpsIndex();
    const op = idx[slug];
    if (!op) return;
    opVal.innerHTML = `<a class="op-link" href="#" data-op-search="${escapeHtml(op.name_zh)}">${escapeHtml(op.name_zh)}</a>` +
      (op.short_zh ? ` <span class="small">(${escapeHtml(op.short_zh)})</span>` : '') +
      (op.icao ? ` <span class="small">${escapeHtml(op.icao)}${op.iata ? '/' + escapeHtml(op.iata) : ''}</span>` : '') +
      ` <span class="op-source" title="航司名根据 Planespotters 照片信息推断">来自照片</span>`;
    // Add the alliance badge if we now know the alliance.
    if (op.alliance) {
      const row1 = card.querySelector('.row1');
      if (row1 && !row1.querySelector('.alliance-tag')) {
        row1.insertAdjacentHTML('beforeend', allianceTag(op.alliance));
      }
    }
    // Inject an AeroLOPA link if we now have the IATA code and one isn't already there.
    if (op.iata) {
      const links = card.querySelector('.links');
      if (links && !links.querySelector('.link-pill.aerolopa')) {
        const before = links.querySelector('.link-pill.jetphotos');
        const html = `<a href="https://www.aerolopa.com/${encodeURIComponent(op.iata.toLowerCase())}" target="_blank" rel="noopener" class="link-pill aerolopa" title="AeroLOPA — 该航司全机型座位图">真实座位图 ↗</a>`;
        if (before) before.insertAdjacentHTML('beforebegin', html);
        else links.insertAdjacentHTML('beforeend', html);
      }
    }
    // Try to backfill the cabin layout: query LAYOUTS table by (op_icao, type).
    const reg0 = card.dataset.reg;
    const me = DATA.find((x) => x.reg === reg0);
    if (LAYOUTS && me && op.icao && me.type) {
      const key = `${op.icao}:${me.type}`;
      const cab = (LAYOUTS.by_operator_type && LAYOUTS.by_operator_type[key])
                  || (LAYOUTS.fallback_by_type && LAYOUTS.fallback_by_type[me.type]);
      if (cab && cab.layout) {
        const c = Object.assign({}, cab, {
          source: (LAYOUTS.by_operator_type && LAYOUTS.by_operator_type[key]) ? 'curated' : 'fallback',
        });
        const cabinHtml = renderCabin(c);
        if (cabinHtml) {
          card.querySelector('.row-op').insertAdjacentHTML('afterend', cabinHtml);
        }
      }
    }
  }

  function renderCard(a) {
    const hasOp = a.operator_zh && a.operator_zh !== '—';
    const opLink = hasOp
      ? `<a class="op-link" href="#" data-op-search="${escapeHtml(a.operator_zh)}">${escapeHtml(a.operator_zh)}</a>${a.operator_short_zh ? ` <span class="small">(${escapeHtml(a.operator_short_zh)})</span>` : ''}${a.operator_icao ? ` <span class="small">${escapeHtml(a.operator_icao)}${a.operator_iata ? '/' + escapeHtml(a.operator_iata) : ''}</span>` : ''}`
      : '<span class="small unmatched">未匹配到航司</span>';
    const typeLine = a.type_zh
      ? `${escapeHtml(a.type_zh)} <span class="small">${escapeHtml(a.type || '')}</span>${a.model && a.model !== a.type_zh ? ` <span class="small">· ${escapeHtml(a.model)}</span>` : ''}`
      : (a.model ? escapeHtml(a.model) : '<span class="small">未知机型</span>');
    const built = a.built ? `<div class="line"><span class="label">出厂</span><span class="val">${escapeHtml(shortYear(a.built))} 年</span></div>` : '';
    const inSvc = a.in_service_at ? `<div class="line"><span class="label">服役</span><span class="val">${escapeHtml(a.in_service_at)} 起</span></div>` : '';
    const retired = a.retired_at ? `<div class="line"><span class="label">退役</span><span class="val" style="color:var(--fg-mute)">${escapeHtml(a.retired_at)}已注销${a.next_reg ? ` · 后续号 <code>${escapeHtml(a.next_reg)}</code>` : ''}</span></div>` : '';
    const serial = a.serial ? `<div class="line"><span class="label">序列号</span><span class="val">${escapeHtml(a.serial)}</span></div>` : '';
    const icao24 = a.icao24 ? `<div class="line"><span class="label">ICAO24</span><span class="val" style="font-family:var(--mono)">${escapeHtml(a.icao24.toUpperCase())}</span></div>` : '';
    const showPhoto = !a.retired;     // skip photo fetch for known-deregistered
    // Only render cabin info when we actually know the operator. The fallback
    // "typical for type X" layout misleads the reader when we don't even know
    // the airline (e.g. the Capital Airlines A20N row that has empty operator
    // in OpenSky). The operator may be filled in later by the photo callback —
    // we'll re-attach the cabin then if needed.
    const cabinHtml = hasOp ? renderCabin(a.cabin) : '';

    return `
      <article class="result-card${a.retired ? ' is-retired' : (a.inactive ? ' is-inactive' : '')}" data-reg="${escapeHtml(a.reg)}">
        <div class="row1">
          <span class="reg">${escapeHtml(a.reg)}</span>
          ${regionTag(a.region)}
          ${allianceTag(a.alliance)}
          ${statusTag(a)}
        </div>
        ${showPhoto ? '<div class="photo-slot"></div>' : ''}
        <div class="line"><span class="label">机型</span><span class="val b">${typeLine}</span></div>
        <div class="line row-op"><span class="label">航司</span><span class="val b">${opLink}</span></div>
        ${cabinHtml}
        ${built}${inSvc}${retired}${serial}${icao24}
        ${renderLinks(a)}
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
    // After paint, lazy-load photos for the cards that are (or will be) visible.
    requestAnimationFrame(() => attachVisiblePhotos());
  }

  /* IntersectionObserver-based lazy photo loader. We don't fire all 80 photo
   * requests up-front — that would hammer the API and the user's bandwidth. */
  let photoObserver = null;
  function ensurePhotoObserver() {
    if (photoObserver || !('IntersectionObserver' in window)) return;
    photoObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const card = e.target;
        photoObserver.unobserve(card);
        attachPhoto(card, card.dataset.reg);
      }
    }, { rootMargin: '200px 0px' });
  }
  function attachVisiblePhotos() {
    ensurePhotoObserver();
    const cards = resultBox.querySelectorAll('.result-card .photo-slot');
    if (!photoObserver) {
      // No IO — just load everything (fallback for old browsers).
      cards.forEach((slot) => attachPhoto(slot.closest('.result-card'), slot.closest('.result-card').dataset.reg));
      return;
    }
    cards.forEach((slot) => photoObserver.observe(slot.closest('.result-card')));
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
      if (stStatus === 'active' && (a.retired || a.inactive)) continue;
      if (stStatus === 'inactive' && !a.inactive) continue;
      if (stStatus === 'retired' && !a.retired) continue;
      if (cat && a.category !== cat) continue;
      const s = qTokens.length ? matchScore(a, qTokens, qReg) : 1;
      if (!qTokens.length || s > 0) {
        filtered.push([s, a]);
      }
    }
    // Sort: active > inactive > retired (by score, then reg).
    filtered.sort((x, y) => {
      const ord = (a) => a.retired ? 2 : (a.inactive ? 1 : 0);
      const ox = ord(x[1]), oy = ord(y[1]);
      if (ox !== oy) return ox - oy;
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
      // Optional: cabin layout lookup table for photo-based backfill.
      try {
        const lr = await fetch('data/cabin_layouts.json?v=' + stamp);
        if (lr.ok) LAYOUTS = await lr.json();
      } catch (_) { /* non-fatal */ }

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
      return;
    }
    const opLink = e.target.closest('.op-link[data-op-search]');
    if (opLink) {
      e.preventDefault();
      qInput.value = opLink.dataset.opSearch;
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
