import copy
import tempfile
import unittest
from pathlib import Path
from partner_acceptance import expected_cases, validate_receipt


class PartnerReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.output = Path(self.temporary.name)
        self.receipt = {"cases": []}
        for role, width, screen in sorted(expected_cases()):
            name = f"{role}-{screen}-{width}.png"
            (self.output / name).write_bytes(b"\x89PNG\r\n\x1a\nfixture")
            self.receipt["cases"].append({"role": role, "width": width, "screen": screen, "status": "passed", "screenshot": name})

    def test_complete_matrix(self):
        self.assertEqual(len(validate_receipt(self.receipt, self.output)), 74)
        self.assertIn(("biz", 1024, "catalog"), expected_cases())
        self.assertIn(("blocked", 390, "denied-field"), expected_cases())

    def test_missing_case(self):
        self.receipt["cases"].pop()
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)

    def test_duplicate_case(self):
        self.receipt["cases"].append(copy.deepcopy(self.receipt["cases"][0]))
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)

    def test_failed_case(self):
        self.receipt["cases"][0]["status"] = "failed"
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)

    def test_missing_image(self):
        (self.output / self.receipt["cases"][0]["screenshot"]).unlink()
        with self.assertRaises(FileNotFoundError):
            validate_receipt(self.receipt, self.output)

    def test_bad_image(self):
        (self.output / self.receipt["cases"][0]["screenshot"]).write_bytes(b"not a PNG")
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)

    def test_duplicate_image(self):
        self.receipt["cases"][1]["screenshot"] = self.receipt["cases"][0]["screenshot"]
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)

    def test_path_escape(self):
        self.receipt["cases"][0]["screenshot"] = "../other.png"
        with self.assertRaises(AssertionError):
            validate_receipt(self.receipt, self.output)


if __name__ == "__main__":
    unittest.main()
