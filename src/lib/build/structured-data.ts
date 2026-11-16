import type { Language } from "../language/language"
import { structuredData } from "../site/structured-data"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isDataBlockType } from "./html"
import { parseAttributes } from "./html-tag"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

/** The body of every Structured data block on a page, in document order, comments included. */
function blocksOf(html: string): readonly string[] {
	return [...html.matchAll(SCRIPT)]
		.filter((match) => isDataBlockType(parseAttributes(match[1] ?? "")["type"]))
		.map((match) => match[2] ?? "")
}

/** The block parsed as one JSON value, or `undefined` when it is not JSON at all. */
function parseBlock(block: string): unknown {
	try {
		return JSON.parse(block)
	} catch {
		return undefined
	}
}

/** One place the block the build wrote differs from the one the page must carry. */
interface Difference {
	readonly at: string
	readonly stated: unknown
	readonly written: unknown
}

/** The value kind the walk compares, with `absent` for a key one side does not carry. */
function kindOf(value: unknown): string {
	if (value === undefined) return "absent"
	if (value === null) return "null"
	if (Array.isArray(value)) return "array"
	return typeof value
}

/** The value at one key or index, or `undefined` when the node carries none. */
function valueAt(node: unknown, key: string): unknown {
	return typeof node === "object" && node !== null
		? (node as Readonly<Record<string, unknown>>)[key]
		: undefined
}

/** Every path at which the block the build wrote differs from the one the page must carry. */
function differences(at: string, stated: unknown, written: unknown): readonly Difference[] {
	const kind = kindOf(stated)
	if (kind !== kindOf(written)) return [{ at, stated, written }]
	if (kind !== "object" && kind !== "array")
		return stated === written ? [] : [{ at, stated, written }]
	const keys = new Set([...Object.keys(stated as object), ...Object.keys(written as object)])
	return [...keys].flatMap((key) =>
		differences(at === "" ? key : `${at}.${key}`, valueAt(stated, key), valueAt(written, key)),
	)
}

/** The value as a maintainer reads it: its JSON, or `nothing` for a property the block leaves out. */
function shown(value: unknown): string {
	return value === undefined ? "nothing" : JSON.stringify(value)
}

/** One Language home carries one block, it parses, and it states the page the build made. */
function failuresOf(file: BuiltFile, language: Language): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	const blocks = blocksOf(file.content)
	const [block] = blocks
	if (block === undefined) {
		return [
			buildFailure(
				"JSON_LD_MISSING",
				path,
				"carries no Structured data block, so a crawler has nothing to attribute.",
			),
		]
	}
	if (blocks.length > 1) {
		return [buildFailure("JSON_LD_DUPLICATE", path, `carries ${blocks.length} blocks, not one.`)]
	}
	const parsed = parseBlock(block)
	if (parsed === undefined) {
		return [buildFailure("JSON_LD_INVALID", path, "carries a block no JSON parser can read.")]
	}
	return differences("", structuredData(language), parsed).map((difference) =>
		buildFailure(
			"JSON_LD_WRONG",
			path,
			`states ${difference.at === "" ? "a block" : `its ${difference.at} as`} ${shown(difference.written)}, not ${shown(difference.stated)}.`,
		),
	)
}

/** Every Language home states one Structured data block, and it is that page's own. */
export function checkStructuredData(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => failuresOf(file, entry.language))
}
