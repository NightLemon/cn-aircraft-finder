#!/usr/bin/env python3
"""Build the final ``aircraft.json`` consumed by the web app.

Strategy:
  - Walk all rows in OpenSky aircraft database (worldwide).
  - Keep only rows that resolve to a known airline (via operators.json
    by_icao or by_owner_keyword). This automatically filters out the millions
    of private/GA/test aircraft and leaves an actionable commercial fleet.
  - Special case: rows registered in Greater China (CN/HK/MO/TW) are kept even
    if no airline match — useful for B-XXXX private/business jets that the
    user may want to look up.

Output fields are intentionally compact to keep aircraft.json small.
"""
from __future__ import annotations
import calendar
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Optional pinyin support — if pypinyin is installed, we precompute a pinyin/initials
# index for each Chinese operator name so the frontend can match "gh"/"guohang" → 国航.
try:
    from pypinyin import lazy_pinyin, Style  # type: ignore
    HAS_PINYIN = True
except Exception:
    HAS_PINYIN = False


def to_pinyin(text: str) -> tuple[str, str]:
    """Return (full_pinyin, initials) for a Chinese string. Empty if pypinyin missing."""
    if not text or not HAS_PINYIN:
        return "", ""
    cached = _PINYIN_CACHE.get(text)
    if cached is not None:
        return cached
    try:
        full = "".join(lazy_pinyin(text, style=Style.NORMAL))
        inits = "".join(lazy_pinyin(text, style=Style.FIRST_LETTER))
        out = (full.lower(), inits.lower())
    except Exception:
        out = ("", "")
    _PINYIN_CACHE[text] = out
    return out


_PINYIN_CACHE: dict[str, tuple[str, str]] = {}

csv.field_size_limit(10 * 1024 * 1024)

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "data" / "raw" / "opensky.csv"
MICTRONICS_CSV = ROOT / "data" / "raw" / "mictronics.csv"
OPERATORS_JSON = ROOT / "data" / "operators.json"
TYPES_JSON = ROOT / "data" / "aircraft_types.json"
LAYOUTS_JSON = ROOT / "data" / "cabin_layouts.json"
SOURCE_TXT = ROOT / "data" / "raw" / "source.txt"

OUT_DIR = ROOT / "public" / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_AIRCRAFT = OUT_DIR / "aircraft.json"
OUT_META = OUT_DIR / "meta.json"

GREATER_CHINA = {"China", "Hong Kong", "Macao", "Taiwan"}
GC_REGION_DEFAULT = {
    "China": "mainland", "Hong Kong": "hk", "Macao": "macau", "Taiwan": "tw",
}

