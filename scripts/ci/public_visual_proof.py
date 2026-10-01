"""Read-only Chromium proof of the built public site, with exact-checkout provenance."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
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


def verify_geometry(page: Page, width: int) -> None:
    expect(page.locator("main h1")).to_have_count(1)
    expect(page.locator("#zakres-prac article")).to_have_count(6)
    page.evaluate("document.fonts.ready")
    page.wait_for_function("Array.from(document.querySelectorAll('header img')).every(img => img.complete && img.naturalWidth > 0)")
    actual = page.evaluate("document.documentElement.scrollWidth")
    if actual > width:
        raise AssertionError(f"Horizontal overflow: {actual}px at {width}px")
    logo = page.locator('header img[alt="CEL-TRONICS"]')
    expect(logo).to_have_attribute("src", "/assets/logo.svg")
    box = logo.bounding_box()
    if not box or abs(box["width"] / box["height"] - 2045 / 515) > .02:
        raise AssertionError("Logo aspect ratio changed")


def verify_mobile_menu(page: Page, width: int) -> None:
    toggle = page.get_by_role("button", name="Otwórz menu")
    toggle.click()
    panel = page.locator("#public-menu")
    expect(panel).to_be_visible()
    expect(page.get_by_role("button", name="Zamknij menu")).to_have_attribute("aria-expanded", "true")
    page.screenshot(path=str(OUTPUT / f"menu-{width}.png"), full_page=True)
    panel.get_by_role("link", name="Usługi", exact=True).focus()
    page.keyboard.press("Escape")
    expect(panel).to_be_hidden()
    expect(page.get_by_role("button", name="Otwórz menu")).to_be_focused()
    page.get_by_role("button", name="Otwórz menu").click()
    panel.get_by_role("link", name="Firma", exact=True).click()
    expect(panel).to_be_hidden()


def verify_viewport(browser: Browser, width: int, height: int) -> dict[str, int]:
    context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, locale="pl-PL", color_scheme="light", reduced_motion="reduce")
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        response = page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        if not response or response.status != 200:
            raise AssertionError("Homepage did not return HTTP 200")
        verify_geometry(page, width)
        page.screenshot(path=str(OUTPUT / f"home-{width}.png"), full_page=True)
        page.keyboard.press("Tab")
        expect(page.get_by_role("link", name="Przejdź do treści")).to_be_focused()
        page.keyboard.press("Enter")
        expect(page.locator("#public-content")).to_be_focused()
        if width < 1024:
            page.evaluate("window.scrollTo(0, 0)")
            verify_mobile_menu(page, width)
        page.get_by_role("link", name="Omów instalację", exact=True).click()
        expect(page).to_have_url(f"{BASE_URL}/kontakt")
        expect(page.locator("main")).to_be_visible()
        if errors:
            raise AssertionError(f"Browser exceptions: {errors}")
        return {"width": width, "height": height}
    finally:
        context.close()


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {"checkout_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(), "run_id": os.getenv("GITHUB_RUN_ID"), "status": "failed", "viewports": []}
    try:
        wait_for_server()
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            manifest["browser"] = browser.version
            try:
                for width, height in VIEWPORTS:
                    manifest["viewports"].append(verify_viewport(browser, width, height))
            finally:
                browser.close()
        manifest["status"] = "passed"
    finally:
        manifest["screenshots"] = {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in sorted(OUTPUT.glob("*.png"))}
        (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
