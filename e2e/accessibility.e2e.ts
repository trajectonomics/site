import AxeBuilder from "@axe-core/playwright"
import { expect, type Page, test } from "@playwright/test"
import { FI_DEMO_OUTPUT } from "../src/lib/site"
import { DEVICE_SCHEMES, expectShippedTheme, homeOf, openPage, PAGES } from "./pages"
import { VIEWPORTS } from "./viewports"

/** Every WCAG 2.2 AA tag the Site promises; `target-size` is enabled in the same options call. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

/** The side of the comparison in See it in action that carries the demo output. */
type CompareSide = "without" | "with"

/** The two panels' own words, so a test title names the state a visitor pressed. */
const SIDE_LABEL: Record<CompareSide, string> = { without: "Before", with: "After" }

/**
 * The comparison states axe judges. On a phone the two panels are a tabbed pair, the visitor lands on
 * `without`, and the `with` panel — the one with the demo output — is laid out only once its tab is
 * pressed, so axe ignores it otherwise ([compare-tabs.css](../src/styles/compare-tabs.css)). At the
 * desktop width both panels are laid out together and the tab bar steps aside.
 */
const COMPARE_STAGES: Record<keyof typeof VIEWPORTS, readonly CompareSide[]> = {
	desktop: ["without"],
	phone: ["without", "with"],
}

/** The Not-found page carries no comparison, so one run judges all of it at every viewport. */
const NO_COMPARE: readonly CompareSide[] = ["without"]

/** Show one side of the comparison, where the viewport offers a tab for it. */
async function showCompareSide(page: Page, side: CompareSide): Promise<void> {
	const tab = page.locator(`[data-action-tab="${side}"]`)
	if (!(await tab.isVisible())) return
	await tab.click()
	await expect(page.locator("[data-action-compare]")).toHaveAttribute("data-action-stage", side)
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
				const sides =
					underTest.status === 200
						? COMPARE_STAGES[viewportName as keyof typeof VIEWPORTS]
						: NO_COMPARE
				for (const side of sides) {
					const shown = sides.length > 1 ? ` with the ${SIDE_LABEL[side]} panel shown` : ""
					test(`${underTest.name}${shown} has no axe violation and nothing axe cannot judge`, async ({
						page,
					}) => {
						await openPage(page, underTest)
						await expectShippedTheme(page)
						await showCompareSide(page, side)
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
						expect(violations, `${underTest.path} passes every axe rule`).toEqual([])
						// An incomplete is axe saying it could not decide, which is how the demo output's
						// contrast finding passed for months. Naming the rule and its nodes keeps the next
						// one actionable ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
						const unjudged = results.incomplete.map(
							(rule) => `${rule.id}: ${rule.nodes.map((node) => node.target.join(" ")).join(", ")}`,
						)
						expect(unjudged, `${underTest.path} leaves axe no rule it cannot judge`).toEqual([])
					})
				}
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
	await showCompareSide(page, "with")
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
