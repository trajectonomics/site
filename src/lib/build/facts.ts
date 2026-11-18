import type { Dictionary } from "../language/dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** The attribute that marks the strip of facts above a Language home's install window. */
const FACTS = "data-facts"

/** The attribute that marks the install window those facts must precede. */
const WINDOW = "data-install-window"

/** The strip of facts one page carries, when it carries one at all. */
function stripIn(page: ScannedPage): HtmlElement | undefined {
	return page.elements.find((element) => FACTS in element.attributes)
}

/** The install window one page shows, when it shows one. */
function windowIn(page: ScannedPage): HtmlElement | undefined {
	return page.elements.find((element) => WINDOW in element.attributes)
}

/** Every fact the strip leaves out, or the whole strip when the page has none. */
function missingFacts(
	file: BuiltFile,
	page: ScannedPage,
	strip: HtmlElement | undefined,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	if (strip === undefined) {
		return [
			buildFailure(
				"PAGE_FACTS_MISSING",
				file.path,
				`the page carries no facts above its install window: "${dictionary.factTexts.join('", "')}".`,
			),
		]
	}
	const stated = textOf(page, strip)
	return dictionary.factTexts.flatMap((text) =>
		stated.includes(text)
			? []
			: [
					buildFailure(
						"PAGE_FACTS_MISSING",
						file.path,
						`the facts above the install window do not state "${text}".`,
					),
				],
	)
}

/** The facts come before the window, so a visitor meets the limits before the step that needs them. */
function orderFailures(
	file: BuiltFile,
	page: ScannedPage,
	strip: HtmlElement | undefined,
	window: HtmlElement | undefined,
): readonly BuildFailure[] {
	if (strip === undefined || window === undefined) return []
	if (page.elements.indexOf(strip) < page.elements.indexOf(window)) return []
	return [
		buildFailure(
			"PAGE_FACTS_BELOW_WINDOW",
			file.path,
			"the facts sit below the install window; a visitor reads them after the step they belong to.",
		),
	]
}

/**
 * Every Language home states its three plain facts above its install window: the currency, the first
 * run's download and the agent it needs (site#69).
 *
 * The rule judges the strip and every fact's text, so no edit can drop a limit a visitor meets only
 * after the step. A home that shows no window has nothing to order the facts against, and the
 * install-window rule already fails it.
 */
export function checkFacts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const page = scanHtml(file.content)
		const strip = stripIn(page)
		return [
			...missingFacts(file, page, strip, entry.dictionary),
			...orderFailures(file, page, strip, windowIn(page)),
		]
	})
}
