import { describe, expect, it } from "bun:test"
import type { BuiltFile } from "./built-files"
import { typeScaleOf } from "./type-scale"

const CSS = `:root{--text-4xl:2.25rem;--text-4xl--line-height:2.5;--text-lg:1.125rem;--text-sm:0.875rem;--font-weight-bold:700;--font-weight-semibold:600}
.text-4xl{font-size:var(--text-4xl);line-height:var(--tw-leading,var(--text-4xl--line-height))}
.text-lg{font-size:var(--text-lg)}
.text-sm{font-size:var(--text-sm)}
.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}
.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}`

function scale(css = CSS, path = "_astro/site.css") {
	return typeScaleOf([{ path, content: css }] as readonly BuiltFile[])
}

describe("the type scale the built CSS defines", () => {
	it("reads a text utility's size, with a rem counted as 16 pixels", () => {
		expect(scale().sizes).toEqual({ "4xl": 36, lg: 18, sm: 14 })
	})

	it("reads a font utility's weight", () => {
		expect(scale().weights).toEqual({ bold: 700, semibold: 600 })
	})

	it("does not read a line-height as a size, even though it shares the name", () => {
		expect(scale().sizes["4xl--line-height"]).toBeUndefined()
		expect(scale().sizes["4xl"]).toBe(36)
	})

	it("reads a size a stylesheet writes in pixels", () => {
		const css = ":root{--text-hero:40px}.text-hero{font-size:var(--text-hero)}"
		expect(scale(css).sizes).toEqual({ hero: 40 })
	})

	it("has no size for a text utility whose custom property no stylesheet defines", () => {
		expect(scale(".text-huge{font-size:var(--text-huge)}").sizes).toEqual({})
	})

	it("has no size for a text utility that sets only a colour", () => {
		expect(scale(".text-foreground{color:var(--ds-color-foreground)}").sizes).toEqual({})
	})

	it("reads only the stylesheets, never the pages that link them", () => {
		expect(scale(".text-4xl{font-size:2rem}", "index.html").sizes).toEqual({})
	})
})