# Tail-number prefix → (country, region). Used by the Mictronics supplementary
# pass when OpenSky's row is missing entirely. Covers the prefixes we care about
# — extra entries are harmless, missing entries just mean the supplement skips
# that airframe (which is fine; better than polluting with random nationalities).
_REG_TO_COUNTRY_REGION = {
    "B-K":  ("Hong Kong",   "hk"),
    "B-L":  ("Hong Kong",   "hk"),
    "B-H":  ("Hong Kong",   "hk"),
    "B-M":  ("Macao",       "macau"),
    "B":    ("China",       "mainland"),     # default for other B-
    "N":    ("United States", "us"),
    "C-":   ("Canada",      "ca"),
    "G-":   ("United Kingdom", "uk"),
    "EI":   ("Ireland",     "uk"),
    "F-":   ("France",      "eu"),
    "D-":   ("Germany",     "eu"),
    "OE":   ("Austria",     "eu"),
    "OO":   ("Belgium",     "eu"),
    "OY":   ("Denmark",     "eu"),
    "SE":   ("Sweden",      "eu"),
    "LN":   ("Norway",      "eu"),
    "OH":   ("Finland",     "eu"),
    "PH":   ("Netherlands", "eu"),
    "EC":   ("Spain",       "eu"),
    "CS":   ("Portugal",    "eu"),
    "I-":   ("Italy",       "eu"),
    "HB":   ("Switzerland", "eu"),
    "SP":   ("Poland",      "eu"),
    "OK":   ("Czechia",     "eu"),
    "OM":   ("Slovakia",    "eu"),
    "TC":   ("Turkey",      "eu"),
    "SX":   ("Greece",      "eu"),
    "9H":   ("Malta",       "eu"),
    "LZ":   ("Bulgaria",    "eu"),
    "YR":   ("Romania",     "eu"),
    "HA":   ("Hungary",     "eu"),
    "S5":   ("Slovenia",    "eu"),
    "JA":   ("Japan",       "jp"),
    "HL":   ("South Korea", "kr"),
    "VT":   ("India",       "in"),
    "VH":   ("Australia",   "oceania"),
    "ZK":   ("New Zealand", "oceania"),
    "9V":   ("Singapore",   "sea"),
    "9M":   ("Malaysia",    "sea"),
    "HS":   ("Thailand",    "sea"),
    "PK":   ("Indonesia",   "sea"),
    "RP":   ("Philippines", "sea"),
    "VN":   ("Vietnam",     "sea"),
    "XV":   ("Vietnam",     "sea"),
    "VR":   ("Vietnam",     "sea"),
    "A6":   ("UAE",         "me"),
    "A7":   ("Qatar",       "me"),
    "A9C":  ("Bahrain",     "me"),
    "HZ":   ("Saudi Arabia","me"),
    "4X":   ("Israel",      "me"),
    "SU":   ("Egypt",       "africa"),
    "ZS":   ("South Africa","africa"),
    "5Y":   ("Kenya",       "africa"),
    "ET":   ("Ethiopia",    "africa"),
    "RA":   ("Russia",      "ru"),
    "UR":   ("Ukraine",     "ru"),
    "EW":   ("Belarus",     "ru"),
    "UP":   ("Kazakhstan",  "ru"),
    "PT":   ("Brazil",      "latam"),
    "PP":   ("Brazil",      "latam"),
    "PR":   ("Brazil",      "latam"),
    "PS":   ("Brazil",      "latam"),
    "LV":   ("Argentina",   "latam"),
    "CC":   ("Chile",       "latam"),
    "XA":   ("Mexico",      "latam"),
    "XB":   ("Mexico",      "latam"),
    "XC":   ("Mexico",      "latam"),
    "OB":   ("Peru",        "latam"),
    "HK":   ("Colombia",    "latam"),
}
# Try longest match first.
_REG_PREFIXES_SORTED = sorted(_REG_TO_COUNTRY_REGION.keys(), key=len, reverse=True)
# Regions we'll happily backfill from Mictronics even without an airline match.
# (Greater China is always kept regardless; this list governs everywhere else.)
_MI_SUPPLEMENT_REGIONS = {"us", "eu", "uk", "jp", "kr", "sea", "in", "me",
                          "oceania", "ca", "ru", "latam", "africa"}

def _reg_prefix(reg: str) -> str:
    u = (reg or "").upper()
    for p in _REG_PREFIXES_SORTED:
        if u.startswith(p):
            return p
    return ""

def _country_from_reg(reg: str) -> str:
    return _REG_TO_COUNTRY_REGION.get(_reg_prefix(reg), ("", ""))[0]

REG_PREFIX_REGION = {p: rr[1] for p, rr in _REG_TO_COUNTRY_REGION.items()}

# Date in YYYY-MM-DD or YYYY-MM or YYYY. We accept any of these.
_DATE_RE = re.compile(r"^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$")


def parse_date(s: str) -> str:
    """Normalize an OpenSky date string. Returns 'YYYY-MM-DD' / 'YYYY-MM' / 'YYYY' or ''."""
    s = (s or "").strip()
    if not s:
        return ""
    m = _DATE_RE.match(s)
    if not m:
        return ""
    y, mo, d = m.group(1), m.group(2), m.group(3)
    if d:
        return f"{y}-{mo}-{d}"
    if mo:
        return f"{y}-{mo}"
    return y


def parse_year(s: str) -> int | None:
    s = parse_date(s)
    return int(s[:4]) if s else None


