import hashlib
from pathlib import Path
import tempfile
import unittest
from public_proof_contract import CASES, WIDTHS, expected_screenshots, validate_evidence, validate_server_log, validate_session


class PublicProofContractTests(unittest.TestCase):
    def test_guest_requires_healthy_null_session(self):
        validate_session(200, None)
        for status, payload in [(500, None), (200, {}), (200, {"user": {"id": "other"}})]:
            with self.assertRaises(AssertionError):
                validate_session(status, payload)

    def test_session_requires_exact_identity(self):
        identity = {"id": "fixture", "email": "fixture@example.invalid", "role": "BIZ"}
        validate_session(200, {"user": identity}, identity)
        for payload in (None, {}, {"user": {**identity, "id": "other"}}, {"user": {**identity, "role": "ADMIN"}}):
            with self.assertRaises(AssertionError):
                validate_session(200, payload, identity)

    def test_expected_credential_denial_is_not_infrastructure_failure(self):
        validate_server_log("[auth][error] CredentialsSignin: expected rejection")

    def test_auth_and_catalog_failures_block_acceptance(self):
        for text in ("[auth][error] UntrustedHost: failure", "[auth][error] JWTSessionError: failure",
                     "Public catalog read failed reference", "\x1b[31m[auth][error]\x1b[0m MissingSecret: failure"):
            with self.assertRaises(AssertionError):
                validate_server_log(text)

    def test_receipt_requires_exact_matrix_files_and_hashes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in expected_screenshots():
                (root / name).write_bytes(b"fixture png")
            guest = {"status": "passed", "checkout_sha": "sha", "failed_viewports": [],
                     "viewports": [{"width": width} for width in WIDTHS],
                     "screenshots": {"home-320.png": hashlib.sha256(b"fixture png").hexdigest()}}
            cases = [{"case": case, "width": width, "status": "passed"} for case in CASES for width in WIDTHS]
            self.assertEqual(len(validate_evidence(root, guest, cases, "sha")), 99)
            invalid = [({**guest, "status": "failed"}, cases, "sha"),
                       (guest, cases, "other-sha"), (guest, cases[:-1], "sha"),
                       (guest, cases[:-1] + [cases[0]], "sha"),
                       (guest, [{**case, "status": "failed"} for case in cases], "sha"),
                       ({**guest, "viewports": []}, cases, "sha")]
            for receipt, matrix, sha in invalid:
                with self.assertRaises(AssertionError):
                    validate_evidence(root, receipt, matrix, sha)
            (root / "home-320.png").write_bytes(b"changed")
            with self.assertRaises(AssertionError):
                validate_evidence(root, guest, cases, "sha")
            (root / "home-320.png").unlink()
            with self.assertRaises(AssertionError):
                validate_evidence(root, guest, cases, "sha")


if __name__ == "__main__":
    unittest.main()
