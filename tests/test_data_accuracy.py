import unittest
from urllib.parse import urlsplit

from scripts.build_data import (
    OUT_AIRCRAFT, OUT_DIR, OUT_META, ROOT, airframe_address, load_json,
    public_data_version, registration_key, resolve_cabin, resolve_operator, select_record,
)


class IdentityTests(unittest.TestCase):
    def test_registration_and_address_normalization(self):
        self.assertEqual(registration_key("B32-C2"), "B-32C2")
        self.assertEqual(registration_key(" B227W "), "B-227W")
        self.assertEqual(registration_key("1997-08-29"), "")
        self.assertEqual(airframe_address("A200BA"), "a200ba")
        self.assertEqual(airframe_address("a200b"), "")

    def test_same_registration_different_airframes_need_evidence(self):
        reg = "B-227W"
        first = {"reg": reg, "icao24": "7820fc", "type": "B38M", "model": "737 MAX 8"}
        second = {"reg": reg, "icao24": "782320", "type": "B77L", "model": "777F"}
        types = {"B38M": {}, "B77L": {}}
        self.assertEqual(select_record(reg, [first], [second], None, [], "", types)["registration_status"],
                         "conflict")
        manual = {"match_icao24": second["icao24"], "fields": {"operator_icao": "HLF"}}
        verified = select_record(reg, [first], [second], manual, [], "", types)
        self.assertEqual((verified["type"], verified["operator_icao"]), ("B77L", "HLF"))

    def test_latest_registry_correction_is_guarded_by_serial_and_date(self):
        row = {"reg": "N310NW", "serial": "00121", "type": "A320", "icao24": "a34812",
               "operator_icao": "DAL", "model": "A320-211"}
        correction = {"match_serial": "121", "registration_status": "reassigned", "type": "",
                      "icao24": row["icao24"], "model": "DJI AGRAS T50", "serial": "NEW"}
        res = select_record(row["reg"], [row], [], None, [correction], "2026-11-27", {"A320": {}})
        self.assertNotIn("operator_icao", res)
        self.assertEqual(res["model"], "DJI AGRAS T50")
        for different in ({"serial": "122"}, {"registered": "2026-11-29"}):
            retained = select_record(row["reg"], [{**row, **different}], [], None, [correction],
                                     "2026-11-27", {"A320": {}})
            self.assertEqual(retained["model"], "A320-211")

    def test_merge_requires_the_same_address(self):
        source = {"reg": "G-TEST", "icao24": "401234", "type": "", "model": ""}
        supplement = {"reg": "G-TEST", "icao24": "401234", "type": "BCS3", "model": "A220-300", "built": ""}
        types = {"BCS3": {}, "A319": {}}
        fill = select_record(source["reg"], [source], [supplement], None, [], "", types)
        self.assertEqual(fill["type"], "BCS3")
        disputed = select_record(source["reg"], [{**source, "type": "A319"}], [supplement],
                                 None, [], "", types)
        self.assertTrue(disputed["type_disputed"])

    def test_airline_aliases_use_the_verified_identity(self):
        ops = load_json(ROOT / "data/operators.json")
        for name, original, correct in (
            ("FlyArystan", "FLZ", "AYN"), ("Skymark Airlines", "SNJ", "SKY"),
            ("Pobeda", "AUL", "PBD"), ("Colorful Guizhou Airlines", "GDC", "CGZ"),
            ("Sky Airline Peru", "TPU", "SKX"), ("Tianjin Air Cargo", "CTJ", "CTJ"),
            ("Air Japan", "AJX", "AJX"), ("YTO Cargo Airlines", "HYT", "HYT"),
        ):
            with self.subTest(operator=name):
                self.assertEqual(resolve_operator(name, "", original, "", ops)[0]["icao"], correct)


class PublishedAccuracyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = load_json(OUT_AIRCRAFT)
        cls.by_reg = {a["reg"]: a for a in cls.rows}
        cls.layouts = load_json(OUT_DIR / "cabin_layouts.json")
        cls.meta = load_json(OUT_META)

    def test_published_registrations_and_addresses(self):
        self.assertEqual(len(self.rows), len(self.by_reg))
        for row in self.rows:
            self.assertEqual(registration_key(row["reg"]), row["reg"])
            if row.get("icao24"):
                self.assertRegex(row["icao24"], r"^[a-f0-9]{6}$")
            if row.get("registration_status") in {"reassigned", "cancelled", "conflict"} or row.get("type_disputed"):
                self.assertNotIn("cabin", row, row["reg"])
        self.assertNotIn("B32-C2", self.by_reg)
        self.assertNotIn("1997-08-29", self.by_reg)

    def test_verified_registration_lookup(self):
        if (self.meta["snapshot_month"], self.meta["registry_sources"]["faa"]) != ("2025-08", "2026-11-27"):
            self.skipTest("Exact airframe examples belong to the audited registry snapshot")
        reassigned = self.by_reg["N310NW"]
        self.assertEqual((reassigned["model"], reassigned["registration_status"]), ("DJI AGRAS T50", "reassigned"))
        self.assertNotIn("operator_icao", reassigned)
        self.assertFalse(self.by_reg["N228WN"].get("retired"))
        self.assertEqual(self.by_reg["N228WN"]["icao24"], "a200ba")
        for reg, typecode, seats in (
            ("N37536", "B39M", 179), ("N8713M", "B738", 175),
            ("N920FD", "B752", 0), ("N3123J", "BCS3", 140),
            ("B-227W", "B77L", 0), ("B-30FP", "A20N", 174), ("B-MCK", "A20N", 158),
        ):
            with self.subTest(reg=reg):
                row = self.by_reg[reg]
                self.assertEqual((row["type"], row["cabin"]["total"]), (typecode, seats))
        self.assertEqual(self.by_reg["B-227W"]["category"], "freighter")

    def test_macao_register_and_e175_variants(self):
        registry = load_json(ROOT / "data/airframe_corrections.json")["macao"]["by_registration"]
        for reg, item in registry.items():
            row = self.by_reg.get(reg)
            if row and row.get("type") == item["type"]:
                self.assertEqual(row["region"], "macau", reg)
                if "operator_icao" in item:
                    self.assertEqual(row["operator_icao"], "AMU", reg)
        for typecode in ("E75L", "E75S"):
            self.assertEqual(resolve_cabin("ENY", typecode, self.layouts)["total"], 76)
            matches = [a for a in self.rows if a.get("type") == typecode and not a.get("type_disputed")]
            self.assertTrue(all(a["category"] == "regional" for a in matches))

    def test_seat_maps_and_content_version(self):
        sources = load_json(ROOT / "data/seat_maps.json")
        maps = self.layouts["seat_maps"]
        self.assertEqual(maps, {k: v for k, v in sources.items() if not k.startswith("_")})
        self.assertEqual(len(maps["by_operator_type"]["CSZ:A20N"]), 3)
        for urls in (maps["by_operator"].values(),
                     (x["url"] for group in maps["by_operator_type"].values() for x in group)):
            for url in urls:
                address = urlsplit(url)
                self.assertTrue(address.scheme == "https" and address.hostname and not address.fragment, url)
        self.assertEqual(resolve_cabin("AAL", "CRJ9", self.layouts)["total"], 76)
        self.assertEqual(self.meta["data_version"], public_data_version())


if __name__ == "__main__":
    unittest.main()
