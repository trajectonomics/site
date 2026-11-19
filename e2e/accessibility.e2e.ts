import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { FI_DEMO_OUTPUT } from "../src/lib/site"
import { DEVICE_SCHEMES, expectShippedTheme, homeOf, openPage, PAGES } from "./pages"
import { VIEWPORTS } from "./viewports"

/** Every WCAG 2.2 AA tag the Site promises; `target-size` is enabled in the same options call. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

/** Fail on every axe violation the page has in one state, and on every rule axe could not judge. */
async function expectNothingAxeCannotJudge(page: Page, path: string, state: string): Promise<void> {
	// One options call: a later options() replaces the whole object, tags included.
	const results = await new AxeBuilder({ page })
		.options({
			runOnly: { type: "tag", values: [...TAGS] },
			rules: { "target-size": { enabled: true } },
		})
		.analyze()
	const violations = results.violations.map(
		(violation) => `${violation.id} (${violation.impact}): ${violation.help}`,
	)
	expect(violations, `${path} ${state} passes every axe rule`).toEqual([])
	// An incomplete is axe saying it could not decide, which is how the demo output's contrast
	// finding passed for months. Naming the rule and its nodes keeps the next one actionable
	// ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
	const unjudged = results.incomplete.map(
		(rule) => `${rule.id}: ${rule.nodes.map((node) => node.target.join(" ")).join(", ")}`,
	)
	expect(unjudged, `${path} ${state} leaves axe no rule it cannot judge`).toEqual([])
}

/**
 * Judge the page as it lands, then once per panel a visitor can open. The comparison is a tabbed pair
 * at a phone width and axe ignores a panel behind an unopened tab, so the After panel — the one with
 * the demo output — is judged only once its tab is pressed ([compare-tabs.css](../src/styles/compare-tabs.css)).
 * At the desktop width both panels are laid out and the tab bar steps aside, so one analysis covers
 * them; a page with no comparison has no tab to press.
 */
async function judgeEveryReachableState(page: Page, path: string): Promise<void> {
	await expectNothingAxeCannotJudge(page, path, "as it lands")
	const tabs = page.locator("[data-action-compare] [data-action-tab]")
	for (let index = 0; index < (await tabs.count()); index++) {
		const tab = tabs.nth(index)
		if (!(await tab.isVisible())) continue
		// The pressed tab is the state already judged as the page landed.
		if ((await tab.getAttribute("aria-pressed")) === "true") continue
		const label = (await tab.textContent())?.trim() || `panel ${index + 1}`
		await tab.click()
		await expectNothingAxeCannotJudge(page, path, `with the ${label} panel shown`)
	}
}

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	for (const scheme of DEVICE_SCHEMES) {
		test.describe(`axe at the ${viewportName} viewport of a ${scheme} device`, () => {
			test.use({
				colorScheme: scheme,
				// Reduced motion settles the load-in animation at once, so axe judges the shipped pixels
				// instead of a mid-animation frame whose opacity lowers the computed contrast.
				reducedMotion: "reduce",
				viewport,
			})

			for (const underTest of PAGES) {
				test(`${underTest.name} has no axe violation and nothing axe cannot judge`, async ({
					page,
				}) => {
					await openPage(page, underTest)
					await expectShippedTheme(page)
					await judgeEveryReachableState(page, underTest.path)
				})
			}
		})
	}
}

test("the demo output shows its whole answer without scrolling at the phone viewport", async ({
	page,
}) => {
	// The viewport is set here rather than looped over, so the check holds on its own: it is axe's
	// own `scrollable-region-focusable` written where a failure can name the element and the widths.
	await page.setViewportSize(VIEWPORTS.phone)
	await openPage(page, homeOf("en"))
	const afterTab = page.locator('[data-action-tab="with"]')
	if (await afterTab.isVisible()) await afterTab.click()
	const output = page.locator("pre.terminal-output")
	const measured = await output.evaluate((element) => ({
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		text: element.textContent ?? "",
	}))
	expect(
		measured.clientWidth,
		"pre.terminal-output sits on a panel the phone lays out",
	).toBeGreaterThan(0)
	expect(measured.text, "pre.terminal-output prints the whole fixture").toBe(
		FI_DEMO_OUTPUT.join("\n"),
	)
	expect(
		measured.scrollWidth,
		`pre.terminal-output scrolls to ${measured.scrollWidth} px inside ${measured.clientWidth} px`,
	).toBe(measured.clientWidth)
})

test("a fixture outside the build with an unnamed button fails axe", async ({ page }) => {
	const fixture =
		'<html lang="en"><body><main><h1>Fixture</h1><button></button></main></body></html>'
	await page.setContent(fixture)
	const results = await new AxeBuilder({ page })
		.options({ runOnly: { type: "tag", values: [...TAGS] } })
		.analyze()
	expect(results.violations.map((violation) => violation.id)).toContain("button-name")
})
