import { describe, expect, it } from "bun:test"
import { checkTextContrast } from "./contrast"
import { TEST_TOKENS, testFiles } from "./test-page"

function failures(index?: string) {
	return checkTextContrast(testFiles(index === undefined ? {} : { index }), TEST_TOKENS)
}

function page(bodyClass: string, content: string): string {
	return `<html lang="en" data-theme="light"><head><script>a</script><link rel="stylesheet" href="/_astro/site.css"></head><body class="${bodyClass}"><header></header><main><h1>Hero</h1>${content}</main><footer></footer></body></html>`
}

describe("the contrast of the text on the built page", () => {
	it("passes the shell's role pairs in both Themes", () => {
		expect(failures().map((failure) => failure.code)).toEqual([])
	})

	it("fails muted text on a muted background, which is under AA in the light Theme", () => {
		const found = failures(
			page("bg-background text-foreground", '<p class="bg-muted text-muted-foreground">Quiet</p>'),
		)
		expect(found.map((failure) => failure.code)).toEqual(["TEXT_CONTRAST_TOO_LOW"])
	})

	it("judges each Theme on its own colours, so a pair can fail in one and pass in the other", () => {
		const found = failures(
			page("bg-background text-foreground", '<p class="bg-muted text-muted-foreground">Quiet</p>'),
		)
		expect(found[0]?.message).toContain("light")
	})

	it("reports the ratio it measured, so a maintainer can see how far off the pair is", () => {
		const found = failures(
			page("bg-background text-foreground", '<p class="bg-muted text-muted-foreground">Quiet</p>'),
		)
		expect(found[0]?.message).toMatch(/4\.\d\d:1/)
	})

	it("fails text whose colours no Semantic Token Role resolves", () => {
		expect(failures(page("", "<p>Unstyled</p>")).map((failure) => failure.code)).toContain(
			"TEXT_COLOUR_UNRESOLVED",
		)
	})
})
