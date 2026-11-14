/** An element of a built page, as far as a check needs it: a tag and the attributes the build wrote. */
export interface HtmlElement {
	readonly tag: string
	readonly attributes: Readonly<Record<string, string>>
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

/** The attributes of a tag, with `name="value"`, `name='value'`, `name=value` and bare `name` alike. */
export function parseAttributes(text: string): Readonly<Record<string, string>> {
	const attributes: Record<string, string> = {}
	for (const match of text.matchAll(/([\w:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
		const name = match[1]
		if (name !== undefined) attributes[name] = match[2] ?? match[3] ?? match[4] ?? ""
	}
	return Object.freeze(attributes)
}

/** The index of the `>` that ends a tag, skipping a quoted attribute value that contains one. */
export function tagEnd(html: string, start: number): number {
	let quote: string | undefined
	for (const match of html.slice(start).matchAll(/["'>]/g)) {
		const character = match[0]
		if (quote !== undefined && character === quote) quote = undefined
		else if (quote === undefined && character === ">") return start + (match.index ?? 0)
		else if (quote === undefined) quote = character
	}
	return html.length
}

/** The elements that never have children, so a following tag is a sibling and not a descendant. */
const VOID_ELEMENTS = new Set(
	"area base br col embed hr img input link meta source track wbr".split(" "),
)

/** The elements whose content is code or metadata, never page text, so a `<nav>` inside one is not a tag. */
const CODE_ELEMENTS = new Set(["script", "style", "title", "textarea"])

/** The lowercase tag name an opening tag starts with, or `undefined` when it names none. */
export function tagName(inner: string): string | undefined {
	return /^[a-zA-Z][\w:-]*/.exec(inner)?.[0]?.toLowerCase()
}

/** Whether an open tag closes itself, so nothing after it is its child. */
export function isStandalone(tag: string, inner: string): boolean {
	return inner.endsWith("/") || VOID_ELEMENTS.has(tag)
}

/** Whether the content of an element is code or metadata rather than page text. */
export function isCodeElement(tag: string): boolean {
	return CODE_ELEMENTS.has(tag)
}
