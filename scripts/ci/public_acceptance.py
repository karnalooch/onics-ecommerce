"""Guest + role acceptance of the built app; only disposable CI fixture accounts.

BIZ/ADMIN use the real credentials form. Pending/blocked login must be denied;
then an explicitly synthetic stale cookie checks current stored pricing authority.
No order, payment, registration, cart or production data mutation is performed.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import traceback
import urllib.request

from public_layout_contract import validate_catalog_actions
from public_proof_contract import CASES, validate_evidence, validate_server_log, validate_session

OUTPUT = Path("artifacts/public-presentation")
FIXTURE = Path(".ci/public-proof/identities.json")


def check_session(context, base_url: str, identity: dict | None = None) -> None:
    response = context.request.get(f"{base_url}/api/auth/session")
    validate_session(response.status, response.json(), identity)


def verify_case(browser, proof, fixture: dict, name: str, width: int, height: int) -> dict:
    from playwright.sync_api import expect
    context = browser.new_context(viewport={"width": width, "height": height},
        device_scale_factor=1, locale="pl-PL", color_scheme="light", reduced_motion="reduce")
    page = context.new_page()
    failures = []
    page.on("pageerror", lambda error: failures.append(str(error)))

    def inspect_response(response) -> None:
        path = response.url.split("?", 1)[0]
        expected_denial = (name in ("pending", "blocked") and
            path == f"{proof.BASE_URL}/api/auth/callback/credentials" and response.status == 401)
        if response.status >= 500 or ("/api/auth/" in path and response.status >= 400 and not expected_denial):
            failures.append(f"HTTP {response.status}: {path}")

    page.on("response", inspect_response)
    try:
        check_session(context, proof.BASE_URL)
        identity = fixture["accounts"].get(name)
        if identity:
            proof.visit(page, "/logowanie")
            page.locator("#login-email").fill(identity["email"])
            page.locator("#login-password").fill(fixture["password"])
            page.get_by_role("button", name="Zaloguj się", exact=True).click()
            if name in ("pending", "blocked"):
                expect(page.locator("main").get_by_role("alert")).to_contain_text("Nie udało się zalogować")
                expect(page.locator("#login-email")).to_have_value(identity["email"])
                expect(page.get_by_role("button", name="Zaloguj się", exact=True)).to_be_enabled()
                check_session(context, proof.BASE_URL)
                proof.capture(page, f"role-{name}-login-denied", width)
                context.add_cookies([{"name": "authjs.session-token", "value": identity["staleCookie"],
                    "url": proof.BASE_URL, "httpOnly": True, "sameSite": "Lax"}])
            else:
                destination = "/admin" if name == "admin" else "/"
                expect(page).to_have_url(proof.BASE_URL + destination, timeout=30000)
            check_session(context, proof.BASE_URL, identity)

        product = fixture["product"]
        proof.visit(page, f"/produkty?q={product['sku']}")
        expect(page.locator("main article")).to_have_count(1)
        expect(page.locator("main article h2")).to_contain_text(product["name"])
        validate_catalog_actions(
            page.locator("main").get_by_role("link", name="Wybrane produkty", exact=True).bounding_box(),
            page.locator("main").get_by_role("link", name="Wyczyść filtry", exact=True).bounding_box())
        for state in ("catalog", "device"):
            main = page.locator("main")
            button = main.get_by_role("button", name="Dodaj do koszyka", exact=True)
            if name in ("biz", "admin"):
                amount = "83,00" if name == "biz" else "100,00"
                expect(main.get_by_text(re.compile(rf"^{amount}\s*zł$"))).to_be_visible()
                expect(main.get_by_text("Cena netto", exact=True)).to_be_visible()
                expect(main.get_by_text("7 szt. — stan katalogowy", exact=True)).to_be_visible()
                expect(button).to_be_enabled()
            else:
                expect(main.get_by_text("Cena netto", exact=True)).to_have_count(0)
                expect(button).to_have_count(0)
                if name == "guest":
                    expect(main.get_by_role("link", name="Zaloguj się po ceny", exact=True)).to_be_visible()
                else:
                    expect(main.get_by_text("Warunki konta wymagają weryfikacji.", exact=True)).to_be_visible()
            proof.capture(page, f"role-{name}-{state}", width)
            if state == "catalog":
                page.locator("main article h2 a").click()
                expect(page.get_by_role("heading", name="Opis urządzenia", exact=True)).to_be_visible()
                expect(page.locator("main h1")).to_contain_text(product["name"])
        check_session(context, proof.BASE_URL, identity)
        if failures:
            raise AssertionError(f"Role browser failures: {failures}")
        return {"case": name, "width": width, "height": height, "status": "passed",
            "login": "anonymous" if name == "guest" else "denied" if name in ("pending", "blocked") else "real-credentials",
            "catalog_session": "synthetic-stale-approved" if name in ("pending", "blocked") else "anonymous" if name == "guest" else "real-credentials"}
    except Exception:
        (OUTPUT / f"failure-role-{name}-{width}.txt").write_text(traceback.format_exc(), encoding="utf8")
        page.screenshot(path=str(OUTPUT / f"failure-role-{name}-{width}.png"), full_page=True)
        raise
    finally:
        context.close()


def main() -> None:
    # Imports are deferred so receipt unit tests do not require a browser install.
    from playwright.sync_api import sync_playwright
    import public_visual_proof as proof
    if os.getenv("CI") != "true" or not FIXTURE.is_file():
        raise RuntimeError("Public acceptance requires the disposable CI fixture")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    seed = Path("src/data/db.json")
    seed_hash = hashlib.sha256(seed.read_bytes()).hexdigest()
    receipt = {"schema_version": 1, "checkout_sha": sha, "run_id": os.getenv("GITHUB_RUN_ID"),
        "status": "failed", "cases": [], "failures": [],
        "fixture": "isolated .ci store; synthetic identities/device; no production access",
        "registration": "browser-intercepted; no account creation",
        "visual_acceptance": "review candidates; not owner-approved screenshot baselines"}
    try:
        proof.wait_for_server()
        with urllib.request.urlopen(f"{proof.BASE_URL}/api/auth/session", timeout=10) as response:
            validate_session(response.status, json.load(response))
        proof.main()
        fixture = json.loads(FIXTURE.read_text(encoding="utf8"))
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            receipt["browser"] = browser.version
            try:
                for width, height in proof.VIEWPORTS:
                    for name in CASES:
                        try:
                            receipt["cases"].append(verify_case(browser, proof, fixture, name, width, height))
                        except Exception as error:
                            receipt["cases"].append({"case": name, "width": width, "height": height, "status": "failed"})
                            receipt["failures"].append(f"{name}/{width}: {error}")
            finally:
                browser.close()
        if receipt["failures"]:
            raise AssertionError("Public role matrix failed; inspect acceptance.json and failure artifacts")
        validate_server_log((OUTPUT / "server.log").read_text(encoding="utf8"))
        if hashlib.sha256(seed.read_bytes()).hexdigest() != seed_hash:
            raise AssertionError("The repository seed changed during browser proof")
        guest = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf8"))
        receipt["screenshots"] = validate_evidence(OUTPUT, guest, receipt["cases"], sha)
        receipt["logo_sha256"] = hashlib.sha256((OUTPUT / "celtronics.svg").read_bytes()).hexdigest()
        receipt["repository_seed_unchanged"] = True
        receipt["auth_server_log"] = "passed; expected CredentialsSignin denials only"
        receipt["status"] = "passed"
        print(f"Public acceptance PASS: {len(receipt['cases'])} role/viewport cases, {len(receipt['screenshots'])} screenshots")
    except Exception as error:
        receipt["error"] = str(error)
        raise
    finally:
        (OUTPUT / "acceptance.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
