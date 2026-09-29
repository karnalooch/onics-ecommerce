from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

MODULE_PATH = Path(__file__).with_name("onics_ci_plan.py")
SPEC = importlib.util.spec_from_file_location("onics_ci_plan", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
plan = MODULE.plan


class OnicsCiPlanTests(unittest.TestCase):
    def test_gumball_candidate_is_platform_only(self):
        result = plan([".gumball/candidates/example.json"])
        self.assertEqual(result.required_checks, ["Gumball consumer gate"])

    def test_docs_only_is_platform_only(self):
        result = plan(["README.md", "docs/ui-architecture.md"])
        self.assertEqual(result.required_checks, ["Gumball consumer gate"])

    def test_backend_change_runs_platform_only(self):
        result = plan(["src/lib/payments.ts"])
        self.assertEqual(
            result.required_checks,
            ["Gumball consumer gate", "validate-platform-audit"],
        )

    def test_public_ui_runs_platform_and_site(self):
        result = plan(["src/app/sklep/page.tsx"])
        self.assertEqual(
            result.required_checks,
            [
                "Gumball consumer gate",
                "validate-platform-audit",
                "validate-public-site",
            ],
        )

    def test_docker_integration_runs_docker(self):
        result = plan(["Dockerfile"])
        self.assertEqual(
            result.required_checks,
            ["Gumball consumer gate", "docker-runtime"],
        )

    def test_auth_bootstrap_runs_docker_and_platform(self):
        result = plan(["src/auth.ts"])
        self.assertEqual(
            result.required_checks,
            ["Gumball consumer gate", "docker-runtime"],
        )

    def test_ci_change_fails_safe_to_all_local_checks(self):
        result = plan([".github/workflows/aggregate-ci-gate.yml"])
        self.assertEqual(
            result.required_checks,
            [
                "Gumball consumer gate",
                "validate-platform-audit",
                "validate-public-site",
                "docker-runtime",
            ],
        )

    def test_package_change_fails_safe_to_all_local_checks(self):
        result = plan(["package-lock.json"])
        self.assertTrue(result.platform)
        self.assertTrue(result.site)
        self.assertTrue(result.docker)

    def test_unknown_or_empty_fails_safe(self):
        for paths in ([], ["__UNKNOWN__"]):
            result = plan(paths)
            self.assertEqual(
                result.required_checks,
                [
                    "Gumball consumer gate",
                    "validate-platform-audit",
                    "validate-public-site",
                    "docker-runtime",
                ],
            )

    def test_mixed_docs_and_backend_does_not_hide_backend(self):
        result = plan(["docs/README.md", "src/lib/commerce.ts"])
        self.assertEqual(
            result.required_checks,
            ["Gumball consumer gate", "validate-platform-audit"],
        )


if __name__ == "__main__":
    unittest.main()
