import type { Dictionary } from "../language/dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** The first element of one tag after `from` in document order. */
function nextAfter(page: ScannedPage, from: HtmlElement, tag: string): HtmlElement | undefined {
	return page.elements.slice(page.elements.indexOf(from) + 1).find((element) => element.tag === tag)
}

/** The hero's headline and sub-line, and the footer's disclaimer, are the text the Dictionary names. */
function textFailures(
	file: BuiltFile,
	page: ScannedPage,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	const hero = elementsByTag(page, "h1").find((heading) =>
		heading.ancestors.some((ancestor) => ancestor.tag === "main"),
	)
	if (hero === undefined || textOf(page, hero) !== dictionary.heroHeading) {
		failures.push(
			buildFailure(
				"HEADLINE_NOT_RENDERED",
				file.path,
				`the hero's <h1> does not show "${dictionary.heroHeading}".`,
			),
		)
	}
	const subline = hero === undefined ? undefined : nextAfter(page, hero, "p")
	if (subline === undefined || textOf(page, subline) !== dictionary.heroSubline) {
		failures.push(
			buildFailure(
				"SUBLINE_NOT_RENDERED",
				file.path,
				`no paragraph under the headline shows "${dictionary.heroSubline}".`,
			),
		)
	}
	const footer = elementsByTag(page, "footer")[0]
	const disclaimer = footer === undefined ? undefined : nextAfter(page, footer, "p")
	if (disclaimer === undefined || textOf(page, disclaimer) !== dictionary.footerDisclaimer) {
		failures.push(
			buildFailure(
				"DISCLAIMER_NOT_RENDERED",
				file.path,
				`the footer's first paragraph does not show "${dictionary.footerDisclaimer}".`,
			),
		)
	}
	return failures
}

/** Every Language home renders its headline, its sub-line and its disclaimer. */
export function checkPageText(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) =>
		textFailures(file, scanHtml(file.content), entry.dictionary),
	)
}
