import { FALLBACK_LANGUAGE } from "../language/language"
import { absoluteLocaleUrl, LANGUAGES } from "../language/languages"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import type { HtmlElement } from "./html"
import type { SitemapEntry } from "./sitemap-entry"

/** One alternate is present once, and its `href` is that `hreflang`'s absolute Locale URL. */
function alternateFailures(
	path: string,
	alternates: readonly HtmlElement[],
	hreflang: string,
	href: string,
): readonly BuildFailure[] {
	const matching = alternates.filter((link) => link.attributes["hreflang"] === hreflang)
	if (matching.length === 0) {
		return [
			buildFailure(
				"SITEMAP_ALTERNATE_MISSING",
				path,
				`the entry at ${path} names no ${hreflang} alternate.`,
			),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"SITEMAP_ALTERNATE_DUPLICATE",
				path,
				`the entry at ${path} names ${matching.length} ${hreflang} alternates, not one.`,
			),
		]
	}
	const target = matching[0]?.attributes["href"]
	if (target === href) return []
	return [
		buildFailure(
			"SITEMAP_ALTERNATE_TARGET",
			path,
			`the entry at ${path} names ${hreflang} at ${target ?? "no href"}, not ${href}.`,
		),
	]
}

/** An entry at a home names every Language's alternate, and `x-default` at the English home. */
export function entryAlternateFailures(entry: SitemapEntry, path: string): readonly BuildFailure[] {
	const required = [
		...LANGUAGES.map((language) => ({
			hreflang: language.language,
			href: absoluteLocaleUrl(language.language),
		})),
		{ hreflang: "x-default", href: absoluteLocaleUrl(FALLBACK_LANGUAGE) },
	]
	return required.flatMap((one) =>
		alternateFailures(path, entry.alternates, one.hreflang, one.href),
	)
}
