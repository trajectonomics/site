import { sameOriginPath } from "./asset-url"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import { isStylesheetLink, scanHtml } from "./html"

const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi

/** The same-origin stylesheets one page paints with, and the linked ones the build did not produce. */
export interface PageStylesheets {
	readonly files: readonly BuiltFile[]
	readonly missing: readonly string[]
}

/** The stylesheet paths a page links directly. */
function linksOf(page: BuiltFile): readonly string[] {
	return scanHtml(page.content)
		.elements.filter((element) => isStylesheetLink(element))
		.flatMap((element) => {
			const href = element.attributes["href"]
			const path = href === undefined ? undefined : sameOriginPath(page.path, href)
			return path === undefined ? [] : [path]
		})
}

/** The stylesheets an inline `<style>` element imports, counted like a linked stylesheet. */
function inlineImports(page: BuiltFile): readonly string[] {
	return [...page.content.matchAll(CSS_IMPORT)].flatMap((match) => {
		const path = match[1] === undefined ? undefined : sameOriginPath(page.path, match[1])
		return path === undefined ? [] : [path]
	})
}

/** The stylesheets one stylesheet imports. */
function importsOf(file: BuiltFile): readonly string[] {
	return [...file.content.matchAll(CSS_IMPORT)].flatMap((match) => {
		const path = match[1] === undefined ? undefined : sameOriginPath(file.path, match[1])
		return path === undefined ? [] : [path]
	})
}

/** Every stylesheet a page paints with, each once, however many pages or imports name it. */
export function pageStylesheets(files: readonly BuiltFile[], page: BuiltFile): PageStylesheets {
	const queue = [...linksOf(page), ...inlineImports(page)]
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
		queue.push(...importsOf(file))
	}
	return { files: found, missing }
}
