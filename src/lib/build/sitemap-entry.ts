import { hreflangTarget } from "./hreflang-target"
import { elementsByTag, type HtmlElement, scanHtml, textOf } from "./html"

/** One `<url>` of a Sitemap: the path its `<loc>` names, that `<loc>`, and the alternates it holds. */
export interface SitemapEntry {
	/** The path the entry's `<loc>` names, or `undefined` when it names none a crawler could follow. */
	readonly path: string | undefined
	/** The `<loc>`'s text exactly as the build wrote it. */
	readonly loc: string
	/** The `<xhtml:link>` elements inside this `<url>`, in document order. */
	readonly alternates: readonly HtmlElement[]
}

/**
 * Every `<url>` of a Sitemap in document order, read with the hand-rolled reader so no XML parser
 * joins the tree ([ADR 0004](../../../docs/adr/0004-build-output-checks.md)).
 */
export function sitemapEntries(content: string): readonly SitemapEntry[] {
	const page = scanHtml(content)
	const locs = elementsByTag(page, "loc")
	const alternates = elementsByTag(page, "xhtml:link")
	return elementsByTag(page, "url").map((url) => {
		const loc = locs.find((element) => element.ancestors.includes(url))
		const text = loc === undefined ? "" : textOf(page, loc)
		return {
			path: hreflangTarget(text)?.path,
			loc: text,
			alternates: alternates.filter((link) => link.ancestors.includes(url)),
		}
	})
}
