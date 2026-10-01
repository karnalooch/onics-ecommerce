"""Built-site Chromium proof. Registration responses are mocked; no account is created."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import traceback
import urllib.error
import urllib.request
from playwright.sync_api import Browser, Page, expect, sync_playwright

BASE_URL = "http://127.0.0.1:3000"
OUTPUT = Path("artifacts/public-presentation")
VIEWPORTS = ((320, 740), (390, 844), (768, 1024), (1440, 1000))


def wait_for_server() -> None:
    for _ in range(60):
        try:
            with urllib.request.urlopen(BASE_URL, timeout=2) as response:
                if response.status == 200:
                    return
        except (urllib.error.URLError, TimeoutError):
            pass
        time.sleep(1)
    raise RuntimeError("Built public site did not become ready")


def visit(page: Page, path: str) -> None:
    response = page.goto(f"{BASE_URL}{path}", wait_until="networkidle", timeout=30000)
    if not response or response.status != 200:
        raise AssertionError(f"Public page {path} did not return HTTP 200")
    expect(page.locator("main h1")).to_have_count(1)


def capture(page: Page, name: str, width: int) -> None:
    page.evaluate("document.fonts.ready")
    page.wait_for_function("Array.from(document.querySelectorAll('header img')).every(img => img.complete && img.naturalWidth > 0)")
    actual = page.evaluate("document.documentElement.scrollWidth")
    if actual > width:
        raise AssertionError(f"Horizontal overflow: {actual}px at {width}px on {page.url}")
    expect(page.locator("main")).to_have_count(1)
    expect(page.locator("main h1")).to_have_count(1)
    logo = page.locator('header img[alt="CEL-TRONICS"]')
    expect(logo).to_have_attribute("src", "/assets/logo.svg")
    box = logo.bounding_box()
    if not box or abs(box["width"] / box["height"] - 2045 / 515) > .02:
        raise AssertionError("Logo aspect ratio changed")
    page.screenshot(path=str(OUTPUT / f"{name}-{width}.png"), full_page=True)


def verify_mobile_menu(page: Page, width: int) -> None:
    page.get_by_role("button", name="Otwórz menu").click()
    panel = page.locator("#public-menu")
    expect(panel).to_be_visible()
    expect(page.get_by_role("button", name="Zamknij menu")).to_have_attribute("aria-expanded", "true")
    capture(page, "menu", width)
    panel.get_by_role("link", name="Usługi", exact=True).focus()
    page.keyboard.press("Escape")
    expect(panel).to_be_hidden()
    expect(page.get_by_role("button", name="Otwórz menu")).to_be_focused()
    page.get_by_role("button", name="Otwórz menu").click()
    panel.get_by_role("link", name="Firma", exact=True).click()
    expect(panel).to_be_hidden()


def verify_company_pages(page: Page, width: int) -> None:
    visit(page, "/")
    expect(page.locator("#zakres-prac article")).to_have_count(6)
    capture(page, "home", width)
    page.keyboard.press("Tab")
    expect(page.get_by_role("link", name="Przejdź do treści")).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.locator("#public-content")).to_be_focused()
    if width < 1024:
        page.evaluate("window.scrollTo(0, 0)")
        verify_mobile_menu(page, width)
    page.get_by_role("link", name="Omów instalację", exact=True).click()
    expect(page).to_have_url(f"{BASE_URL}/kontakt")
    capture(page, "contact", width)
    expect(page.locator('main a[href^="mailto:"]')).not_to_have_count(0)
    visit(page, "/uslugi")
    expect(page.locator("main article")).to_have_count(6)
    capture(page, "services", width)


def verify_catalog(page: Page, width: int) -> None:
    visit(page, "/produkty")
    capture(page, "catalog", width)
    rows = page.locator("main article")
    count = rows.count()
    if count > 24:
        raise AssertionError("Catalog pagination output exceeded 24 records")
    if count:
        page.locator("main article h2 a").first.click()
        expect(page.get_by_role("heading", name="Opis urządzenia")).to_be_visible()
        capture(page, "device", width)
        page.get_by_role("link", name="Wróć do wyników").click()
        expect(page).to_have_url(f"{BASE_URL}/produkty")
    page.get_by_label("Szukaj urządzenia", exact=True).fill("CI-NO-MATCH-7cf5c1a7")
    page.get_by_role("button", name="Szukaj", exact=True).click()
    expect(page.get_by_role("heading", name="Brak produktów dla wybranych filtrów")).to_be_visible()
    expect(page.get_by_label("Szukaj urządzenia", exact=True)).to_have_value("CI-NO-MATCH-7cf5c1a7")
    capture(page, "catalog-empty", width)
    page.goto(f"{BASE_URL}/produkty/ci-missing-device-7cf5c1a7", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Nie znaleźliśmy tego urządzenia")).to_be_visible()
    capture(page, "device-not-found", width)


def verify_login(page: Page, width: int) -> None:
    visit(page, "/logowanie")
    capture(page, "login", width)
    password = page.locator("#login-password")
    password.fill("Proof-only-not-a-real-password")
    page.get_by_role("button", name="Pokaż", exact=True).click()
    expect(password).to_have_attribute("type", "text")
    page.get_by_role("button", name="Ukryj", exact=True).click()
    expect(password).to_have_attribute("type", "password")
    page.get_by_role("link", name="Załóż konto partnera", exact=True).click()
    expect(page).to_have_url(f"{BASE_URL}/rejestracja")


def verify_registration(page: Page, width: int) -> None:
    capture(page, "registration", width)
    submit = page.get_by_role("button", name="Wyślij zgłoszenie", exact=True)
    submit.click()
    # Next's route announcer is also an alert; assertions concern the actual form.
    expect(page.locator("main").get_by_role("alert")).to_contain_text("Popraw zaznaczone pola")
    expect(page.locator("#register-email")).to_be_focused()
    capture(page, "registration-invalid", width)
    page.locator("#register-email").fill("public-proof@example.invalid")
    page.locator("#register-password").fill("Proof-only-123")
    page.locator("#register-nip").fill("111-222-33-32")
    page.locator("#register-companyName").fill("CI demonstration — no real account")
    page.locator('input[name="consentReg"]').check()
    requests: list[dict] = []

    def registration_response(route) -> None:
        requests.append(route.request.post_data_json)
        if len(requests) == 1:
            route.fulfill(status=429, json={"error": "Zbyt wiele prób. Spróbuj ponownie później."})
        else:
            route.fulfill(status=202, json={"success": True})

    page.route("**/api/register", registration_response)
    submit.click()
    expect(page.locator("main").get_by_role("alert")).to_contain_text("Zbyt wiele prób")
    expect(page.locator("#register-companyName")).to_have_value("CI demonstration — no real account")
    capture(page, "registration-retry", width)
    submit.click()
    expect(page.get_by_role("heading", name="Zgłoszenie przyjęte do obsługi")).to_be_visible()
    if len(requests) != 2 or any(payload["nip"] != "1112223332" or payload["consentVat"] is not False for payload in requests):
        raise AssertionError("Registration payload/retry contract changed")
    capture(page, "registration-received", width)
    page.unroute("**/api/register", registration_response)


def verify_viewport(browser: Browser, width: int, height: int) -> dict[str, int]:
    context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, locale="pl-PL", color_scheme="light", reduced_motion="reduce")
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        verify_company_pages(page, width)
        verify_catalog(page, width)
        verify_login(page, width)
        verify_registration(page, width)
        if errors:
            raise AssertionError(f"Browser exceptions: {errors}")
        return {"width": width, "height": height}
    except Exception:
        (OUTPUT / f"failure-{width}.txt").write_text(f"URL: {page.url}\n{traceback.format_exc()}", encoding="utf8")
        page.screenshot(path=str(OUTPUT / f"failure-{width}.png"), full_page=True)
        raise
    finally:
        context.close()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile("public/assets/logo.svg", OUTPUT / "celtronics.svg")
    manifest = {"checkout_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(), "run_id": os.getenv("GITHUB_RUN_ID"), "status": "failed", "viewports": [], "failed_viewports": [], "registration": "browser-intercepted; no server mutation"}
    try:
        wait_for_server()
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            manifest["browser"] = browser.version
            try:
                for width, height in VIEWPORTS:
                    try:
                        manifest["viewports"].append(verify_viewport(browser, width, height))
                    except Exception as error:
                        manifest["failed_viewports"].append({"width": width, "height": height, "error": str(error)})
            finally:
                browser.close()
        if manifest["failed_viewports"]:
            raise AssertionError(f"Public proof failed at {len(manifest['failed_viewports'])} viewport(s); see failure artifacts")
        manifest["status"] = "passed"
    finally:
        manifest["logo_sha256"] = hashlib.sha256((OUTPUT / "celtronics.svg").read_bytes()).hexdigest()
        manifest["screenshots"] = {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted(OUTPUT.glob("*.png"))}
        (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
