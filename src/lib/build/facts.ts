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

/** Every string the strip states: each fact's label and its text, in the Dictionary's order. */
function stated(dictionary: Dictionary): readonly string[] {
	return [...dictionary.factLabels, ...dictionary.factTexts]
}

/** A page that carries no strip of facts above its install window at all. */
function missingStrip(file: BuiltFile, dictionary: Dictionary): BuildFailure {
	return buildFailure(
		"PAGE_FACTS_MISSING",
		file.path,
		`the page carries no facts above its install window: "${stated(dictionary).join('", "')}".`,
	)
}

/** Every label or text the strip leaves out, so no fact reaches a visitor half-written. */
function unstatedFacts(
	file: BuiltFile,
	page: ScannedPage,
	strip: HtmlElement,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const shown = textOf(page, strip)
	return stated(dictionary).flatMap((fact) =>
		shown.includes(fact)
			? []
			: [
					buildFailure(
						"FACT_NOT_STATED",
						file.path,
						`the facts above the install window do not state "${fact}".`,
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
 * The rules judge the strip, every fact's label and text, and the strip's place before the window, so
 * no edit can drop a limit a visitor meets only after the step. A home that shows no window has
 * nothing to order the facts against, and the install-window rule already fails it.
 */
export function checkFacts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const page = scanHtml(file.content)
		const strip = stripIn(page)
		const window = windowIn(page)
		if (strip === undefined) {
			return [missingStrip(file, entry.dictionary), ...orderFailures(file, page, strip, window)]
		}
		return [
			...unstatedFacts(file, page, strip, entry.dictionary),
			...orderFailures(file, page, strip, window),
		]
	})
}
