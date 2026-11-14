import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { expectTheme, openPage, PAGES, THEMES } from "./pages"

/** Every WCAG 2.2 AA tag the Site promises; `target-size` is enabled below as well. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

for (const theme of THEMES) {
	test.describe(`axe in the ${theme} theme`, () => {
		test.use({ colorScheme: theme })

		for (const underTest of PAGES) {
			test(`${underTest.name} has no axe violation`, async ({ page }) => {
				await openPage(page, underTest)
				await expectTheme(page, theme)
				const results = await new AxeBuilder({ page })
					.withTags(TAGS)
					.options({ rules: { "target-size": { enabled: true } } })
					.analyze()
				const unjudged = results.incomplete.map((rule) => rule.id)
				if (unjudged.length > 0) {
					console.log(`${underTest.path}: axe could not judge ${unjudged.join(", ")}`)
				}
				const violations = results.violations.map(
					(violation) => `${violation.id} (${violation.impact}): ${violation.help}`,
				)
				expect(violations, `${underTest.path} passes every axe rule`).toEqual([])
			})
		}
	})
}

test("a fixture outside the build with an unnamed button fails axe", async ({ page }) => {
	const fixture =
		'<html lang="en"><body><main><h1>Fixture</h1><button></button></main></body></html>'
	await page.setContent(fixture)
	const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
	expect(results.violations.map((violation) => violation.id)).toContain("button-name")
})
