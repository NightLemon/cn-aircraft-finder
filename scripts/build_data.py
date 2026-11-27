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
import argparse
import calendar
import csv
import hashlib
import json
import re
import sys
from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory

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
SEAT_MAPS_JSON = ROOT / "data" / "seat_maps.json"
AIRFRAME_CORRECTIONS_JSON = ROOT / "data" / "airframe_corrections.json"
FAA_CORRECTIONS_JSON = ROOT / "data" / "faa_corrections.json"
SOURCE_TXT = ROOT / "data" / "raw" / "source.txt"
MI_SOURCE_TXT = ROOT / "data" / "raw" / "mictronics-source.txt"

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
    try:
        date(int(y), int(mo or 1), int(d or 1))
    except ValueError:
        return ""
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

    def named(field):
        if not field:
            return None
        if field in by_kw and is_real_op_entry(by_kw[field]):
            return by_kw[field]
        normalized = field.casefold()
        for k, v in by_kw.items():
            if is_real_op_entry(v) and normalized.startswith(k.casefold()):
                return v
        return None

    if op_icao in OPERATOR_CODES_TO_RECHECK:
        # Some imported records use these codes for the wrong carrier. An
        # explicit operator name can disambiguate the legacy assignments.
        rec = named(operator)
        if rec:
            return rec, True
    if is_real_op_entry(by_icao.get(op_icao)):
        return {**by_icao[op_icao], "icao": op_icao}, True

    rec = named(operator) or named(owner)
    if rec:
        return rec, True
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
    alias = layouts.get("type_aliases", {}).get(typecode, typecode)
    matching_layout = by_op.get(f"{operator_icao}:{typecode}") or by_op.get(f"{operator_icao}:{alias}")
    if matching_layout:
        rec = dict(matching_layout)
        rec["source"] = "curated"
        return rec
    if typecode in fb:
        rec = dict(fb[typecode])
        rec["source"] = "fallback"
        return rec
    return {}


# Commercial records outside Greater China can be supplied by either dataset.
COMMERCIAL = {"widebody", "narrowbody", "regional", "freighter"}
TYPE_ALIASES = {"C909": "AJ27", "G450": "GLF4", "G550": "GLF5", "G650": "GLF6"}
OPERATOR_CODES_TO_RECHECK = {"GDC", "FLZ", "AUL", "TPU", "SNJ", "AJX", "CTJ", "HYT"}
B_REG = re.compile(r"B[A-HJ-NP-Z0-9]{3,5}")


def registration_key(value: str) -> str:
    reg = re.sub(r"\s+", "", strip(value)).upper()
    if re.fullmatch(r"[12][0-9]{3}-[0-9]{2}-[0-9]{2}", reg):
        return ""
    compact = reg.replace("-", "")
    return "B-" + compact[1:] if B_REG.fullmatch(compact) else reg


def serial_key(value: str) -> str:
    key = re.sub(r"[^A-Z0-9]", "", value.upper())
    if key.isdecimal():
        return key.lstrip("0") or "0"
    return key


def airframe_address(value: str) -> str:
    code = strip(value).lower()
    return code if re.fullmatch(r"[0-9a-f]{6}", code) else ""


def type_key(value: str) -> str:
    return TYPE_ALIASES.get(value.upper(), value.upper())


