/** An element of a built page, as far as a check needs it: a tag and the attributes the build wrote. */
export interface HtmlElement {
	readonly tag: string
	readonly attributes: Readonly<Record<string, string>>
	/** The elements this one sits inside, outermost first. */
	readonly ancestors: readonly HtmlElement[]
}

/** A run of text in a built page with every element it sits inside, outermost first. */
export interface TextRun {
	readonly text: string
	readonly ancestors: readonly HtmlElement[]
}

/** The elements of a built page in document order, and its text runs with their ancestors. */
export interface ScannedPage {
	readonly elements: readonly HtmlElement[]
	readonly text: readonly TextRun[]
}

export { scanHtml } from "./html-scan"

/** Every element of one tag, in document order. */
export function elementsByTag(page: ScannedPage, tag: string): readonly HtmlElement[] {
	return page.elements.filter((element) => element.tag === tag)
}
