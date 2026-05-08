#!/usr/bin/env python3
"""Download the latest OpenSky aircraft database CSV.

OpenSky publishes monthly snapshots at:
  https://s3.opensky-network.org/data-samples/metadata/aircraft-database-complete-YYYY-MM.csv

We pick the newest month available and save to data/raw/opensky.csv.
"""
from __future__ import annotations
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OUT = RAW_DIR / "opensky.csv"

LIST_URL = "https://s3.opensky-network.org/data-samples?prefix=metadata/"
BASE = "https://s3.opensky-network.org/data-samples/"


def find_latest() -> str:
    body = urllib.request.urlopen(LIST_URL, timeout=60).read().decode("utf-8")
    keys = re.findall(r"<Key>(metadata/aircraft-database-complete-\d{4}-\d{2}\.csv)</Key>", body)
    if not keys:
        raise SystemExit("No aircraft-database CSV found in OpenSky bucket listing.")
    keys.sort()
    return keys[-1]


def main() -> int:
    key = find_latest()
    url = BASE + key
    print(f"[fetch] {url}", file=sys.stderr)
    urllib.request.urlretrieve(url, OUT)
    size = OUT.stat().st_size
    print(f"[fetch] saved {OUT} ({size/1_048_576:.1f} MiB)", file=sys.stderr)
    # Stamp the source month for the build step.
    (RAW_DIR / "source.txt").write_text(key + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
