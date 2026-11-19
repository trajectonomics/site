import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { FI_DEMO_OUTPUT } from "../src/lib/site"
import { DEVICE_SCHEMES, expectShippedTheme, homeOf, openPage, PAGES } from "./pages"
import { VIEWPORTS } from "./viewports"

/** Every WCAG 2.2 AA tag the Site promises; `target-size` is enabled in the same options call. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const

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
					// one actionable ([ADR 0021](./docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
					const unjudged = results.incomplete.map(
						(rule) => `${rule.id}: ${rule.nodes.map((node) => node.target.join(" ")).join(", ")}`,
					)
					expect(unjudged, `${underTest.path} leaves axe no rule it cannot judge`).toEqual([])
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
	await page.setViewportSize(VIEWPORTS.mobile)
	await openPage(page, homeOf("en"))
	const output = page.locator("pre.terminal-output")
	const measured = await output.evaluate((element) => ({
		clientWidth: element.clientWidth,
		scrollWidth: element.scrollWidth,
		text: element.textContent ?? "",
	}))
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
