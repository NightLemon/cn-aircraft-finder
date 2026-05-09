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
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

csv.field_size_limit(10 * 1024 * 1024)

ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = ROOT / "data" / "raw" / "opensky.csv"
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
    """Pad a date for ordered comparison. '2017' -> '2017-12-31', '2017-06' -> '2017-06-30'."""
    if not s:
        return ""
    if len(s) == 4:
        return s + "-12-31"
    if len(s) == 7:
        return s + "-30"
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

    aircraft: list[dict] = []
    seen_regs: set[str] = set()
    counter = {"total": 0, "kept": 0, "matched": 0, "gc_unmatched": 0,
               "retired": 0, "active": 0}

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

            # Service status: a record is considered retired when its registration
            # has expired before the snapshot month. Empty regUntil → assume active.
            retired = bool(reg_until and date_key(reg_until) < snapshot_cutoff)
            if retired:
                counter["retired"] += 1
            else:
                counter["active"] += 1

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
                "operator_zh": op_rec.get("name_zh", "") or operator or owner,
                "operator_short_zh": op_rec.get("short_zh", ""),
                "operator_en": op_rec.get("name_en", "") or operator or owner,
                "region": op_rec.get("region", ""),
                "alliance": op_rec.get("alliance", ""),
                "built": built,
                "in_service_at": registered,
                "retired_at": reg_until if retired else "",
                "reg_until": reg_until if not retired else "",
                "next_reg": next_reg,
                "retired": retired,
                "status": status,
                "serial": serial,
                "cabin": cabin,
            }
            # Drop empty fields (but keep retired=False explicitly off — only emit when True).
            cleaned = {}
            for k, v in entry.items():
                if k == "retired":
                    if v:
                        cleaned[k] = True
                    continue
                if v not in ("", {}, None):
                    cleaned[k] = v
            aircraft.append(cleaned)

    aircraft.sort(key=lambda a: a["reg"])

    OUT_AIRCRAFT.write_text(
        json.dumps(aircraft, ensure_ascii=False, separators=(",", ":")),
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
        "by_type": {},
        "by_alliance": {},
        "stats": counter,
    }
    for a in aircraft:
        r = a.get("region", "other")
        meta["by_region"][r] = meta["by_region"].get(r, 0) + 1
        op = a.get("operator_zh") or "未知"
        meta["by_operator"][op] = meta["by_operator"].get(op, 0) + 1
        t = a.get("type") or "未知"
        meta["by_type"][t] = meta["by_type"].get(t, 0) + 1
        al = a.get("alliance") or ""
        if al:
            meta["by_alliance"][al] = meta["by_alliance"].get(al, 0) + 1
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[build] processed {counter['total']:,} rows", file=sys.stderr)
    print(f"[build] kept {counter['kept']:,} aircraft "
          f"(matched={counter['matched']:,}, gc_unmatched={counter['gc_unmatched']:,})", file=sys.stderr)
    print(f"[build] → {OUT_AIRCRAFT}  ({OUT_AIRCRAFT.stat().st_size/1024:.1f} KiB)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
