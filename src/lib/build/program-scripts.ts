import { sameOriginPath } from "./asset-url"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import { scanHtml } from "./html"
import { parseAttributes } from "./html-tag"
import { staticImportPaths } from "./module-graph"

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const JSON_LD = /\bapplication\/ld\+json\b/i

/** The text a page runs itself, the script files it loads, and the scripts the build did not produce. */
export interface PageScripts {
	readonly inline: readonly string[]
	readonly files: readonly BuiltFile[]
	readonly missing: readonly string[]
}

/** The inline text each `<script>` runs, leaving out data blocks and scripts that name a source. */
function inlineOf(page: BuiltFile): readonly string[] {
	return [...page.content.matchAll(SCRIPT)].flatMap((match) => {
		const attributes = parseAttributes(match[1] ?? "")
		if (JSON_LD.test(attributes["type"] ?? "") || attributes["src"] !== undefined) return []
		return [match[2] ?? ""]
	})
}

/** The same-origin source each `<script>` names, leaving out data blocks and other origins. */
function sourceOf(page: BuiltFile): readonly string[] {
	return [...page.content.matchAll(SCRIPT)].flatMap((match) => {
		const attributes = parseAttributes(match[1] ?? "")
		if (JSON_LD.test(attributes["type"] ?? "")) return []
		const src = attributes["src"]
		const path = src === undefined ? undefined : sameOriginPath(page.path, src)
		return path === undefined ? [] : [path]
	})
}

/** The href of a link that preloads a script or a module, or `undefined` for any other link. */
function preloadOf(
	page: BuiltFile,
	attributes: Readonly<Record<string, string>>,
): string | undefined {
	const rel = (attributes["rel"] ?? "").toLowerCase()
	const as = (attributes["as"] ?? "").toLowerCase()
	const loadsScript = /\bmodulepreload\b/.test(rel) || (/\bpreload\b/.test(rel) && as === "script")
	const href = attributes["href"]
	return loadsScript && href !== undefined ? sameOriginPath(page.path, href) : undefined
}

/** The same-origin sources the page's script and module preloads name. */
function preloadsOf(page: BuiltFile): readonly string[] {
	return scanHtml(page.content).elements.flatMap((element) => {
		const path = preloadOf(page, element.attributes)
		return path === undefined ? [] : [path]
	})
}

/** The same-origin files one script names in its static imports and re-exports. */
function importsOf(fromPath: string, script: string): readonly string[] {
	return staticImportPaths(script).flatMap((specifier) => {
		const path = sameOriginPath(fromPath, specifier)
		return path === undefined ? [] : [path]
	})
}

/** Every script file a page runs, each once, plus the same-origin ones the build did not produce. */
export function pageScripts(files: readonly BuiltFile[], page: BuiltFile): PageScripts {
	const inline = inlineOf(page)
	const queue = [
		...sourceOf(page),
		...preloadsOf(page),
		...inline.flatMap((text) => importsOf(page.path, text)),
	]
	const found: BuiltFile[] = []
	const missing: string[] = []
	const seen = new Set<string>()
	while (queue.length > 0) {
		const path = queue.shift() ?? ""
		if (path === "" || seen.has(path)) continue
		seen.add(path)
		const file = fileAt(files, path)
		if (file === undefined) {
			missing.push(path)
			continue
		}
		found.push(file)
		queue.push(...importsOf(file.path, file.content))
	}
	return { inline, files: found, missing }
}
