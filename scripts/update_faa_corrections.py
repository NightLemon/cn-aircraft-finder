#!/usr/bin/env python3
"""Refresh the checked-in, serial-guarded corrections using the FAA registry ZIP."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

from build_data import ROOT, serial_key, write_compact_json


FAA_SOURCE = "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download"
N_NUMBER = re.compile(r"N(?:[1-9][0-9]{0,4}|[1-9][0-9]{0,3}[A-HJ-NP-Z]|[1-9][0-9]{0,2}[A-HJ-NP-Z]{2})")
MAX_TYPES = {"737-7": "B37M", "737-8": "B38M", "737-8200": "B38M", "737-9": "B39M", "737-10": "B3XM"}
CERTIFIED_TYPES = {
    "BD-500-1A10": "BCS1", "BD-500-1A11": "BCS3", "CL-600-2B19": "CRJ2",
    "CL-600-2C10": "CRJ7", "CL-600-2D24": "CRJ9", "CL-600-2E25": "CRJX",
}


def registry_type(manufacturer: str, model: str) -> str:
    """Map specific certified models using FAA Order JO 7360.1K."""
    if manufacturer.startswith(("AIRBUS", "BOMBARDIER", "CANADAIR")) and model in CERTIFIED_TYPES:
        return CERTIFIED_TYPES[model]
    if manufacturer.startswith("AIRBUS"):
        match = re.fullmatch(r"(A31[89]|A32[01])-[12][0-9]{2}(N[XY]?)?", model)
        if match:
            family, neo = match.groups()
            return {"A319": "A19N", "A320": "A20N", "A321": "A21N"}.get(family, family) if neo else family
        for pattern, code in (
            (r"A330-2[0-9]{2}F?", "A332"), (r"A330-3[0-9]{2}", "A333"),
            (r"A330-8[0-9]{2}", "A338"), (r"A330-9[0-9]{2}", "A339"),
            (r"A350-9[0-9]{2}", "A359"), (r"A350-10[0-9]{2}", "A35K"), (r"A380-8[0-9]{2}", "A388"),
        ):
            if re.fullmatch(pattern, model):
                return code
    if manufacturer == "BOEING":
        if model in MAX_TYPES:
            return MAX_TYPES[model]
        if model in {"717-200", "787-8", "787-9", "787-10"}:
            return {"717-200": "B712", "787-8": "B788", "787-9": "B789", "787-10": "B78X"}[model]
        if re.fullmatch(r"777-F(?:[0-9A-Z]{2})?|777-2[0-9A-Z]{2}LR", model):
            return "B77L"
        if re.fullmatch(r"777-3[0-9A-Z]{2}ER", model):
            return "B77W"
        if re.fullmatch(r"777-2[0-9A-Z]{2}(?:ER)?", model):
            return "B772"
        if re.fullmatch(r"777-3[0-9A-Z]{2}", model):
            return "B773"
        if re.fullmatch(r"747-8(?:[FI])?", model):
            return "B748"
        match = re.fullmatch(r"(737|747|757|767)-([1-9])[0-9A-Z]{2}(?:ERF?|F|C|M)?", model)
        if match:
            return "B" + match[1][:2] + match[2]
    if manufacturer.startswith(("HUGHES", "MD HELICOPTERS")) and re.match(r"369[A-Z]", model):
        return "H500"
    return ""


def read_registry(zip_file: zipfile.ZipFile, member: str):
    with io.TextIOWrapper(zip_file.open(member), encoding="utf-8-sig", errors="replace", newline="") as data:
        for row in csv.DictReader(data):
            yield {key.strip().replace("-", " "): value.strip()
                   for key, value in row.items() if key and isinstance(value, str)}


def registry_date(value: str) -> str:
    if not re.fullmatch(r"[0-9]{8}", value):
        return ""
    try:
        return date(int(value[:4]), int(value[4:6]), int(value[6:])).isoformat()
    except ValueError:
        return ""


def corrections_for_snapshot(aircraft, registry_path, snapshot_date, previous):
    # Keep past candidates for a number when a previous build already replaced
    # the old airframe. The next refresh should still correct the same raw record.
    candidates = defaultdict(dict)
    for row in aircraft:
        reg = row["reg"]
        serial = serial_key(row.get("serial", ""))
        if N_NUMBER.fullmatch(reg) and serial:
            candidates[reg][serial] = row
    for reg, corrections in previous.get("by_registration", {}).items():
        for item in corrections:
            candidates[reg][item["match_serial"]] = item.get("before", {})

    history = {}
    with zipfile.ZipFile(registry_path) as registry:
        models = {row["CODE"]: row for row in read_registry(registry, "ACFTREF.txt") if row["CODE"]}
        master = {"N" + row["N NUMBER"]: row for row in read_registry(registry, "MASTER.txt")
                  if "N" + row["N NUMBER"] in candidates}
        if not master or len(models) < 10_000:
            raise ValueError("FAA registry is incomplete or has unexpected columns")
        for row in read_registry(registry, "DEREG.txt"):
            reg = "N" + row["N NUMBER"]
            old_serial = serial_key(row["SERIAL NUMBER"])
            if old_serial in candidates.get(reg, {}):
                cancel_date = registry_date(row["CANCEL DATE"])
                if cancel_date:
                    history[reg, old_serial] = max(cancel_date, history.get((reg, old_serial), ""))

    corrected = {}
    for reg, airframes in sorted(candidates.items()):
        active = master.get(reg, {})
        active_serial = serial_key(active.get("SERIAL NUMBER", ""))
        address = active.get("MODE S CODE HEX", "").lower()
        valid = (active.get("STATUS CODE") == "V" and active_serial
                 and re.fullmatch(r"[a-f0-9]{6}", address))
        ref = models.get(active.get("MFR MDL CODE", ""), {})
        manufacturer, model = ref.get("MFR", ""), ref.get("MODEL", "")
        model_name = f"{manufacturer} {model}".strip()
        typecode = registry_type(manufacturer, model)
        for old_serial, old in sorted(airframes.items()):
            fields = {}
            cancel_date = history.get((reg, old_serial), "")
            registered = registry_date(active.get("CERT ISSUE DATE", ""))
            expires = registry_date(active.get("EXPIRATION DATE", ""))
            if valid and old_serial == active_serial:
                if old.get("icao24", "") != address or old.get("country", "") != "United States":
                    fields.update(icao24=address, country="United States")
                if typecode and typecode != old.get("type"):
                    fields.update(type=typecode, model=model_name)
                if registry_date(old.get("reg_until", "").replace("-", "")) != expires and expires:
                    fields["reg_until"] = expires
                if fields:
                    fields["registration_status"] = "faa_valid"
            elif valid and cancel_date and manufacturer and model:
                fields.update(registration_status="reassigned", icao24=address, country="United States",
                              type=typecode, model=model_name, serial=active["SERIAL NUMBER"],
                              registered=registered, reg_until=expires)
            elif cancel_date and (not active or active_serial != old_serial):
                fields.update(registration_status="cancelled", cancelled_at=cancel_date)
            elif valid and old.get("icao24") == address:
                # The address can survive a US registration reassignment.
                # With two different serials, keep the identity unconfirmed.
                fields["registration_status"] = "conflict"
            if fields:
                record = {"match_serial": old_serial, **fields}
                # These source fields let the tool recheck an existing fix
                # against a newer registry and remove it if no longer supported.
                record["before"] = {k: old[k] for k in ("icao24", "country", "type", "reg_until") if k in old}
                corrected.setdefault(reg, []).append(record)
    return {"date": snapshot_date, "source": FAA_SOURCE, "by_registration": corrected}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("registry", type=Path, help="FAA ReleasableAircraft.zip")
    parser.add_argument("--date", required=True, type=date.fromisoformat, help="FAA snapshot date")
    parser.add_argument("--aircraft", type=Path, default=ROOT / "public/data/aircraft.json")
    args = parser.parse_args()
    path = ROOT / "data/faa_corrections.json"
    previous = json.loads(path.read_text("utf-8")) if path.exists() else {}
    aircraft = json.loads(args.aircraft.read_text("utf-8"))
    corrections = corrections_for_snapshot(aircraft, args.registry, args.date.isoformat(), previous)
    with args.registry.open("rb") as registry:
        corrections["sha256"] = hashlib.file_digest(registry, "sha256").hexdigest()
    write_compact_json(path, corrections)
    print(f"{sum(map(len, corrections['by_registration'].values())):,} FAA corrections")


if __name__ == "__main__":
    main()