def date_key(s: str) -> str:
    """Pad a date for ordered comparison using the real month-end day."""
    if not s:
        return ""
    if len(s) == 4:
        return s + "-12-31"
    if len(s) == 7:
        y, mo = int(s[:4]), int(s[5:7])
        return f"{s}-{calendar.monthrange(y, mo)[1]:02d}"
    return s


def strip(v: str) -> str:
    return v.strip().strip("'") if v is not None else ""


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def is_real_op_entry(v: object) -> bool:
    return isinstance(v, dict) and not v.get("_skip") and "name_zh" in v


def resolve_operator(operator: str, owner: str, op_icao: str, op_iata: str, ops: dict):
    by_icao = ops["by_icao"]
    by_kw = ops["by_owner_keyword"]

    if op_icao and op_icao in by_icao and is_real_op_entry(by_icao[op_icao]):
        rec = dict(by_icao[op_icao])
        rec["icao"] = op_icao
        return rec, True

    for field in (operator, owner):
        if not field:
            continue
        if field in by_kw and is_real_op_entry(by_kw[field]):
            return dict(by_kw[field]), True
        for k, v in by_kw.items():
            if not is_real_op_entry(v):
                continue
            if field.lower().startswith(k.lower()):
                return dict(v), True
    return None, False


def resolve_type(typecode: str, model: str, manufacturer: str, types: dict) -> dict:
    if typecode and typecode in types and not typecode.startswith("_"):
        rec = dict(types[typecode])
        rec["typecode"] = typecode
        return rec
    return {
        "typecode": typecode or "",
        "name_en": model or typecode or "—",
        "name_zh": model or typecode or "未知机型",
        "category": "other",
    }


def resolve_cabin(operator_icao: str, typecode: str, layouts: dict) -> dict:
    by_op = layouts.get("by_operator_type", {})
    fb = layouts.get("fallback_by_type", {})
    key = f"{operator_icao}:{typecode}"
    if key in by_op:
        rec = dict(by_op[key])
        rec["source"] = "curated"
        return rec
    if typecode in fb:
        rec = dict(fb[typecode])
        rec["source"] = "fallback"
        return rec
    return {}


