from __future__ import annotations

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


class OnicsCiWiringTests(unittest.TestCase):
    def test_aggregate_forces_full_proof_for_control_plane_changes(self):
        workflow = read(".github/workflows/aggregate-ci-gate.yml")
        self.assertIn("scripts/ci/onics_ci_plan.py --checks", workflow)
        self.assertIn("grep -Eq '^(\\.github/|scripts/ci/)'", workflow)
        for check in (
            "Gumball consumer gate",
            "validate-platform-audit",
            "validate-public-site",
            "docker-runtime",
        ):
            self.assertIn(f'"{check}"', workflow)

    def test_platform_filter_skips_only_docs_gumball_and_pure_docker_surfaces(self):
        workflow = read(".github/workflows/platform-audit-ci.yml")
        for marker in (
            'paths-ignore:',
            '"**/*.md"',
            '".gumball/**"',
            '"gumball.yaml"',
            '"Dockerfile"',
            '"compose.yaml"',
            '"scripts/docker/**"',
        ):
            self.assertIn(marker, workflow)
        self.assertGreaterEqual(workflow.count('"Dockerfile"'), 2)
        self.assertGreaterEqual(workflow.count('"scripts/docker/**"'), 2)

    def test_site_filter_covers_control_and_public_ui_surfaces(self):
        workflow = read(".github/workflows/site-pr-ci.yml")
        for marker in (
            '".github/workflows/**"',
            '"scripts/ci/**"',
            '"package-lock.json"',
            '"next.config.*"',
            '".node-version"',
            '".nvmrc"',
            '"tsconfig.json"',
            '"src/app/sklep/**"',
            '"src/components/**"',
        ):
            self.assertGreaterEqual(workflow.count(marker), 2)

    def test_docker_filter_covers_control_toolchain_and_runtime_surfaces(self):
        workflow = read(".github/workflows/docker-runtime-ci.yml")
        for marker in (
            '".github/workflows/**"',
            '"scripts/ci/**"',
            '"package-lock.json"',
            '"next.config.*"',
            '".node-version"',
            '".nvmrc"',
            '"Dockerfile"',
            '"scripts/docker/**"',
            '"src/auth.ts"',
            '"src/lib/adminBootstrap.ts"',
            '"src/app/api/health/**"',
            '"src/app/admin/_components/AdminNavigation.tsx"',
        ):
            self.assertGreaterEqual(workflow.count(marker), 2)

    def test_expensive_local_lanes_cancel_superseded_runs(self):
        for path in (
            ".github/workflows/aggregate-ci-gate.yml",
            ".github/workflows/platform-audit-ci.yml",
            ".github/workflows/site-pr-ci.yml",
            ".github/workflows/docker-runtime-ci.yml",
        ):
            workflow = read(path)
            self.assertIn("concurrency:", workflow, path)
            self.assertIn("cancel-in-progress: true", workflow, path)

    def test_gumball_marks_local_ci_policy_high_risk(self):
        workflow = read(".github/workflows/gumball-consumer-ci.yml")
        self.assertIn("scripts/ci/**", workflow)
        self.assertIn("Validate ONICS CI cost-routing contracts", workflow)


if __name__ == "__main__":
    unittest.main()
