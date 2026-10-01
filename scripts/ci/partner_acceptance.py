"""Read-only acceptance of real partner/Field routes in the disposable CI store.

Credentials login and protected reads are real. Only the explicit catalog-error
case intercepts a response. No order, payment, SMTP, profile or RMA write occurs.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import traceback
from urllib.parse import urlsplit

BASE = "http://127.0.0.1:3000"
OUTPUT = Path("artifacts/partner-presentation")
WIDTHS = (320, 390, 768, 1024, 1440)
SCREENS = ("dashboard", "catalog", "catalog-empty", "field", "ladder", "orders", "repairs", "repair-form", "settings")
ROUTES = {"dashboard": "/dashboard", "catalog": "/oferty", "orders": "/oferty/zamowienia", "repairs": "/oferty/naprawy", "settings": "/ustawienia", "field": "/field"}


def expected_cases():
    result = {(role, width, screen) for role, screens in (("biz", SCREENS), ("admin", ("field",))) for width in WIDTHS for screen in screens}
    result |= {(role, 390, "denied-" + screen) for role in ("guest", "pending", "blocked", "admin") for screen in ROUTES if role != "admin" or screen != "field"}
    result.add(("biz", 390, "catalog-error-retry"))
    return result


def validate_receipt(receipt, output):
    cases = receipt["cases"]
    keys = [(item["role"], item["width"], item["screen"]) for item in cases]
    if len(keys) != len(set(keys)) or set(keys) != expected_cases():
        raise AssertionError("Missing, duplicate or unexpected partner cases")
    hashes = {}
    for item in cases:
        if item["status"] != "passed":
            raise AssertionError("Partner case failed")
        name = item["screenshot"]
        if Path(name).name != name or not name.endswith(".png") or name in hashes:
            raise AssertionError("Invalid or duplicate screenshot identity")
        image = (output / name).read_bytes()
        if not image.startswith(b"\x89PNG\r\n\x1a\n"):
            raise AssertionError("Invalid screenshot")
        hashes[name] = hashlib.sha256(image).hexdigest()
    return hashes


def geometry(page):
    result = page.evaluate("""() => {
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const controls = [...document.querySelectorAll('main button, main input, main textarea')].filter(visible).map(e => {
        const r = e.getBoundingClientRect();
        let clipped = false;
        for (let p=e.parentElement; p; p=p.parentElement) {
          const style=getComputedStyle(p), box=p.getBoundingClientRect();
          if (['hidden','clip','auto','scroll'].includes(style.overflowX) && (r.left < box.left-1 || r.right > box.right+1)) clipped=true;
        }
        return {label: e.innerText || e.getAttribute('aria-label') || e.tagName, left:r.left, right:r.right, height:r.height, width:r.width, clipped};
      });
      return {viewport:innerWidth, document:document.documentElement.scrollWidth, controls};
    }""")
    if result["document"] > result["viewport"] + 1:
        raise AssertionError(f"Page overflows horizontally: {result}")
    invalid = [c for c in result["controls"] if c["left"] < -1 or c["right"] > result["viewport"] + 1 or c["height"] < 43 or c["width"] < 43 or c["clipped"]]
    if invalid:
        raise AssertionError(f"Clipped or undersized primary controls: {invalid}")


def visit(page, path):
    response = page.goto(BASE + path, wait_until="networkidle", timeout=30000)
    if response is None or response.status >= 400:
        raise AssertionError(f"Navigation failed: {path}")
    page.evaluate("document.fonts.ready")


def authenticated_state(browser, fixture, role):
    from playwright.sync_api import expect
    context = browser.new_context()
    try:
        page = context.new_page()
        visit(page, "/logowanie")
        page.locator("#login-email").fill(fixture["accounts"][role]["email"])
        page.locator("#login-password").fill(fixture["password"])
        page.get_by_role("button", name="Zaloguj się", exact=True).click()
        expect(page).to_have_url(BASE + ("/admin" if role == "admin" else "/"), timeout=30000)
        response = context.request.get(BASE + "/api/auth/session")
        if response.status != 200 or response.json().get("user", {}).get("email") != fixture["accounts"][role]["email"]:
            raise AssertionError("Real partner credentials session was not established")
        return context.storage_state()
    finally:
        context.close()


def exercise(page, role, screen, fixture):
    from playwright.sync_api import expect
    product = fixture["product"]
    if screen.startswith("denied-"):
        visit(page, ROUTES[screen.removeprefix("denied-")])
        if urlsplit(page.url).path != "/logowanie":
            raise AssertionError("Protected workspace accepted an ineligible account")
        expect(page.locator("#login-email")).to_be_visible()
        return
    route = {"catalog-empty": "catalog", "catalog-error-retry": "catalog", "ladder": "field", "repair-form": "repairs"}.get(screen, screen)
    intercepted = []
    def fail_catalog(request):
        intercepted.append(True)
        request.fulfill(status=503, content_type="application/json", body='{"error":"CI controlled outage"}')
    if screen == "catalog-error-retry":
        page.route(BASE + "/api/products", fail_catalog)
    visit(page, ROUTES[route])
    if urlsplit(page.url).path != ROUTES[route]:
        raise AssertionError(f"Unexpected workspace redirect: {screen}")
    main = page.locator("main")
    if screen == "dashboard":
        expect(main.locator("h1")).to_contain_text("konto demonstracyjne biz")
        expect(main.get_by_role("link", name="Otwórz katalog partnera")).to_be_visible()
    elif screen in ("catalog", "catalog-empty", "catalog-error-retry"):
        expect(main.get_by_role("heading", name="Produkty i zapytania")).to_be_visible()
        if screen == "catalog-error-retry":
            expect(main.get_by_role("alert")).to_contain_text("Nie udało się pobrać katalogu")
            expect(main.get_by_text("Brak produktów", exact=True)).to_have_count(0)
            if not intercepted:
                raise AssertionError("Controlled outage did not intercept the real catalog request")
            geometry(page)
            page.screenshot(path=str(OUTPUT / "controlled-catalog-error-390.png"), full_page=True)
            page.unroute(BASE + "/api/products", fail_catalog)
            main.get_by_role("button", name="Spróbuj ponownie", exact=True).click()
        search = main.get_by_role("textbox", name="Szukaj w katalogu", exact=True)
        expect(search).to_be_visible()
        search.fill("CI-NO-MATCH-928413" if screen == "catalog-empty" else product["sku"])
        if screen == "catalog-empty":
            expect(main.get_by_text("Brak produktów", exact=True)).to_be_visible()
            expect(main.locator("article")).to_have_count(0)
        else:
            expect(main.locator("article")).to_have_count(1)
            expect(main.locator("article")).to_contain_text("83,00 zł netto")
            expect(main.get_by_role("button", name="Dodaj", exact=True)).to_be_enabled()
    elif screen in ("field", "ladder"):
        main.get_by_role("textbox", name="Szukaj urządzenia", exact=True).fill(product["sku"])
        expect(main.get_by_role("heading", name=product["sku"], exact=True)).to_be_visible()
        expect(main.get_by_role("region", name="Wyniki wyszukiwania").get_by_role("button")).to_have_count(1)
        detail = main.locator("section").nth(1)
        expect(detail).to_contain_text("100,00 zł netto" if role == "admin" else "83,00 zł netto")
        expect(detail).to_contain_text("Brak zweryfikowanej instrukcji krok po kroku")
        if screen == "ladder":
            main.get_by_role("button", name="Tryb drabiny", exact=True).click()
            expect(main.get_by_role("button", name="Tryb drabiny", exact=True)).to_have_attribute("aria-pressed", "true")
            expect(main.get_by_role("heading", name="Opis źródłowy", exact=True)).to_have_count(0)
    elif screen == "orders":
        expect(main.get_by_text("Brak zamówień", exact=True)).to_be_visible()
    elif screen in ("repairs", "repair-form"):
        expect(main.get_by_text("Nie masz jeszcze zgłoszeń serwisowych.", exact=True)).to_be_visible()
        if screen == "repair-form":
            main.get_by_role("button", name="Nowe zgłoszenie", exact=True).click()
            expect(main.get_by_role("textbox", name="Model urządzenia", exact=True)).to_be_visible()
            expect(main.get_by_role("button", name="Wyślij do serwisu", exact=True)).to_be_enabled()
    elif screen == "settings":
        expect(main.get_by_role("heading", name="Dane firmy i kontakt", exact=True)).to_be_visible()
        expect(main.get_by_role("textbox", name="Telefon kontaktowy", exact=True)).to_be_visible()
        expect(main).to_contain_text(fixture["accounts"]["biz"]["email"])
        expect(main).to_contain_text("17.0%")


def main():
    from playwright.sync_api import sync_playwright
    fixture_root = Path(".ci/public-proof").resolve()
    if os.getenv("CI") != "true" or Path(os.getenv("CELTRONICS_DB_PATH", "")).resolve() != fixture_root / "db.json" or Path(os.getenv("CELTRONICS_UPLOAD_ROOT", "")).resolve() != fixture_root / "uploads":
        raise RuntimeError("Partner proof requires its explicit disposable CI paths")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    fixture = json.loads((fixture_root / "identities.json").read_text())
    sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    seed = Path("src/data/db.json")
    seed_hash = hashlib.sha256(seed.read_bytes()).hexdigest()
    receipt = {"schema_version": 1, "checkout_sha": sha, "run_id": os.getenv("GITHUB_RUN_ID"), "status": "failed", "cases": [], "scope": "real credentials and read-only partner/Field pages; empty orders/RMA fixtures; no commerce lifecycle or deployment acceptance", "visual_acceptance": "review candidates, not owner-approved baselines"}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            receipt["browser"] = browser.version
            try:
                states = {role: authenticated_state(browser, fixture, role) for role in ("biz", "admin")}
                for role, width, screen in sorted(expected_cases()):
                    context = browser.new_context(viewport={"width": width, "height": 1000 if width >= 768 else 844}, storage_state=states.get(role), locale="pl-PL", color_scheme="light", reduced_motion="reduce")
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    def inspect(response):
                        controlled = screen == "catalog-error-retry" and response.url == BASE + "/api/products" and response.status == 503
                        if response.status >= 400 and "/api/" in response.url and not controlled:
                            errors.append(f"Unexpected HTTP {response.status}: {response.url.split('?')[0]}")
                    page.on("response", inspect)
                    if role in ("pending", "blocked"):
                        context.add_cookies([{"name": "authjs.session-token", "value": fixture["accounts"][role]["staleCookie"], "url": BASE, "httpOnly": True, "sameSite": "Lax"}])
                    item = {"role": role, "width": width, "screen": screen, "status": "failed", "screenshot": f"{role}-{screen}-{width}.png"}
                    try:
                        exercise(page, role, screen, fixture)
                        if errors:
                            raise AssertionError(f"Browser errors: {errors}")
                        if not screen.startswith("denied-"):
                            geometry(page)
                        page.screenshot(path=str(OUTPUT / item["screenshot"]), full_page=True)
                        item["status"] = "passed"
                    except Exception:
                        item["error"] = traceback.format_exc()
                        page.screenshot(path=str(OUTPUT / ("failure-" + item["screenshot"])), full_page=True)
                    finally:
                        receipt["cases"].append(item)
                        context.close()
            finally:
                browser.close()
        receipt["screenshots"] = validate_receipt(receipt, OUTPUT)
        if hashlib.sha256(seed.read_bytes()).hexdigest() != seed_hash:
            raise AssertionError("Repository seed changed during partner proof")
        receipt["repository_seed_unchanged"] = True
        receipt["status"] = "passed"
        print(f"Partner acceptance PASS: {len(receipt['cases'])} cases")
    finally:
        (OUTPUT / "acceptance.json").write_text(json.dumps(receipt, indent=2) + "\n")


if __name__ == "__main__":
    main()
