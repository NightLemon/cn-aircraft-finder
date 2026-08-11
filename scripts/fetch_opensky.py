#!/usr/bin/env python3
"""Download the latest OpenSky aircraft database CSV and the Mictronics tar1090 DB.

OpenSky publishes monthly snapshots at:
  https://s3.opensky-network.org/data-samples/metadata/aircraft-database-complete-YYYY-MM.csv

The Mictronics tar1090 DB is updated weekly and lives at:
  https://github.com/wiedehopf/tar1090-db/raw/refs/heads/csv/aircraft.csv.gz
"""
from __future__ import annotations
import gzip
import re
import shutil
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from pathlib import Path
from typing import TypeVar

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)
OUT_OS = RAW_DIR / "opensky.csv"
OUT_MI = RAW_DIR / "mictronics.csv"

LIST_URL = "https://s3.opensky-network.org/data-samples?prefix=metadata/"
BASE = "https://s3.opensky-network.org/data-samples/"
MI_URL = "https://github.com/wiedehopf/tar1090-db/raw/refs/heads/csv/aircraft.csv.gz"
RETRY_DELAYS = (2, 5, 15)

T = TypeVar("T")


def with_retries(label: str, action: Callable[[], T]) -> T:
    attempts = len(RETRY_DELAYS) + 1
    for attempt in range(1, attempts + 1):
        try:
            return action()
        except (OSError, urllib.error.URLError) as exc:
            if attempt == attempts:
                raise
            delay = RETRY_DELAYS[attempt - 1]
            print(
                f"[fetch] {label} failed ({attempt}/{attempts}): {exc}; retrying in {delay}s",
                file=sys.stderr,
            )
            time.sleep(delay)
    raise RuntimeError(f"Unreachable retry state for {label}")


def read_url(url: str, timeout: int) -> bytes:
    def read() -> bytes:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.read()

    return with_retries(url, read)


def download_url(url: str, destination: Path, timeout: int) -> None:
    temporary = destination.with_suffix(destination.suffix + ".part")

    def download() -> None:
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                with temporary.open("wb") as output:
                    shutil.copyfileobj(response, output, length=1024 * 1024)
            temporary.replace(destination)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise

    with_retries(url, download)


def find_latest_opensky() -> str:
    body = read_url(LIST_URL, timeout=60).decode("utf-8")
    keys = re.findall(r"<Key>(metadata/aircraft-database-complete-\d{4}-\d{2}\.csv)</Key>", body)
    if not keys:
        raise SystemExit("No aircraft-database CSV found in OpenSky bucket listing.")
    keys.sort()
    return keys[-1]


def fetch_opensky() -> None:
    key = find_latest_opensky()
    url = BASE + key
    print(f"[fetch] {url}", file=sys.stderr)
    download_url(url, OUT_OS, timeout=300)
    size = OUT_OS.stat().st_size
    print(f"[fetch] saved {OUT_OS} ({size/1_048_576:.1f} MiB)", file=sys.stderr)
    (RAW_DIR / "source.txt").write_text(key + "\n", encoding="utf-8")


def fetch_mictronics() -> None:
    print(f"[fetch] {MI_URL}", file=sys.stderr)
    data = read_url(MI_URL, timeout=120)
    raw = gzip.decompress(data)
    OUT_MI.write_bytes(raw)
    rows = raw.count(b"\n")
    print(f"[fetch] saved {OUT_MI} ({len(raw)/1_048_576:.1f} MiB, {rows:,} rows)", file=sys.stderr)


def main() -> int:
    fetch_opensky()
    fetch_mictronics()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
