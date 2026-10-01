"""Fail-closed receipt checks, independent of browser tooling."""
from pathlib import Path
import hashlib
import re

WIDTHS = (320, 390, 768, 1440)
CASES = ("guest", "biz", "admin", "pending", "blocked")
GUEST_STATES = ("home", "services", "contact", "catalog", "device", "catalog-empty",
                "device-not-found", "login", "registration", "registration-invalid",
                "registration-retry", "registration-received")


def validate_session(status: int, payload: object, identity: dict | None = None) -> None:
    if status != 200:
        raise AssertionError(f"Auth session endpoint returned HTTP {status}, not 200")
    if identity is None:
        if payload is not None:
            raise AssertionError("Guest unexpectedly has a session or malformed auth payload")
    elif not isinstance(payload, dict) or not isinstance(payload.get("user"), dict):
        raise AssertionError("Authenticated session is missing")
    elif any(payload["user"].get(key) != identity[key] for key in ("id", "email", "role")):
        raise AssertionError("Session identity differs from the requested fixture account")


def validate_server_log(text: str) -> None:
    # Expected CredentialsSignin entries arise from the two rejection scenarios.
    clean = re.sub(r"\x1b\[[0-9;]*m", "", text)
    errors = re.findall(r"\[auth\]\[error\]\s*(\w+)", clean)
    unexpected = sorted(set(errors) - {"CredentialsSignin"})
    if unexpected or "Public catalog read failed" in clean or "UntrustedHost" in clean:
        raise AssertionError(f"Public proof contains server/auth failures: {unexpected}")


def expected_screenshots() -> set[str]:
    names = {f"{state}-{width}.png" for state in GUEST_STATES for width in WIDTHS}
    names |= {f"menu-{width}.png" for width in WIDTHS if width < 1024}
    names |= {f"role-{case}-{state}-{width}.png" for case in CASES
              for state in ("catalog", "device") for width in WIDTHS}
    names |= {f"role-{case}-login-denied-{width}.png"
              for case in ("pending", "blocked") for width in WIDTHS}
    return names


def validate_evidence(output: Path, guest: dict, cases: list[dict], sha: str) -> dict[str, str]:
    if guest.get("status") != "passed" or guest.get("checkout_sha") != sha or guest.get("failed_viewports") != []:
        raise AssertionError("Guest receipt failed or belongs to another checkout")
    widths = [entry.get("width") for entry in guest.get("viewports", [])]
    if sorted(widths) != list(WIDTHS):
        raise AssertionError("Guest viewport matrix is incomplete or duplicated")
    expected_cases = {(case, width) for case in CASES for width in WIDTHS}
    actual_cases = [(entry.get("case"), entry.get("width")) for entry in cases]
    if len(actual_cases) != len(expected_cases) or set(actual_cases) != expected_cases:
        raise AssertionError("Role/viewport matrix is incomplete or duplicated")
    if any(entry.get("status") != "passed" for entry in cases):
        raise AssertionError("At least one role/viewport failed")
    actual = {file.name for file in output.glob("*.png")}
    if actual != expected_screenshots():
        raise AssertionError(f"Screenshot set differs: missing={sorted(expected_screenshots()-actual)}, unexpected={sorted(actual-expected_screenshots())}")
    checksums = {name: hashlib.sha256((output / name).read_bytes()).hexdigest() for name in sorted(actual)}
    for name, digest in guest.get("screenshots", {}).items():
        if checksums.get(name) != digest:
            raise AssertionError("Guest screenshot changed after its receipt was written")
    return checksums
