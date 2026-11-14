import type { BuiltFile } from "./built-files"
import type { HtmlElement } from "./html"

/** The font size in pixels and the weight each type utility sets, read from the built CSS. */
export interface TypeScale {
	readonly sizes: Readonly<Record<string, number>>
	readonly weights: Readonly<Record<string, number>>
}

/** How large and how heavy one text run renders. */
interface RenderedType {
	readonly pixels: number
	readonly weight: number
}

/** The browser's default root font size, which this Site never overrides. */
const PIXELS_PER_REM = 16

/** WCAG AA: 4.5:1 for normal text, and 3:1 for text it calls large. */
const TEXT_CONTRAST = 4.5
const LARGE_TEXT_CONTRAST = 3

/** WCAG large text: 24 pixels, or 18.66 pixels at a weight of 700 and above. */
const LARGE_TEXT_PIXELS = 24
const LARGE_BOLD_PIXELS = 18.66
const BOLD_WEIGHT = 700

/** The type a browser renders body text at when no utility says otherwise. */
const BASE_PIXELS = 16
const BASE_WEIGHT = 400

/** A length in pixels: `2.25rem` at 16px a rem, or a value already in `px`. */
function pixels(value: string): number | undefined {
	const rem = /^([\d.]+)rem$/.exec(value.trim())
	if (rem?.[1] !== undefined) return Number.parseFloat(rem[1]) * PIXELS_PER_REM
	const px = /^([\d.]+)px$/.exec(value.trim())
	return px?.[1] === undefined ? undefined : Number.parseFloat(px[1])
}

/** Every `--<prefix>-<name>` custom property in a stylesheet, first definition winning. */
function customProperties(css: string, prefix: string): ReadonlyMap<string, string> {
	const found = new Map<string, string>()
	for (const match of css.matchAll(new RegExp(`--${prefix}-([\\w-]+):\\s*([^;}]+)`, "g"))) {
		const name = match[1]
		const value = match[2]
		if (name === undefined || value === undefined) continue
		if (name.endsWith("--line-height") || found.has(name)) continue
		found.set(name, value.trim())
	}
	return found
}

/** The size each `text-*` utility sets, from `.text-4xl{font-size:var(--text-4xl)}`. */
function sizesIn(css: string): Readonly<Record<string, number>> {
	const scale = customProperties(css, "text")
	const sizes: Record<string, number> = {}
	for (const match of css.matchAll(/\.text-([\w-]+)\{[^}]*font-size:\s*var\(--text-([\w-]+)\)/g)) {
		const name = match[1]
		const size = pixels(scale.get(match[2] ?? "") ?? "")
		if (name !== undefined && size !== undefined) sizes[name] = size
	}
	return Object.freeze(sizes)
}

/** The weight each `font-*` utility sets, from `.font-bold{font-weight:var(--font-weight-bold)}`. */
function weightsIn(css: string): Readonly<Record<string, number>> {
	const scale = customProperties(css, "font-weight")
	const weights: Record<string, number> = {}
	for (const match of css.matchAll(
		/\.font-([\w-]+)\{[^}]*font-weight:\s*var\(--font-weight-([\w-]+)\)/g,
	)) {
		const weight = Number.parseFloat(scale.get(match[2] ?? "") ?? "")
		if (match[1] !== undefined && !Number.isNaN(weight)) weights[match[1]] = weight
	}
	return Object.freeze(weights)
}

/** The size and weight one class list sets, where a utility names one. */
function typeIn(
	classNames: string,
	scale: TypeScale,
): { readonly pixels: number | undefined; readonly weight: number | undefined } {
	const found: { pixels: number | undefined; weight: number | undefined } = {
		pixels: undefined,
		weight: undefined,
	}
	for (const utility of classNames.split(/\s+/)) {
		const separator = utility.indexOf("-")
		if (separator === -1) continue
		const name = utility.slice(separator + 1)
		if (utility.startsWith("text-")) found.pixels = scale.sizes[name] ?? found.pixels
		if (utility.startsWith("font-")) found.weight = scale.weights[name] ?? found.weight
	}
	return found
}

/** How large and how heavy a chain of elements renders its text. */
function renderedType(chain: readonly HtmlElement[], scale: TypeScale): RenderedType {
	const rendered = { pixels: BASE_PIXELS, weight: BASE_WEIGHT }
	for (const element of chain) {
		const found = typeIn(element.attributes["class"] ?? "", scale)
		rendered.pixels = found.pixels ?? rendered.pixels
		rendered.weight = found.weight ?? rendered.weight
	}
	return rendered
}

/** The contrast a chain of elements must meet: the large-text bar only for text WCAG calls large. */
export function minimumContrast(chain: readonly HtmlElement[], scale: TypeScale): number {
	const rendered = renderedType(chain, scale)
	const large =
		rendered.pixels >= LARGE_TEXT_PIXELS ||
		(rendered.weight >= BOLD_WEIGHT && rendered.pixels >= LARGE_BOLD_PIXELS)
	return large ? LARGE_TEXT_CONTRAST : TEXT_CONTRAST
}

/** The type scale the built stylesheets define, as a browser reads it. */
export function typeScaleOf(files: readonly BuiltFile[]): TypeScale {
	const css = files
		.filter((file) => file.path.endsWith(".css"))
		.map((file) => file.content)
		.join("\n")
	return Object.freeze({ sizes: sizesIn(css), weights: weightsIn(css) })
}
