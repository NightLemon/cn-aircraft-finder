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
      a.operator_py, a.operator_py_init,
      a.operator_icao, a.operator_iata,
      a.country,
    ].filter(Boolean).map((s) => s.toString().toLowerCase());
    if (a.alliance) {
      const aliases = ALLIANCE_ALIASES[a.alliance];
      if (aliases) for (const x of aliases) parts.push(x.toLowerCase());
    }
    return parts.join('|');
  }

  function matchScore(a, qTokens, qReg) {
    if (!qTokens.length) return 0;
    // Whole-query short-circuit on registration: "B-2445" or "B2445" must hit the
    // canonical reg form first, regardless of how many tokens the user typed.
    const fullReg = normReg(qTokens.join(''));
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

  function renderCabin(c, opIcao, typecode) {
    if (!c || !c.layout) return '';
    const total = c.total ? `<span class="total">共 ${c.total} 座</span>` : '';
    const src   = c.source === 'curated'
      ? `<span class="src" title="按航司+机型整理的典型布局">航司典型</span>`
      : `<span class="src fallback" title="该航司无具体数据，使用机型通用布局">通用布局</span>`;
    const notes = c.notes ? `<div class="notes">${escapeHtml(c.notes)}</div>` : '';
    const svg = renderCabinSvg(c.layout, c.total);
    // "Report correction" link — opens a GitHub Issue with prefilled context.
    let report = '';
    if (opIcao && typecode) {
      const title = `客舱布局修正：${opIcao} ${typecode}`;
      const baseUrl = location.origin + location.pathname;
      const body = `**当前显示**：${c.layout}（${c.source === 'curated' ? '航司典型' : '通用布局'}）\n` +
                   `**正确配置**：（请填写，例如 8C + 156Y）\n` +
                   `**来源**：（航司官网链接 / 座位图 / 其他）\n\n` +
                   `<sub>键: \`${opIcao}:${typecode}\` · 自动生成于 ${baseUrl}</sub>`;
      const url = `https://github.com/nightlemon/cn-aircraft-finder/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=cabin-correction`;
      report = `<a class="cabin-fix" href="${url}" target="_blank" rel="noopener" title="发现错误？提交修正到 GitHub">报错 ✏️</a>`;
    }
    return `
      <div class="cabin">
        ${src}${report}
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
      // AeroLOPA's per-airline page lists all types. We can't deep-link to a
      // single layout reliably (their URL scheme varies), so we stick with the
      // airline-level URL but at least add a #typecode hash hint.
      const lopaHref = a.type
        ? `https://www.aerolopa.com/${encodeURIComponent(iata)}#${encodeURIComponent(a.type)}`
        : `https://www.aerolopa.com/${encodeURIComponent(iata)}`;
      items.push({ href: lopaHref,
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

  // Tiny concurrency limiter for the Planespotters photo API. Without this, fast
  // scrolling can fire 10+ concurrent fetches and hammer the free endpoint.
  const PHOTO_MAX_INFLIGHT = 4;
  let photoInflight = 0;
  const photoQueue = [];
  function schedulePhoto(fn) {
    if (photoInflight < PHOTO_MAX_INFLIGHT) {
      photoInflight++;
      fn().finally(() => {
        photoInflight--;
        const next = photoQueue.shift();
        if (next) schedulePhoto(next);
      });
    } else {
      photoQueue.push(fn);
    }
  }

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
    schedulePhoto(() => fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        const p = j && j.photos && j.photos[0];
        if (!p) { PHOTO_CACHE.set(reg, null); if (slot.isConnected) slot.remove(); return; }
        const v = {
          src: (p.thumbnail_large && p.thumbnail_large.src) || (p.thumbnail && p.thumbnail.src),
          link: p.link,
          photographer: p.photographer || '',
        };
        PHOTO_CACHE.set(reg, v);
        injectPhoto(slot, v);
        maybeFillOperator(card, reg, v);
      })
      .catch(() => { PHOTO_CACHE.set(reg, null); if (slot.isConnected) slot.remove(); }));
  }
  function injectPhoto(slot, v) {
    if (!slot.isConnected) return;
    if (!v || !v.src) { slot.remove(); return; }
    // Clicking the image opens the in-page modal; the photographer credit
    // still links out to planespotters.net for the original source.
    slot.innerHTML = `
      <img src="${v.src}" alt="" loading="lazy" />
      <div class="photo-credit"><a href="${v.link}" target="_blank" rel="noopener" title="原图与摄影者">© ${escapeHtml(v.photographer || 'planespotters.net')} ↗</a></div>`;
  }

  let photoDlg = null;
  function openPhoto(v) {
    photoDlg = photoDlg || document.getElementById('photoDialog');
    if (!photoDlg) return;
    document.getElementById('photoBig').src = v.src;
    document.getElementById('photoMeta').innerHTML =
      `<a href="${v.link}" target="_blank" rel="noopener">© ${escapeHtml(v.photographer || 'planespotters.net')} ↗</a>`;
    if (typeof photoDlg.showModal === 'function') photoDlg.showModal();
    else photoDlg.setAttribute('open', '');
  }

  // If the card is showing "未匹配到航司", try to look the airline up by parsing
  // the Planespotters slug. Update DOM in place. We deliberately do NOT show
  // a cabin layout in this case — we don't know the actual cabin config.
  function maybeFillOperator(card, reg, photo) {
    if (!card.isConnected) return;
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
        const cabinHtml = renderCabin(c, op.icao, me.type);
        if (cabinHtml) {
          card.querySelector('.row-op').insertAdjacentHTML('afterend', cabinHtml);
        }
      }
    }
  }

  function ageYears(built) {
    if (!built) return null;
    const y = parseInt(built.slice(0, 4), 10);
    const mo = built.length >= 7 ? parseInt(built.slice(5, 7), 10) : 6;
    if (!y) return null;
    const now = new Date();
    const ageMo = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
    return Math.max(0, ageMo / 12);
  }
  function ageBadge(years) {
    if (years == null) return '';
    let cls = 'age-new';
    if (years >= 20) cls = 'age-old';
    else if (years >= 10) cls = 'age-mid';
    return `<span class="age-badge ${cls}" title="基于出厂年估算">机龄 ${years.toFixed(1)} 年</span>`;
  }

  /* Chinese B-registration block hint. Mainland China civil aviation assigns
   * registration blocks by aircraft type; the leading digit tells you roughly
   * what to expect. Source: CAAC public reference + common community knowledge.
   * (We deliberately keep this to a brief tooltip — full mapping at xmyzl.com.) */
  function bRegHint(reg) {
    const m = (reg || '').match(/^B-?(\d)(\d?)/);
    if (!m) return '';
    const d1 = m[1], d2 = m[2] || '';
    // B-0xxxx 直升机 / B-1xxx 新分窄体 / B-2xxx 老分窄体 / B-3xxx 支线/部分窄体
    // B-4xxx 公务机 / B-5xxx 窄体 / B-6xxx A320/A330 / B-7xxx 货机/公务机
    // B-8xxx 公务/支线 / B-9xxx 公务/支线 / B-KAxx 香港 / B-MAxx 澳门
    const blocks = {
      '0': '直升机',
      '1': '窄体客机（较新批次）',
      '2': '窄体客机（早期）',
      '3': '支线 / 部分窄体',
      '4': '公务机',
      '5': '窄体客机',
      '6': '宽体 A330/A350',
      '7': '货机 / 公务',
      '8': '公务机 / 支线',
      '9': '公务机 / 支线',
    };
    return blocks[d1] ? `${reg.slice(0,2)}${d1}${d2 || 'x'}xx：${blocks[d1]}` : '';
  }

  function sameTypeInFleetLink(a) {
    if (!a.operator_icao || !a.type) return '';
    let n = 0;
    for (const x of DATA) {
      if (x.operator_icao === a.operator_icao && x.type === a.type && x.reg !== a.reg) n++;
    }
    if (n <= 0) return '';
    const q = `${a.operator_icao} ${a.type}`;
    return `<div class="same-type-link"><a href="?q=${encodeURIComponent(q)}" data-q="${escapeHtml(q)}" class="op-link">查看该航司其他 ${n} 架 ${escapeHtml(a.type)} →</a></div>`;
  }

  function renderCard(a) {
    const hasOp = a.operator_zh && a.operator_zh !== '—';
    const bHint = bRegHint(a.reg);
    const bHintLine = bHint ? `<div class="line"><span class="label">号段</span><span class="val small" title="中国大陆民航局号段惯例 — 仅供参考">${escapeHtml(bHint)}</span></div>` : '';
    const logoSrc = hasOp ? logoUrl(a) : '';
    const logo = logoSrc ? `<img class="op-logo" src="${logoSrc}" alt="" loading="lazy" onerror="this.remove()" />` : '';
    const fleetBtn = hasOp && a.operator_icao
      ? ` <button class="mini-btn fleet-btn" data-op-icao="${escapeHtml(a.operator_icao)}" title="查看该航司机队仪表板">机队 ↗</button>`
      : '';
    const opLink = hasOp
      ? `${logo}<a class="op-link" href="#" data-op-search="${escapeHtml(a.operator_zh)}">${escapeHtml(a.operator_zh)}</a>${a.operator_short_zh ? ` <span class="small">(${escapeHtml(a.operator_short_zh)})</span>` : ''}${a.operator_icao ? ` <span class="small">${escapeHtml(a.operator_icao)}${a.operator_iata ? '/' + escapeHtml(a.operator_iata) : ''}</span>` : ''}${fleetBtn}`
      : '<span class="small unmatched">未匹配到航司</span>';
    const typeBtn = a.type ? ` <button class="mini-btn type-btn" data-type="${escapeHtml(a.type)}" title="查看该机型百科">百科 ↗</button>` : '';
    const typeLine = a.type_zh
      ? `${escapeHtml(a.type_zh)} <span class="small">${escapeHtml(a.type || '')}</span>${a.model && a.model !== a.type_zh ? ` <span class="small">· ${escapeHtml(a.model)}</span>` : ''}${typeBtn}`
      : (a.model ? escapeHtml(a.model) + typeBtn : '<span class="small">未知机型</span>');
    const age = ageYears(a.built);
    const builtLine = a.built ? `<div class="line"><span class="label">出厂</span><span class="val">${escapeHtml(shortYear(a.built))} 年 ${ageBadge(age)}</span></div>` : '';
    const inSvc = a.in_service_at ? `<div class="line"><span class="label">服役</span><span class="val">${escapeHtml(a.in_service_at)} 起</span></div>` : '';
    const nextRegHtml = a.next_reg
      ? ` · 后续号 <a href="?q=${encodeURIComponent(a.next_reg)}" class="next-reg" data-q="${escapeHtml(a.next_reg)}">${escapeHtml(a.next_reg)}</a>`
      : '';
    const retired = a.retired_at ? `<div class="line"><span class="label">退役</span><span class="val" style="color:var(--fg-mute)">${escapeHtml(a.retired_at)}已注销${nextRegHtml}</span></div>` : '';
    const serial = a.serial ? `<div class="line"><span class="label">序列号</span><span class="val">${escapeHtml(a.serial)}</span></div>` : '';
    const icao24 = a.icao24 ? `<div class="line"><span class="label">ICAO24</span><span class="val" style="font-family:var(--mono)">${escapeHtml(a.icao24.toUpperCase())}</span></div>` : '';
    const showPhoto = !a.retired;
    const cabinHtml = hasOp ? renderCabin(a.cabin, a.operator_icao, a.type) : '';

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
        ${builtLine}${inSvc}${retired}${serial}${icao24}${bHintLine}
        ${renderLinks(a)}
        ${sameTypeInFleetLink(a)}
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

  /* ---------------- column-store unpack ---------------- */
  // Rebuild a flat array of row dicts from the column-store format produced by
  // build_data.py. Cheaper to fetch but needs ~50ms of unpack on cold start.
  function unpackColumns(blob) {
    const n = blob.n;
    const dicts = blob.dicts || {};
    const cols = blob.columns || {};
    const bools = blob.bools || {};
    const cabinDict = blob.cabin_dict || [{}];
    const cabinCol = blob.cabin || [];
    const dictFields = Object.keys(dicts);
    const copyFields = Object.keys(cols).filter((f) => !dicts[f]);
    const boolFields = Object.keys(bools);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const row = {};
      for (const f of dictFields) {
        const idx = cols[f][i];
        const v = dicts[f][idx];
        if (v) row[f] = v;
      }
      for (const f of copyFields) {
        const v = cols[f][i];
        if (v) row[f] = v;
      }
      for (const f of boolFields) {
        if (bools[f][i]) row[f] = true;
      }
      const ci = cabinCol[i];
      if (ci) row.cabin = cabinDict[ci];
      out[i] = row;
    }
    return out;
  }

  /* ---------------- airline logo ---------------- */
  // Wikipedia hosts a fairly complete set of airline logos at predictable paths.
  // We can't link to commons directly (file names vary) but the airline-logo.com
  // open service maps IATA codes to PNGs. As a free fallback, we use the IATA
  // code with the openflights.org logo CDN, then no-logo if 404.
  function logoUrl(a) {
    const iata = (a.operator_iata || '').toUpperCase();
    const icao = (a.operator_icao || '').toUpperCase();
    if (iata && /^[A-Z0-9]{2,3}$/.test(iata)) {
      // Daisycon serves transparent PNG logos keyed on IATA. Free, CORS-friendly.
      return `https://daisycon.io/images/airline/?width=80&height=30&color=ffffff&iata=${encodeURIComponent(iata)}`;
    }
    if (icao && /^[A-Z]{3}$/.test(icao)) {
      return `https://daisycon.io/images/airline/?width=80&height=30&color=ffffff&icao=${encodeURIComponent(icao)}`;
    }
    return '';
  }

  /* ---------------- detail dialog ---------------- */
  let detailDlg = null;
  function openDetail(html) {
    detailDlg = detailDlg || document.getElementById('detailDialog');
    document.getElementById('detailBody').innerHTML = html;
    if (typeof detailDlg.showModal === 'function') detailDlg.showModal();
    else detailDlg.setAttribute('open', '');
  }

  /* Fleet dashboard for a given operator (by ICAO). */
  function fleetDashboard(opIcao) {
    const fleet = DATA.filter(a => a.operator_icao === opIcao);
    if (!fleet.length) return '<p>未找到该航司机队数据。</p>';
    const first = fleet[0];
    const name = first.operator_zh + (first.operator_short_zh ? ` (${first.operator_short_zh})` : '');
    const alliance = first.alliance ? allianceTag(first.alliance) : '';

    // By type
    const byType = new Map();
    for (const a of fleet) {
      const k = a.type || '未知';
      byType.set(k, (byType.get(k) || 0) + 1);
    }
    const types = [...byType.entries()].sort((a, b) => b[1] - a[1]);
    const maxN = types[0][1];
    const typeRows = types.map(([t, n]) => {
      const sample = fleet.find(a => a.type === t);
      const label = sample && sample.type_zh ? `${sample.type_zh} <span class="small">${t}</span>` : t;
      return `<div class="bar-row"><div class="bar-label"><a href="#" data-q="${escapeHtml(t)}" class="op-link">${label}</a></div><div class="bar-track"><div class="bar-fill" style="width:${(n/maxN*100).toFixed(1)}%"></div></div><div class="bar-count">${n}</div></div>`;
    }).join('');

    // Age histogram (0-5/5-10/10-15/15-20/20+)
    const buckets = [0, 0, 0, 0, 0];
    const now = new Date().getFullYear();
    let withAge = 0, ageSum = 0;
    for (const a of fleet) {
      if (!a.built) continue;
      const y = parseInt(a.built.slice(0, 4), 10);
      if (!y) continue;
      const age = now - y;
      withAge++;
      ageSum += age;
      if (age < 5) buckets[0]++;
      else if (age < 10) buckets[1]++;
      else if (age < 15) buckets[2]++;
      else if (age < 20) buckets[3]++;
      else buckets[4]++;
    }
    const avgAge = withAge ? (ageSum / withAge).toFixed(1) : '—';
    const bucketLabels = ['0-5 年', '5-10 年', '10-15 年', '15-20 年', '20+ 年'];
    const maxBucket = Math.max(...buckets, 1);
    const histRows = buckets.map((n, i) => `
      <div class="bar-row"><div class="bar-label small">${bucketLabels[i]}</div><div class="bar-track"><div class="bar-fill age" style="width:${(n/maxBucket*100).toFixed(1)}%"></div></div><div class="bar-count">${n}</div></div>
    `).join('');

    // Status breakdown
    const nActive = fleet.filter(a => !a.retired && !a.inactive).length;
    const nInactive = fleet.filter(a => a.inactive).length;
    const nRetired = fleet.filter(a => a.retired).length;

    return `
      <h2>${escapeHtml(name)} ${alliance}</h2>
      <p class="small">${escapeHtml(first.operator_en || '')} · ${first.operator_icao || ''}${first.operator_iata ? ' / ' + first.operator_iata : ''}</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-n">${fleet.length}</div><div class="stat-l">总机队</div></div>
        <div class="stat"><div class="stat-n">${nActive}</div><div class="stat-l">在役</div></div>
        <div class="stat"><div class="stat-n">${nInactive}</div><div class="stat-l">久未活跃</div></div>
        <div class="stat"><div class="stat-n">${nRetired}</div><div class="stat-l">已注销</div></div>
        <div class="stat"><div class="stat-n">${avgAge}</div><div class="stat-l">平均机龄</div></div>
      </div>
      <h3>机型分布</h3>
      <div class="bars">${typeRows}</div>
      <h3>机龄分布</h3>
      <div class="bars">${histRows}</div>
      <p><a href="?q=${encodeURIComponent(first.operator_zh)}" data-q="${escapeHtml(first.operator_zh)}" class="op-link">查看全部 ${fleet.length} 架 ↗</a></p>
    `;
  }

  /* Type encyclopedia: stats for a given typecode across operators. */
  function typeEncyclopedia(typecode) {
    const fleet = DATA.filter(a => a.type === typecode);
    if (!fleet.length) return '<p>未找到该机型数据。</p>';
    const sample = fleet[0];
    const byOp = new Map();
    const byRegion = new Map();
    let withAge = 0, ageSum = 0;
    const now = new Date().getFullYear();
    for (const a of fleet) {
      const op = a.operator_zh || '未知';
      byOp.set(op, (byOp.get(op) || 0) + 1);
      const r = a.region || 'other';
      byRegion.set(r, (byRegion.get(r) || 0) + 1);
      if (a.built) {
        const y = parseInt(a.built.slice(0, 4), 10);
        if (y) { withAge++; ageSum += (now - y); }
      }
    }
    const topOps = [...byOp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxOp = topOps[0][1];
    const opRows = topOps.map(([op, n]) =>
      `<div class="bar-row"><div class="bar-label"><a href="#" data-q="${escapeHtml(op)}" class="op-link">${escapeHtml(op)}</a></div><div class="bar-track"><div class="bar-fill" style="width:${(n/maxOp*100).toFixed(1)}%"></div></div><div class="bar-count">${n}</div></div>`
    ).join('');
    const regions = [...byRegion.entries()].sort((a, b) => b[1] - a[1]);
    const maxR = regions[0][1];
    const regionRows = regions.map(([r, n]) =>
      `<div class="bar-row"><div class="bar-label small">${REGION_LABEL[r] || r}</div><div class="bar-track"><div class="bar-fill region" style="width:${(n/maxR*100).toFixed(1)}%"></div></div><div class="bar-count">${n}</div></div>`
    ).join('');
    const avgAge = withAge ? (ageSum / withAge).toFixed(1) : '—';
    const nActive = fleet.filter(a => !a.retired && !a.inactive).length;
    return `
      <h2>${escapeHtml(sample.type_zh || typecode)} <span class="small">${escapeHtml(typecode)}</span></h2>
      <p class="small">${escapeHtml(sample.type_en || '')}</p>
      <div class="stat-row">
        <div class="stat"><div class="stat-n">${fleet.length}</div><div class="stat-l">全球架数</div></div>
        <div class="stat"><div class="stat-n">${nActive}</div><div class="stat-l">在役</div></div>
        <div class="stat"><div class="stat-n">${byOp.size}</div><div class="stat-l">运营商</div></div>
        <div class="stat"><div class="stat-n">${avgAge}</div><div class="stat-l">平均机龄</div></div>
      </div>
      <h3>主要运营人 (Top 10)</h3>
      <div class="bars">${opRows}</div>
      <h3>地区分布</h3>
      <div class="bars">${regionRows}</div>
      <p><a href="?q=${encodeURIComponent(typecode)}" data-q="${escapeHtml(typecode)}" class="op-link">查看全部 ${fleet.length} 架 ${escapeHtml(typecode)} ↗</a></p>
    `;
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
    const catSet = cat ? new Set(cat.split(',').map(s => s.trim()).filter(Boolean)) : null;

    clearBtn.hidden = !raw.trim();

    // No query and no filters → show suggestions instead of a giant list.
    if (!qTokens.length && !region && !alliance && !stStatus && !cat) {
      resultBox.innerHTML = '';
      suggestList.hidden = false;
      statusEl.textContent = `已加载 ${DATA.length.toLocaleString()} 架飞机。试着搜搜你常见的注册号。`;
      writeUrlState();
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
      if (catSet && !catSet.has(a.category)) continue;
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
    writeUrlState();
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
    const rec = META.recent || null;
    const recentLine = (rec && (rec.built_this_year || rec.retired_this_year))
      ? ` · ${rec.year} 年至今：出厂 ${rec.built_this_year} 架，注销 ${rec.retired_this_year} 架`
      : '';
    metaLine.textContent = `共 ${t} 条记录 · 数据快照: ${src.replace('metadata/aircraft-database-complete-','').replace('.csv','')} · 构建: ${gen}${recentLine}`;
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
      // Prefer column-store format (smaller). Fall back to the legacy row format.
      let acRes = await fetch('data/aircraft.col.json?v=' + stamp);
      if (acRes.ok) {
        const blob = await acRes.json();
        DATA = unpackColumns(blob);
      } else {
        acRes = await fetch('data/aircraft.json?v=' + stamp);
        if (!acRes.ok) throw new Error('aircraft.json HTTP ' + acRes.status);
        DATA = await acRes.json();
      }
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
      renderRecent();
      doSearch();
    } catch (err) {
      console.error(err);
      statusEl.textContent = '数据加载失败：' + err.message;
      statusEl.classList.add('error');
    }
  }

  /* ---------------- URL sync ---------------- */
  // Mirror search & filters into the URL so users can share a query.
  // Reads on boot; writes (replaceState) on every doSearch.
  function readUrlState() {
    const p = new URLSearchParams(location.search);
    const q = p.get('q') || p.get('reg') || '';
    if (q) qInput.value = q;
    if (p.get('region'))   regionSel.value   = p.get('region');
    if (p.get('alliance')) allianceSel.value = p.get('alliance');
    if (p.get('service'))  serviceSel.value  = p.get('service');
    if (p.get('category')) categorySel.value = p.get('category');
  }
  let urlWriteTimer = null;
  function writeUrlState() {
    clearTimeout(urlWriteTimer);
    urlWriteTimer = setTimeout(() => {
      const p = new URLSearchParams();
      const q = qInput.value.trim();
      if (q) p.set('q', q);
      if (regionSel.value)   p.set('region', regionSel.value);
      if (allianceSel.value) p.set('alliance', allianceSel.value);
      if (serviceSel.value)  p.set('service', serviceSel.value);
      if (categorySel.value) p.set('category', categorySel.value);
      const s = p.toString();
      const url = s ? '?' + s : location.pathname;
      history.replaceState(null, '', url);
    }, 200);
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
    const fleetBtn = e.target.closest('.fleet-btn[data-op-icao]');
    if (fleetBtn) {
      e.preventDefault();
      openDetail(fleetDashboard(fleetBtn.dataset.opIcao));
      return;
    }
    const typeBtn = e.target.closest('.type-btn[data-type]');
    if (typeBtn) {
      e.preventDefault();
      openDetail(typeEncyclopedia(typeBtn.dataset.type));
      return;
    }
    // Detail dialog body has its own op-link / data-q anchors — route them
    // through the same search flow then close the dialog.
    const dq = e.target.closest('[data-q]');
    if (dq && dq.closest('#detailDialog')) {
      e.preventDefault();
      qInput.value = dq.dataset.q;
      const d = document.getElementById('detailDialog');
      if (d && d.close) d.close();
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
      return;
    }
    const nextReg = e.target.closest('.next-reg[data-q]');
    if (nextReg) {
      e.preventDefault();
      qInput.value = nextReg.dataset.q;
      doSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const sameType = e.target.closest('.same-type-link a[data-q]');
    if (sameType) {
      e.preventDefault();
      qInput.value = sameType.dataset.q;
      doSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const photoImg = e.target.closest('.photo-slot img');
    if (photoImg) {
      e.preventDefault();
      const card = photoImg.closest('.result-card');
      const reg = card && card.dataset.reg;
      const v = reg && PHOTO_CACHE.get(reg);
      if (v) openPhoto(v);
      return;
    }
  });
  aboutBtn.addEventListener('click', () => {
    if (typeof aboutDlg.showModal === 'function') aboutDlg.showModal();
    else aboutDlg.setAttribute('open', '');
  });

  // Generic close buttons for detail / photo dialogs.
  document.addEventListener('click', (e) => {
    if (e.target.id === 'detailClose') {
      const d = document.getElementById('detailDialog');
      if (d && d.close) d.close();
    } else if (e.target.id === 'photoClose' || e.target.id === 'photoDialog') {
      const d = document.getElementById('photoDialog');
      if (d && d.close) d.close();
    }
  });

  /* ---------------- recent queries ---------------- */
  const RECENT_KEY = 'cnaf_recent';
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }
  function pushRecent(q) {
    q = (q || '').trim();
    if (!q || q.length < 2) return;
    let list = loadRecent().filter(x => x !== q);
    list.unshift(q);
    list = list.slice(0, 10);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch {}
    renderRecent();
  }
  function renderRecent() {
    const wrap = document.getElementById('recentRow');
    if (!wrap) return;
    const list = loadRecent();
    if (!list.length) { wrap.parentElement.hidden = true; return; }
    wrap.parentElement.hidden = false;
    wrap.innerHTML = list.map(q =>
      `<button class="chip recent-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`
    ).join('');
  }
  // Record query 800ms after the user stops typing (avoids saving every keystroke).
  let recentTimer = null;
  qInput.addEventListener('input', () => {
    clearTimeout(recentTimer);
    recentTimer = setTimeout(() => pushRecent(qInput.value), 800);
  });

  // Keyboard shortcuts: "/" focuses search, "Escape" clears it.
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === '/' && !inField && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      qInput.focus();
      qInput.select();
    } else if (e.key === 'Escape' && document.activeElement === qInput) {
      qInput.value = '';
      clearBtn.hidden = true;
      doSearch();
    }
  });

  // Read filters/query from URL on boot.
  readUrlState();

  // Register service worker for offline support. Best-effort, fail silent.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
    });
  }

  load();
})();