def text_file(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip() if path.exists() else ""


def read_mictronics() -> dict:
    # Match a registration and address together. The metadata catalogue has
    # no last-seen time. Presence is kept as a filter, not an activity claim.
    aircraft = {}
    addresses = set()
    with MICTRONICS_CSV.open(encoding="utf-8", errors="replace") as source:
        for row in csv.reader(source, delimiter=";"):
            if len(row) < 2:
                continue
            address = airframe_address(row[0])
            if not address:
                continue
            addresses.add(address)
            reg = registration_key(row[1])
            if reg:
                aircraft.setdefault(reg, []).append((address, *row[2:7]))
    if len(addresses) <= 50_000:
        raise SystemExit(f"Mictronics DB is incomplete ({len(addresses):,} addresses).")
    print(f"[build] Mictronics: {len(addresses):,} addresses, {len(aircraft):,} registrations", file=sys.stderr)
    return aircraft


def read_opensky(resolve, registry_ops, counter) -> dict:
    aircraft = {}
    with RAW_CSV.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.reader(source)
        header = [strip(value) for value in next(reader)]
        fields = {
            "reg": "registration", "icao24": "icao24", "country": "country",
            "type": "typecode", "model": "model", "owner": "owner", "operator": "operator",
            "operator_icao": "operatorIcao", "operator_iata": "operatorIata",
            "built": "built", "status": "status", "serial": "serialNumber",
            "registered": "registered", "reg_until": "regUntil", "next_reg": "nextReg",
        }
        indices = {key: header.index(value) for key, value in fields.items() if value in header}
        for row in reader:
            if len(row) < len(header):
                continue
            counter["total"] += 1
            reg = registration_key(row[indices["reg"]])
            if not reg:
                continue
            data = {key: strip(row[index]) for key, index in indices.items()}
            matched = resolve(data.get("operator", ""), data.get("owner", ""), data.get("operator_icao", ""))[1]
            from_greater_china = data.get("country") in GREATER_CHINA or bool(B_REG.fullmatch(reg.replace("-", "")))
            if not matched and reg not in registry_ops:
                if not from_greater_china or not any(data.get(key) for key in ("type", "model", "owner", "operator")):
                    continue
            data.update(reg=reg, icao24=airframe_address(data.get("icao24", "")), type=type_key(data.get("type", "")))
            aircraft.setdefault(reg, []).append(data)
    return aircraft


def materialize_mictronics(reg, records, resolve, types, opensky_match):
    result = []
    country = _country_from_reg(reg)
    region = REG_PREFIX_REGION.get(_reg_prefix(reg), "")
    for record in records:
        address, code, _flags, model, built, owner = (*record, *[""] * (6 - len(record)))
        code = type_key(strip(code))
        owner = strip(owner)
        if not opensky_match and country not in GREATER_CHINA and not resolve("", owner, "")[1]:
            if types.get(code, {}).get("category") not in COMMERCIAL or region not in _MI_SUPPLEMENT_REGIONS:
                continue
        if code or model or owner:
            result.append(dict(reg=reg, icao24=address, country=country, type=code, model=strip(model),
                               built=strip(built), owner=owner))
    return result


def select_record(reg, opensky, mictronics, manual, faa, faa_date, types):
    """Resolve identity before inheriting metadata from either source."""
    examined = opensky + mictronics
    if manual:
        matches = [row for row in examined if row["icao24"] == manual["match_icao24"]]
        if matches:
            return {**matches[0], **manual["fields"], "source": "reviewed"}

    for correction in sorted(faa, key=lambda item: item["registration_status"] == "cancelled"):
        serial = correction["match_serial"]
        limit = correction.get("cancelled_at", faa_date)
        for row in opensky:
            if serial != serial_key(row.get("serial", "")) or parse_date(row.get("registered", "")) > limit:
                continue
            status = correction["registration_status"]
            if status == "cancelled" and any(
                serial_key(item.get("serial", "")) not in ("", serial) for item in opensky
            ):
                break
            if status == "conflict":
                return {"reg": reg, "registration_status": status, "country": "United States", "source": "faa"}
            payload = {key: value for key, value in correction.items() if key not in ("match_serial", "before")}
            # A reassignment is a different airframe. No airline, cabin,
            # manufacture date or history follows the old tail number.
            fields = {"reg": reg} if status == "reassigned" else row.copy()
            fields.update(payload, source="faa")
            if status == "faa_valid" and "type" not in payload:
                same_address = next((item for item in opensky
                                     if item["icao24"] == fields["icao24"] and item.get("type")
                                     and serial_key(item.get("serial", "")) in ("", serial)), None)
                if same_address:
                    fields["type"] = same_address["type"]
            return fields

    addresses = {row["icao24"] for row in examined if row["icao24"]}
    serials = {serial_key(row["serial"]) for row in opensky if row.get("serial")}
    if len(addresses) > 1 or len(serials) > 1:
        return {"reg": reg, "registration_status": "conflict", "country": _country_from_reg(reg)}

    def rank(row):
        return (bool(row["icao24"]), bool(row.get("serial")), row.get("type") in types,
                bool(row.get("model")), bool(row.get("operator_icao")))

    row = max(opensky or mictronics, key=rank).copy()
    for other in mictronics:
        if not row["icao24"] or row["icao24"] != other["icao24"]:
            continue
        original_type, other_type = row.get("type"), other.get("type")
        if original_type not in types and other_type in types:
            row.update(type=other_type)
            if other["model"]:
                row["model"] = other["model"]
        elif original_type in types and other_type in types and original_type != other_type:
            row["type_disputed"] = True
        elif not row.get("model") and other["model"]:
            row["model"] = other["model"]
        if not row.get("built") and other["built"]:
            row["built"] = other["built"]
    return row


def publish_row(row, tar_records, registry_operator, resolve, types, layouts, snapshot_cutoff):
    reg = row["reg"]
    status = row.get("registration_status", "")
    if registry_operator and row.get("type") == registry_operator["type"]:
        row = {**row, "country": "Macao", "source": "aacm"}
        if registry_operator.get("operator_icao"):
            row.update(operator_icao=registry_operator["operator_icao"], operator="", operator_iata="")
    operator, owner = row.get("operator", ""), row.get("owner", "")
    code = row.get("operator_icao", "")
    op, matched = resolve(operator, owner, code)
    op = op or {}
    op_name = op.get("name_zh") or operator or owner
    short_name = op.get("short_zh", "")
    py_full, py_init = to_pinyin(op_name)
    if short_name:
        short_full, short_init = to_pinyin(short_name)
        py_full, py_init = (py_full + " " + short_full).strip(), (py_init + " " + short_init).strip()

    country = row.get("country") or _country_from_reg(reg)
    region = ("macau" if row.get("source") == "aacm" else
              op.get("region") or GC_REGION_DEFAULT.get(country) or REG_PREFIX_REGION.get(_reg_prefix(reg), "other"))
    typecode = row.get("type", "")
    model = row.get("model", "")
    type_rec = resolve_type(typecode, model, "", types)
    known_operator = op.get("icao", code)
    address = row.get("icao24", "")
    in_mictronics = (status not in {"reassigned", "cancelled", "conflict"}
                     and bool(address and any(record[0] == address for record in tar_records)))
    retired = status == "cancelled"
    reg_until = parse_date(row.get("reg_until", ""))
    if not status and reg_until and date_key(reg_until) < snapshot_cutoff:
        status = "expiry_reported"
    entry = {
        "reg": reg, "icao24": address, "country": country, "type": typecode,
        "type_zh": type_rec["name_zh"], "type_en": type_rec["name_en"], "category": type_rec.get("category", "other"),
        "model": model, "operator_icao": known_operator, "operator_iata": op.get("iata", row.get("operator_iata", "")),
        "operator_zh": op_name, "operator_short_zh": short_name, "operator_en": op.get("name_en") or operator or owner,
        "operator_py": py_full, "operator_py_init": py_init, "region": region, "alliance": op.get("alliance", ""),
        "built": parse_date(row.get("built", "")), "in_service_at": parse_date(row.get("registered", "")),
        "reg_until": reg_until, "retired_at": row.get("cancelled_at", ""), "next_reg": row.get("next_reg", ""),
        "retired": retired, "inactive": not retired and not in_mictronics, "status": row.get("status", ""),
        "serial": row.get("serial", ""), "registration_status": status,
        "provenance": row.get("source", ""), "type_disputed": row.get("type_disputed", False),
    }
    apply_cabin(entry, layouts, types)
    return {key: value for key, value in entry.items() if value}, matched, in_mictronics


def published_cabin(row, layouts):
    if row.get("type_disputed") or row.get("registration_status") in {"conflict", "reassigned", "cancelled"}:
        return {}
    return resolve_cabin(row.get("operator_icao", ""), row.get("type", ""), layouts)


def apply_cabin(row, layouts, types):
    cabin = published_cabin(row, layouts)
    if cabin:
        row["cabin"] = cabin
    else:
        row.pop("cabin", None)
    if row.get("type_disputed"):
        row["category"] = "other"
    elif cabin.get("layout") == "纯货机":
        row["category"] = "freighter"
    elif row.get("type") in types:
        row["category"] = types[row["type"]]["category"]


def main() -> int:
    if not RAW_CSV.exists() or not MICTRONICS_CSV.exists():
        print("Missing raw aircraft data. Run scripts/fetch_opensky.py first.", file=sys.stderr)
        return 2

    ops = load_json(OPERATORS_JSON)
    types = load_json(TYPES_JSON)
    layouts = load_json(LAYOUTS_JSON)
    official = load_json(AIRFRAME_CORRECTIONS_JSON)
    faa = load_json(FAA_CORRECTIONS_JSON)
    source = text_file(SOURCE_TXT)
    month = re.search(r"[0-9]{4}-[0-9]{2}", source)
    snapshot_month = month[0] if month else datetime.now(timezone.utc).strftime("%Y-%m")
    faa_by_reg = faa["by_registration"] if snapshot_month <= faa["date"][:7] else {}

    @lru_cache(maxsize=32_768)
    def resolve(operator, owner, code):
        return resolve_operator(operator, owner, code, "", ops)

    counter = dict.fromkeys(("total", "kept", "matched", "gc_unmatched", "retired", "active",
                             "inactive", "in_mictronics", "faa", "aacm", "reviewed", "registration_conflicts",
                             "type_conflicts"), 0)
    tar = read_mictronics()
    opensky = read_opensky(resolve, official["macao"]["by_registration"], counter)
    aircraft = []
    supplemental = 0
    for reg in sorted(opensky.keys() | tar.keys()):
        first = opensky.get(reg, [])
        tar_records = tar.get(reg, [])
        other = materialize_mictronics(reg, tar_records, resolve, types, bool(first))
        if not first and not other:
            continue
        row = select_record(reg, first, other, official["by_registration"].get(reg), faa_by_reg.get(reg, []),
                            faa["date"], types)
        emitted, matched, in_mictronics = publish_row(row, tar_records, official["macao"]["by_registration"].get(reg),
                                                      resolve, types, layouts, snapshot_month + "-15")
        aircraft.append(emitted)
        supplemental += not first
        counter["matched" if matched else "gc_unmatched"] += 1
        counter["retired" if emitted.get("retired") else "inactive" if emitted.get("inactive") else "active"] += 1
        counter["in_mictronics"] += in_mictronics
        counter["registration_conflicts"] += emitted.get("registration_status") == "conflict"
        counter["type_conflicts"] += bool(emitted.get("type_disputed"))
        if emitted.get("provenance"):
            counter[emitted["provenance"]] += 1
    counter["kept"] = len(aircraft)
    print(f"[build] Mictronics supplement: +{supplemental:,} airframes", file=sys.stderr)

    write_aircraft(aircraft)
    publish_cabin_layouts(layouts)

    meta = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_csv": source,
        "snapshot_month": snapshot_month,
        "mictronics_source": text_file(MI_SOURCE_TXT),
        "registry_sources": {"faa": faa["date"], "macao": official["macao"]["date"]},
        "data_version": public_data_version(),
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

    print(f"[build] processed {counter['total']:,} rows", file=sys.stderr)
    print(f"[build] kept {counter['kept']:,} aircraft "
          f"(matched={counter['matched']:,}, gc_unmatched={counter['gc_unmatched']:,})", file=sys.stderr)
    print(f"[build] → {OUT_AIRCRAFT}  ({OUT_AIRCRAFT.stat().st_size/1024:.1f} KiB)", file=sys.stderr)
    return 0


def write_compact_json(path: Path, data) -> None:
    # A cabin-only refresh reads the row file again on the next run.
    # Keep its previous complete copy available until the new one is ready.
    with TemporaryDirectory(dir=path.parent) as staging:
        staged = Path(staging) / path.name
        staged.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        staged.replace(path)


def write_aircraft(aircraft: list[dict]) -> None:
    # Legacy row-format JSON kept for compatibility & for the optional
    # `?format=row` debug path. The frontend prefers the column-store below.
    write_compact_json(OUT_AIRCRAFT, aircraft)

    # ----- Column-store format -----
    # Same data, packed as parallel arrays + string dictionaries for the
    # high-cardinality-but-low-distinct fields (typecode, operator_icao, region, …).
    # Typical compression: 16MB → ~9-10MB. The frontend rebuilds row dicts on load.
    DICT_FIELDS = [
        "type", "category", "operator_icao", "operator_iata",
        "operator_zh", "operator_short_zh", "operator_en",
        "type_zh", "type_en", "region", "alliance", "country", "registration_status", "provenance",
    ]
    COPY_FIELDS = [
        "reg", "icao24", "model", "operator_py", "operator_py_init",
        "built", "in_service_at", "retired_at", "reg_until",
        "next_reg", "status", "serial",
    ]
    BOOL_FIELDS = ["retired", "inactive", "type_disputed"]

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
    write_compact_json(OUT_DIR / "aircraft.col.json", column_blob)


def publish_cabin_layouts(layouts: dict) -> None:
    # Also publish a slim copy of the cabin-layouts file so the frontend can
    # back-fill cabin info after recovering an operator from a photo. Comments
    # (`_*` keys) are dropped to keep payload small.
    out_layouts = OUT_DIR / "cabin_layouts.json"
    slim = {
        "type_aliases": layouts.get("type_aliases", {}),
        "by_operator_type": {k: v for k, v in layouts.get("by_operator_type", {}).items()
                             if isinstance(v, dict) and v.get("layout")},
        "fallback_by_type": {k: v for k, v in layouts.get("fallback_by_type", {}).items()
                             if isinstance(v, dict) and v.get("layout")},
    }
    maps = load_json(SEAT_MAPS_JSON)
    slim["seat_maps"] = {key: maps[key] for key in ("by_operator", "by_operator_type")}
    write_compact_json(out_layouts, slim)


def public_data_version() -> str:
    digest = hashlib.sha256()
    for filename in ("aircraft.json", "aircraft.col.json", "cabin_layouts.json"):
        with (OUT_DIR / filename).open("rb") as asset:
            digest.update(hashlib.file_digest(asset, "sha256").digest())
    return digest.hexdigest()[:16]


def refresh_cabins() -> int:
    """Rebuild the cabin fields of the published snapshot without refreshing its aircraft."""
    aircraft = json.loads(OUT_AIRCRAFT.read_text(encoding="utf-8"))
    layouts = load_json(LAYOUTS_JSON)
    types = load_json(TYPES_JSON)
    for row in aircraft:
        apply_cabin(row, layouts, types)
    write_aircraft(aircraft)
    publish_cabin_layouts(layouts)
    if OUT_META.exists():
        meta = load_json(OUT_META)
        meta["data_version"] = public_data_version()
        OUT_META.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cabins-only", action="store_true",
                        help="refresh cabin layouts in the existing public/data snapshot")
    args = parser.parse_args()
    raise SystemExit(refresh_cabins() if args.cabins_only else main())
