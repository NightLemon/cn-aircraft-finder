#!/usr/bin/env python3
"""Build the final ``aircraft.json`` consumed by the web app.

Inputs:
  - data/raw/opensky.csv             (downloaded by fetch_opensky.py)
  - data/operators.json              (curated airline ICAO -> 中文名映射)
  - data/aircraft_types.json         (typecode -> 中文型号名)
  - data/cabin_layouts.json          (operator+typecode -> 客舱布局)

Output:
  - public/data/aircraft.json        (单文件，前端直接 fetch)
  - public/data/meta.json            (生成元信息)
"""
from __future__ import annotations
import csv
import json
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


def strip(v: str) -> str:
    return v.strip().strip("'") if v is not None else ""


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def resolve_operator(operator: str, owner: str, icao: str, iata: str, country: str, ops: dict) -> dict:
    """Map a row to a normalized operator record."""
    by_icao = ops["by_icao"]
    by_kw = ops["by_owner_keyword"]

    # 1. ICAO direct hit (most reliable when present)
    if icao and icao in by_icao:
        rec = dict(by_icao[icao])
        rec["icao"] = icao
        return rec

    # 2. owner / operator string keyword match
    for field in (operator, owner):
        if not field:
            continue
        # exact match first
        if field in by_kw:
            return dict(by_kw[field])
        # prefix match (e.g., "Air China Cargo Airlines" → "Air China Cargo")
        for k, v in by_kw.items():
            if field.lower().startswith(k.lower()):
                return dict(v)

    # 3. fallback: keep raw English with region inferred from country
    region_map = {"China": "mainland", "Hong Kong": "hk", "Macao": "macau", "Taiwan": "tw"}
    region = region_map.get(country, "other")
    name_en = operator or owner or "—"
    return {
        "icao": icao,
        "iata": iata,
        "name_zh": name_en,
        "short_zh": "",
        "name_en": name_en,
        "region": region,
    }


def resolve_type(typecode: str, model: str, manufacturer: str, types: dict) -> dict:
    if typecode and typecode in types and not typecode.startswith("_"):
        rec = dict(types[typecode])
        rec["typecode"] = typecode
        return rec
    # fallback: just typecode + raw model
    return {
        "typecode": typecode or "",
        "name_en": model or typecode or "—",
        "name_zh": model or typecode or "未知机型",
        "category": "other",
    }


def resolve_cabin(operator_icao: str, typecode: str, layouts: dict) -> dict:
    """Return cabin layout. Empty dict if unknown."""
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

    region_filter = {"China", "Hong Kong", "Macao", "Taiwan"}

    aircraft: list[dict] = []
    seen_regs: set[str] = set()

    with RAW_CSV.open(encoding="utf-8") as f:
        rd = csv.reader(f)
        header = [strip(h) for h in next(rd)]
        idx = {h: i for i, h in enumerate(header)}

        def col(row, k):
            return strip(row[idx[k]]) if k in idx and idx[k] < len(row) else ""

        for row in rd:
            if len(row) < len(header):
                continue
            country = col(row, "country")
            if country not in region_filter:
                continue
            reg = col(row, "registration")
            if not reg:
                continue
            # de-dup: keep most-detailed record (we just keep first for now)
            if reg in seen_regs:
                continue
            seen_regs.add(reg)

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

            op_rec = resolve_operator(operator, owner, op_icao, op_iata, country, ops)
            type_rec = resolve_type(typecode, model, manufacturer, types)
            cabin = resolve_cabin(op_rec.get("icao", "") or op_icao, typecode, layouts)

            # skip records that have no useful info at all
            has_op = bool(op_rec.get("name_zh") and op_rec["name_zh"] != "—")
            has_type = bool(typecode or model)
            if not has_op and not has_type:
                continue

            aircraft.append({
                "reg": reg,
                "icao24": icao24,
                "country": country,
                "type": typecode,
                "type_zh": type_rec["name_zh"],
                "type_en": type_rec["name_en"],
                "category": type_rec.get("category", "other"),
                "model": model,
                "manufacturer": manufacturer,
                "operator_icao": op_rec.get("icao", "") or op_icao,
                "operator_iata": op_rec.get("iata", "") or op_iata,
                "operator_zh": op_rec.get("name_zh", "") or operator or owner,
                "operator_short_zh": op_rec.get("short_zh", ""),
                "operator_en": op_rec.get("name_en", "") or operator or owner,
                "owner_raw": owner,
                "operator_raw": operator,
                "region": op_rec.get("region", ""),
                "built": built,
                "status": status,
                "serial": serial,
                "cabin": cabin,
            })

    # sort by registration for stable output
    aircraft.sort(key=lambda a: a["reg"])

    # write
    OUT_AIRCRAFT.write_text(
        json.dumps(aircraft, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    source = SOURCE_TXT.read_text(encoding="utf-8").strip() if SOURCE_TXT.exists() else ""
    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_csv": source,
        "total_aircraft": len(aircraft),
        "by_region": {},
        "by_operator": {},
        "by_type": {},
    }
    for a in aircraft:
        meta["by_region"][a["region"]] = meta["by_region"].get(a["region"], 0) + 1
        op = a["operator_zh"] or "未知"
        meta["by_operator"][op] = meta["by_operator"].get(op, 0) + 1
        t = a["type"] or "未知"
        meta["by_type"][t] = meta["by_type"].get(t, 0) + 1
    OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[build] wrote {len(aircraft)} aircraft → {OUT_AIRCRAFT}", file=sys.stderr)
    print(f"[build] meta → {OUT_META}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
