#!/usr/bin/env python3
"""Plan the smallest trustworthy ONICS CI proof set for changed paths."""

from __future__ import annotations

import argparse
import fnmatch
import json
import sys
from dataclasses import asdict, dataclass

ALL_LOCAL_CHECKS = (
    "validate-platform-audit",
    "validate-public-site",
    "docker-runtime",
)

BROAD_CONTROL_PATTERNS = (
    ".github/**",
    "scripts/ci/**",
    "package.json",
    "package-lock.json",
    "next.config.*",
    ".node-version",
    ".nvmrc",
)

PLATFORM_ONLY_PATTERNS = (
    ".gumball/**",
    "gumball.yaml",
    "templates/release-manifest.json",
)

SITE_PATTERNS = (
    "tsconfig.json",
    "eslint.config.*",
    "vitest.config.*",
    "src/app/page.tsx",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/app/kontakt/**",
    "src/app/logowanie/**",
    "src/app/produkty/**",
    "src/app/rejestracja/**",
    "src/app/sklep/**",
    "src/app/uslugi/**",
    "src/components/**",
)

DOCKER_ONLY_PATTERNS = (
    "Dockerfile",
    ".dockerignore",
    "compose.yaml",
    "docker-compose*.yml",
    "START-ONICS.bat",
    "start-onics.ps1",
    "scripts/docker/**",
)

DOCKER_PATTERNS = (
    *DOCKER_ONLY_PATTERNS,
    "src/auth.ts",
    "src/lib/adminBootstrap.ts",
    "src/lib/health.ts",
    "src/lib/storageConfig.ts",
    "src/app/api/auth/**",
    "src/app/api/health/**",
    "src/app/admin/page.tsx",
    "src/app/admin/layout.tsx",
    "src/app/admin/_components/AdminNavigation.tsx",
    "src/app/logowanie/**",
)


@dataclass(frozen=True)
class Plan:
    platform: bool
    site: bool
    docker: bool
    reason: str

    @property
    def required_checks(self) -> list[str]:
        checks = ["Gumball consumer gate"]
        if self.platform:
            checks.append("validate-platform-audit")
        if self.site:
            checks.append("validate-public-site")
        if self.docker:
            checks.append("docker-runtime")
        return checks


def matches(path: str, patterns: tuple[str, ...]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)


def is_docs_or_platform_only(path: str) -> bool:
    return (
        path.endswith(".md")
        or path.startswith("docs/")
        or matches(path, PLATFORM_ONLY_PATTERNS)
    )


def plan(paths: list[str]) -> Plan:
    normalized = sorted({path.strip() for path in paths if path.strip()})
    if not normalized or "__UNKNOWN__" in normalized:
        return Plan(True, True, True, "unknown or empty change set fails safe")

    if any(matches(path, BROAD_CONTROL_PATTERNS) for path in normalized):
        return Plan(True, True, True, "CI/toolchain/control-plane change")

    if all(is_docs_or_platform_only(path) for path in normalized):
        return Plan(False, False, False, "docs/Gumball-only change")

    site = any(matches(path, SITE_PATTERNS) for path in normalized)
    docker = any(matches(path, DOCKER_PATTERNS) for path in normalized)

    platform = any(
        (
            path.startswith("src/")
            or path.startswith("scripts/")
            or path.startswith("fixtures/")
            or path.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"))
        )
        and not matches(path, DOCKER_ONLY_PATTERNS)
        for path in normalized
        if not is_docs_or_platform_only(path)
    )

    # Unknown non-documentation files fail safe to the application audit.
    if not platform and not site and not docker:
        platform = True

    return Plan(platform, site, docker, "affected-surface routing")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checks", action="store_true")
    args = parser.parse_args(argv)

    paths = [line.rstrip("\n") for line in sys.stdin]
    result = plan(paths)

    if args.checks:
        for check in result.required_checks:
            print(check)
        return 0

    print(json.dumps({**asdict(result), "required_checks": result.required_checks}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