def main() -> int:
    if not RAW_CSV.exists():
        print(f"missing {RAW_CSV}; run scripts/fetch_opensky.py first", file=sys.stderr)
        return 2

    ops = load_json(OPERATORS_JSON)
    types = load_json(TYPES_JSON)
    layouts = load_json(LAYOUTS_JSON)

    # Mictronics tar1090 DB — weekly-updated registry of aircraft seen on ADS-B.
    # Two roles:
    #   (a) activity signal — if a record is in OpenSky but missing from
    #       Mictronics, the aircraft is likely retired / stored / sold.
    #   (b) supplementary supply — OpenSky's monthly snapshot misses tens of
    #       thousands of currently-flying airframes (especially European F-/D-/G-
    #       regs). We pull those in too so users searching for, e.g., F-GSPX
    #       don't see "no result". Operator is left empty when Mictronics
    #       doesn't know it; the frontend recovers the airline from the
    #       Planespotters photo slug.
    mictronics_icao: set[str] = set()
    mictronics_reg: set[str] = set()
    mictronics_ok = False
    # reg -> (icao24, typecode, model, owner, built_year)
    mictronics_rows: dict[str, tuple[str, str, str, str, str]] = {}
    if MICTRONICS_CSV.exists():
        with MICTRONICS_CSV.open(encoding="utf-8", errors="replace") as f:
            mrd = csv.reader(f, delimiter=";")
            for row in mrd:
                if len(row) < 2:
                    continue
                icao = (row[0] or "").strip().lower()
                rg = (row[1] or "").strip()
                if icao:
                    mictronics_icao.add(icao)
                if rg:
                    mictronics_reg.add(rg)
                    if rg not in mictronics_rows:
                        mictronics_rows[rg] = (
                            icao,
                            (row[2] or "").strip() if len(row) > 2 else "",
                            (row[4] or "").strip() if len(row) > 4 else "",
                            (row[6] or "").strip() if len(row) > 6 else "",
                            (row[5] or "").strip() if len(row) > 5 else "",
                        )
        # Sanity floor: a healthy Mictronics dump has >100k rows. If the file is
        # truncated/empty, refuse to use it (otherwise we'd flag everything inactive).
        mictronics_ok = len(mictronics_icao) > 50_000
        if mictronics_ok:
            print(f"[build] Mictronics: {len(mictronics_icao):,} icao24, {len(mictronics_reg):,} regs", file=sys.stderr)
        else:
            raise SystemExit(
                f"Mictronics looks truncated ({len(mictronics_icao):,} rows); "
                "refusing to publish degraded activity data."
            )
    else:
        raise SystemExit("Mictronics DB missing; refusing to publish degraded activity data.")

    aircraft: list[dict] = []
    seen_regs: set[str] = set()
    counter = {"total": 0, "kept": 0, "matched": 0, "gc_unmatched": 0,
               "retired": 0, "active": 0, "inactive": 0, "in_mictronics": 0}

    # Snapshot month derived from data/raw/source.txt — used to decide whether
    # ``regUntil`` falls in the past (i.e. aircraft is de-registered/retired).
    src_text = SOURCE_TXT.read_text(encoding="utf-8").strip() if SOURCE_TXT.exists() else ""
    m = re.search(r"(\d{4})-(\d{2})", src_text)
    if m:
        snapshot_month = f"{m.group(1)}-{m.group(2)}"
    else:
        snapshot_month = datetime.now(timezone.utc).strftime("%Y-%m")
    snapshot_cutoff = snapshot_month + "-15"  # mid-month cutoff

    with RAW_CSV.open(encoding="utf-8") as f:
        rd = csv.reader(f)
        header = [strip(h) for h in next(rd)]
        idx = {h: i for i, h in enumerate(header)}

        def col(row, k):
            return strip(row[idx[k]]) if k in idx and idx[k] < len(row) else ""

        for row in rd:
            if len(row) < len(header):
                continue
            counter["total"] += 1
            reg = col(row, "registration")
            if not reg:
                continue
            if reg in seen_regs:
                continue

            country = col(row, "country")
            typecode = col(row, "typecode")
            model = col(row, "model")
            manufacturer = col(row, "manufacturerName")
            owner = col(row, "owner")
            operator = col(row, "operator")
            op_icao = col(row, "operatorIcao")
            op_iata = col(row, "operatorIata")
            built = col(row, "built")
            status = col(row, "status")
            icao24 = col(row, "icao24")
            serial = col(row, "serialNumber")
            registered = parse_date(col(row, "registered"))
            reg_until = parse_date(col(row, "regUntil"))
            built = parse_date(built)
            next_reg = col(row, "nextReg")

            op_rec, matched = resolve_operator(operator, owner, op_icao, op_iata, ops)
            in_gc = country in GREATER_CHINA

            if not matched and not in_gc:
                continue
            if not matched and in_gc and not (typecode or model or owner or operator):
                continue

            seen_regs.add(reg)
            counter["kept"] += 1
            if matched:
                counter["matched"] += 1
            else:
                counter["gc_unmatched"] += 1

            type_rec = resolve_type(typecode, model, manufacturer, types)

            if op_rec is None:
                op_rec = {
                    "icao": op_icao,
                    "iata": op_iata,
                    "name_zh": operator or owner or "",
                    "short_zh": "",
                    "name_en": operator or owner or "",
                    "region": GC_REGION_DEFAULT.get(country, "other"),
                }

            cabin = resolve_cabin(op_rec.get("icao", "") or op_icao, typecode, layouts)

            # ----- Service status -----
            # Three tiers, in decreasing confidence:
            #   1. retired (high)    : OpenSky regUntil already past the snapshot.
            #                          The civil-aviation registry says "de-registered".
            #   2. inactive (medium) : present in OpenSky but absent from Mictronics
            #                          tar1090 DB, which is updated weekly from live
            #                          ADS-B feeds. Likely stored / scrapped / sold.
            #   3. active            : present in Mictronics, or no signal to suggest otherwise.
            in_mi = (icao24.lower() in mictronics_icao) or (reg in mictronics_reg)
            retired = bool(reg_until and date_key(reg_until) < snapshot_cutoff)
            inactive = (not retired) and (not in_mi) and mictronics_ok
            if retired:
                counter["retired"] += 1
            elif inactive:
                counter["inactive"] += 1
            else:
                counter["active"] += 1
            if in_mi:
                counter["in_mictronics"] += 1

            operator_zh = op_rec.get("name_zh", "") or operator or owner
            operator_short_zh = op_rec.get("short_zh", "")
            py_full, py_init = to_pinyin(operator_zh)
            if operator_short_zh:
                spf, spi = to_pinyin(operator_short_zh)
                py_full = (py_full + " " + spf).strip()
                py_init = (py_init + " " + spi).strip()

            entry = {
                "reg": reg,
                "icao24": icao24,
                "country": country,
                "type": typecode,
                "type_zh": type_rec["name_zh"],
                "type_en": type_rec["name_en"],
                "category": type_rec.get("category", "other"),
                "model": model,
                "operator_icao": op_rec.get("icao", "") or op_icao,
                "operator_iata": op_rec.get("iata", "") or op_iata,
                "operator_zh": operator_zh,
                "operator_short_zh": operator_short_zh,
                "operator_en": op_rec.get("name_en", "") or operator or owner,
                "operator_py": py_full,
                "operator_py_init": py_init,
                "region": op_rec.get("region", ""),
                "alliance": op_rec.get("alliance", ""),
                "built": built,
                "in_service_at": registered,
                "retired_at": reg_until if retired else "",
                "reg_until": reg_until if not retired else "",
                "next_reg": next_reg,
                "retired": retired,
                "inactive": inactive,
                "status": status,
                "serial": serial,
                "cabin": cabin,
            }
            # Drop empty fields (but keep retired/inactive=False off — only emit when True).
            cleaned = {}
            for k, v in entry.items():
                if k in ("retired", "inactive"):
                    if v:
                        cleaned[k] = True
                    continue
                if v not in ("", {}, None):
                    cleaned[k] = v
            aircraft.append(cleaned)

    # ---------- Mictronics supplementary pass ----------
    # Pull in airframes Mictronics knows about but OpenSky's monthly snapshot
    # missed (~83k as of 2025-08). Without this, currently-flying jets like
    # Air France's F-GSPX would simply not appear.
    #
    # Filter strategy:
    #   1. Always keep if owner matches our airline whitelist.
    #   2. Always keep if the registration is Greater China.
    #   3. Otherwise keep only if the typecode resolves to a commercial
    #      category (widebody/narrowbody/regional/freighter) AND the reg
    #      prefix maps to a region we cover. Operator may be left empty —
    #      the frontend recovers it from the Planespotters photo slug.
    #
    # This intentionally lets in tens of thousands of airframes whose
    # operator we don't know yet, but excludes the half-million private
    # GA/heli/biz tails that pollute the dataset.
    _COMMERCIAL_CATS = {"widebody", "narrowbody", "regional", "freighter"}
    if mictronics_ok:
        mi_added = 0
        for reg, (icao24, typecode, model, owner, built_year) in mictronics_rows.items():
            if reg in seen_regs:
                continue
            country = _country_from_reg(reg)
            region_from_prefix = REG_PREFIX_REGION.get(_reg_prefix(reg), "")
            op_rec, matched = resolve_operator("", owner, "", "", ops)
            in_gc = country in GREATER_CHINA
            type_rec_tmp = resolve_type(typecode, model, "", types) if typecode else None
            is_commercial = (type_rec_tmp and type_rec_tmp.get("category") in _COMMERCIAL_CATS)

            # Filter
            if matched:
                pass  # always keep
            elif in_gc:
                if not (typecode or model or owner): continue
            elif is_commercial and region_from_prefix in _MI_SUPPLEMENT_REGIONS:
                pass  # commercial widebody/narrowbody from a covered region
            else:
                continue

            seen_regs.add(reg)
            mi_added += 1

            type_rec = type_rec_tmp or resolve_type(typecode, model, "", types)
            if op_rec is None:
                op_rec = {
                    "icao": "", "iata": "",
                    "name_zh": owner or "",
                    "short_zh": "",
                    "name_en": owner or "",
                    "region": GC_REGION_DEFAULT.get(country, region_from_prefix) or region_from_prefix,
                }
            cabin = resolve_cabin(op_rec.get("icao", ""), typecode, layouts)
            built = built_year if built_year and len(built_year) == 4 else ""

            operator_zh = op_rec.get("name_zh", "") or owner or ""
            operator_short_zh = op_rec.get("short_zh", "")
            py_full, py_init = to_pinyin(operator_zh)
            if operator_short_zh:
                spf, spi = to_pinyin(operator_short_zh)
                py_full = (py_full + " " + spf).strip()
                py_init = (py_init + " " + spi).strip()

            entry = {
                "reg": reg,
                "icao24": icao24,
                "country": country,
                "type": typecode,
                "type_zh": type_rec["name_zh"],
                "type_en": type_rec["name_en"],
                "category": type_rec.get("category", "other"),
                "model": model,
                "operator_icao": op_rec.get("icao", ""),
                "operator_iata": op_rec.get("iata", ""),
                "operator_zh": operator_zh,
                "operator_short_zh": operator_short_zh,
                "operator_en": op_rec.get("name_en", "") or owner or "",
                "operator_py": py_full,
                "operator_py_init": py_init,
                "region": op_rec.get("region", "") or region_from_prefix,
                "alliance": op_rec.get("alliance", ""),
                "built": built,
                "in_service_at": "",
                "retired_at": "",
                "reg_until": "",
                "next_reg": "",
                "retired": False,
                "inactive": False,
                "status": "",
                "serial": "",
                "cabin": cabin,
            }
            cleaned = {}
            for k, v in entry.items():
                if k in ("retired", "inactive"):
                    if v: cleaned[k] = True
                    continue
                if v not in ("", {}, None):
                    cleaned[k] = v
            aircraft.append(cleaned)
            counter["active"] += 1
            counter["in_mictronics"] += 1
            if matched:
                counter["matched"] += 1
            else:
                counter["gc_unmatched"] += 1
            counter["kept"] += 1
        print(f"[build] Mictronics supplement: +{mi_added:,} airframes", file=sys.stderr)

    aircraft.sort(key=lambda a: a["reg"])

    # Legacy row-format JSON kept for compatibility & for the optional
    # `?format=row` debug path. The frontend prefers the column-store below.
    OUT_AIRCRAFT.write_text(
        json.dumps(aircraft, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # ----- Column-store format -----
    # Same data, packed as parallel arrays + string dictionaries for the
    # high-cardinality-but-low-distinct fields (typecode, operator_icao, region, …).
    # Typical compression: 16MB → ~9-10MB. The frontend rebuilds row dicts on load.
    DICT_FIELDS = [
        "type", "category", "operator_icao", "operator_iata",
        "operator_zh", "operator_short_zh", "operator_en",
        "type_zh", "type_en", "region", "alliance", "country",
    ]
    COPY_FIELDS = [
        "reg", "icao24", "model", "operator_py", "operator_py_init",
        "built", "in_service_at", "retired_at", "reg_until",
        "next_reg", "status", "serial",
    ]
    BOOL_FIELDS = ["retired", "inactive"]

    dicts: dict[str, list[str]] = {f: [""] for f in DICT_FIELDS}
    dict_index: dict[str, dict[str, int]] = {f: {"": 0} for f in DICT_FIELDS}
    columns: dict[str, list] = {f: [] for f in DICT_FIELDS + COPY_FIELDS}
    bool_bits: dict[str, list[int]] = {f: [] for f in BOOL_FIELDS}
    cabin_col: list = []
    cabin_dict: list[dict] = [{}]
    cabin_index: dict[str, int] = {"": 0}

    def intern(field: str, value: str) -> int:
        if value is None:
            value = ""
        idx_map = dict_index[field]
        idx = idx_map.get(value)
        if idx is None:
            idx = len(dicts[field])
            dicts[field].append(value)
            idx_map[value] = idx
        return idx

    for a in aircraft:
        for f in DICT_FIELDS:
            columns[f].append(intern(f, a.get(f, "")))
        for f in COPY_FIELDS:
            columns[f].append(a.get(f, ""))
        for f in BOOL_FIELDS:
            bool_bits[f].append(1 if a.get(f) else 0)
        c = a.get("cabin") or {}
        if not c:
            cabin_col.append(0)
        else:
            key = json.dumps(c, ensure_ascii=False, sort_keys=True)
            idx = cabin_index.get(key)
            if idx is None:
                idx = len(cabin_dict)
                cabin_dict.append(c)
                cabin_index[key] = idx
            cabin_col.append(idx)

    column_blob = {
        "version": 1,
        "n": len(aircraft),
        "dicts": dicts,
        "columns": columns,
        "bools": bool_bits,
        "cabin_dict": cabin_dict,
        "cabin": cabin_col,
    }
    out_col = OUT_DIR / "aircraft.col.json"
    out_col.write_text(
        json.dumps(column_blob, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    source = SOURCE_TXT.read_text(encoding="utf-8").strip() if SOURCE_TXT.exists() else ""
    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_csv": source,
        "snapshot_month": snapshot_month,
        "total_aircraft": len(aircraft),
        "by_region": {},
        "by_operator": {},
        "by_operator_icao": {},
        "by_type": {},
        "by_alliance": {},
        "stats": counter,
    }
    for a in aircraft:
        r = a.get("region", "other")
        meta["by_region"][r] = meta["by_region"].get(r, 0) + 1
        op = a.get("operator_zh") or "未知"
        meta["by_operator"][op] = meta["by_operator"].get(op, 0) + 1
        opi = a.get("operator_icao") or ""
        if opi:
            meta["by_operator_icao"][opi] = meta["by_operator_icao"].get(opi, 0) + 1
        t = a.get("type") or "未知"
        meta["by_type"][t] = meta["by_type"].get(t, 0) + 1
        al = a.get("alliance") or ""
        if al:
            meta["by_alliance"][al] = meta["by_alliance"].get(al, 0) + 1

    # "What's new this snapshot": aircraft built or retired in the snapshot's
    # calendar year, surfaced on the about/meta line.
    snap_year = snapshot_month[:4]
    built_this_year = sum(1 for a in aircraft if (a.get("built") or "").startswith(snap_year))
    retired_this_year = sum(
        1 for a in aircraft if a.get("retired") and (a.get("retired_at") or "").startswith(snap_year)
    )
    meta["recent"] = {
        "year": snap_year,
        "built_this_year": built_this_year,
        "retired_this_year": retired_this_year,
    }
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    # Also publish a slim copy of the cabin-layouts file so the frontend can
    # back-fill cabin info after recovering an operator from a photo. Comments
    # (`_*` keys) are dropped to keep payload small.
    out_layouts = ROOT / "public" / "data" / "cabin_layouts.json"
    slim = {
        "by_operator_type": {k: v for k, v in layouts.get("by_operator_type", {}).items()
                             if isinstance(v, dict) and v.get("layout")},
        "fallback_by_type": {k: v for k, v in layouts.get("fallback_by_type", {}).items()
                             if isinstance(v, dict) and v.get("layout")},
    }
    out_layouts.write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(f"[build] processed {counter['total']:,} rows", file=sys.stderr)
    print(f"[build] kept {counter['kept']:,} aircraft "
          f"(matched={counter['matched']:,}, gc_unmatched={counter['gc_unmatched']:,})", file=sys.stderr)
    print(f"[build] → {OUT_AIRCRAFT}  ({OUT_AIRCRAFT.stat().st_size/1024:.1f} KiB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
