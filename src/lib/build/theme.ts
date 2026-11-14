import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml } from "./html"
import { checkThemeCss } from "./theme-css"

/** The Theme the markup falls back to when JavaScript never runs. */
const FALLBACK_THEME = "light"

const STYLESHEET = /\bstylesheet\b/i

function isInlineScript(element: HtmlElement): boolean {
	return element.tag === "script" && element.attributes["src"] === undefined
}

function isStylesheet(element: HtmlElement): boolean {
	return element.tag === "link" && STYLESHEET.test(element.attributes["rel"] ?? "")
}

/** The page asks for a published Theme, and that Theme is the one it falls back to. */
function checkAttribute(
	path: string,
	page: ScannedPage,
	tokens: DesignTokens,
): readonly BuildFailure[] {
	const [html] = elementsByTag(page, "html")
	const requested = html?.attributes["data-theme"]
	if (requested === undefined) {
		return [
			buildFailure(
				"THEME_ATTRIBUTE_MISSING",
				path,
				"<html> has no data-theme, so the page is unstyled (design-system ADR 0005).",
			),
		]
	}
	const failures: BuildFailure[] = []
	const published = tokens.themes.map((theme) => theme.name).join(", ")
	if (!tokens.themes.some((theme) => theme.name === requested)) {
		failures.push(
			buildFailure(
				"THEME_ATTRIBUTE_NOT_PUBLISHED",
				path,
				`data-theme="${requested}" names no Theme the published CSS defines (${published}).`,
			),
		)
	}
	if (requested !== FALLBACK_THEME) {
		failures.push(
			buildFailure(
				"THEME_FALLBACK_NOT_LIGHT",
				path,
				`data-theme="${requested}"; with JavaScript off the page falls back to ${FALLBACK_THEME}.`,
			),
		)
	}
	return failures
}

/** The inline script that reads the device scheme runs before the first stylesheet. */
function checkScriptOrder(path: string, page: ScannedPage): readonly BuildFailure[] {
	const script = page.elements.findIndex(isInlineScript)
	const stylesheet = page.elements.findIndex(isStylesheet)
	if (script !== -1 && stylesheet !== -1 && script < stylesheet) return []
	const found =
		script === -1
			? "there is no inline script"
			: stylesheet === -1
				? "there is no stylesheet link"
				: "the inline script comes after the first stylesheet"
	return [
		buildFailure(
			"THEME_SCRIPT_NOT_FIRST",
			path,
			`${found}; the Theme must be on <html> before the first paint, so the inline script comes first.`,
		),
	]
}

/** The page asks for a published Theme before the first paint, and the CSS it loads carries that Theme. */
export function checkTheme(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return [
		...builtPages(files).flatMap((file) => {
			const page = scanHtml(file.content)
			return [...checkAttribute(file.path, page, tokens), ...checkScriptOrder(file.path, page)]
		}),
		...checkThemeCss(files, tokens),
	]
}
