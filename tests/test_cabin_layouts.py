import json
import re
import unittest
from pathlib import Path

from scripts.build_data import published_cabin, resolve_cabin, resolve_operator


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "data"


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate cabin layout key: {key}")
        result[key] = value
    return result


class CabinLayoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.layouts = json.loads((ROOT / "data/cabin_layouts.json").read_text("utf-8"))

    def test_shenzhen_a320neo(self):
        # Both the builder and the photo-based operator lookup need this override.
        lookup = json.loads((PUBLIC / "cabin_layouts.json").read_text("utf-8"))
        for layouts in (self.layouts, lookup):
            cabin = resolve_cabin("CSZ", "A20N", layouts)
            self.assertEqual((cabin["source"], cabin["layout"], cabin["total"]),
                             ("curated", "174Y", 174))
            for other_capacity in ("152", "158"):
                self.assertIn(other_capacity, cabin["notes"])
            generic = resolve_cabin("", "A20N", layouts)
            self.assertEqual(generic["source"], "fallback")
            self.assertNotIn("total", generic)
            self.assertNotRegex(generic["layout"], r"\d")

    def test_other_airlines_and_shared_type_codes(self):
        for op, typecode, seats in (
            ("CSN", "A20N", (166, "4C + 24W + 138Y")),
            ("DAL", "A21N", (194, "20C + 60W + 114Y")),
            ("ACA", "B77L", (300, "40C + 24W + 236Y")),
            ("FDX", "B77L", (0, "纯货机")),
        ):
            with self.subTest(op=op, typecode=typecode):
                cabin = resolve_cabin(op, typecode, self.layouts)
                self.assertEqual((cabin["total"], cabin["layout"]), seats)
        self.assertNotIn("total", resolve_cabin("", "B77L", self.layouts))
        flexible = resolve_cabin("BAW", "A21N", self.layouts)
        self.assertEqual(flexible["total"], 220)
        self.assertNotRegex(flexible["layout"], r"\d")

    def test_carrier_codes_used_for_cabin_lookup(self):
        operators = json.loads((ROOT / "data/operators.json").read_text("utf-8"))
        for name, code, typecode, capacity in (
            ("Zhejiang Loong Airlines", "CDC", "A20N", 174),
            ("Dalian Airlines", "CCD", "B738", 167),
            ("Shandong Airlines", "CDG", "B38M", 176),
        ):
            for operator_icao in ("", code):
                with self.subTest(name=name, operator_icao=operator_icao):
                    op, matched = resolve_operator("", name, operator_icao, "", operators)
                    self.assertTrue(matched)
                    self.assertEqual(op["icao"], code)
                    cabin = resolve_cabin(op["icao"], typecode, self.layouts)
                    self.assertEqual((cabin["source"], cabin["total"]), ("curated", capacity))

    def test_unique_keys_and_seat_totals(self):
        path = ROOT / "data/cabin_layouts.json"
        layouts = json.loads(path.read_text("utf-8"), object_pairs_hook=unique_keys)
        for group in ("by_operator_type", "fallback_by_type"):
            for key, cabin in layouts[group].items():
                if key.startswith("_"):
                    continue
                with self.subTest(key=key):
                    counts = re.findall(r"(?:^|\+)\s*(\d+)\s*[FCWY]\b", cabin["layout"])
                    if counts:
                        self.assertEqual(sum(map(int, counts)), cabin["total"])

    def test_published_cabins_match_source(self):
        lookup = json.loads((PUBLIC / "cabin_layouts.json").read_text("utf-8"))
        for group in ("by_operator_type", "fallback_by_type"):
            self.assertEqual(lookup[group], {k: v for k, v in self.layouts[group].items()
                                             if v.get("layout")})

        rows = json.loads((PUBLIC / "aircraft.json").read_text("utf-8"))
        columns = json.loads((PUBLIC / "aircraft.col.json").read_text("utf-8"))
        self.assertEqual(len(rows), len(columns["cabin"]))
        for index, row in enumerate(rows):
            cabin = published_cabin(row, lookup)
            self.assertEqual(row.get("cabin", {}), cabin, row["reg"])
            self.assertEqual(columns["columns"]["reg"][index], row["reg"])
            self.assertEqual(columns["cabin_dict"][columns["cabin"][index]], cabin, row["reg"])
