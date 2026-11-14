import type { DesignTokens } from "../design/tokens"
import type { BuiltFile } from "./built-files"
import { builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, isInlineScript, isStylesheetLink, type ScannedPage, scanHtml } from "./html"
import { checkThemeCss } from "./theme-css"

/** The Theme the markup falls back to when JavaScript never runs. */
const FALLBACK_THEME = "light"

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

/** The page links the stylesheet that paints it. */
function checkStylesheet(path: string, page: ScannedPage): readonly BuildFailure[] {
	if (page.elements.some(isStylesheetLink)) return []
	return [
		buildFailure(
			"THEME_STYLESHEET_MISSING",
			path,
			"the page links no stylesheet, so the Semantic Token Roles resolve to nothing.",
		),
	]
}

/** The inline script that reads the device scheme is there, and runs before the first stylesheet. */
function checkScript(path: string, page: ScannedPage): readonly BuildFailure[] {
	const script = page.elements.findIndex(isInlineScript)
	if (script === -1) {
		return [
			buildFailure(
				"THEME_SCRIPT_MISSING",
				path,
				"the page has no inline script, so a device set to dark still gets the light Theme.",
			),
		]
	}
	const stylesheet = page.elements.findIndex(isStylesheetLink)
	if (stylesheet === -1 || script < stylesheet) return []
	return [
		buildFailure(
			"THEME_SCRIPT_NOT_FIRST",
			path,
			"the inline script comes after the first stylesheet, so the Theme paints one frame late.",
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
			return [
				...checkAttribute(file.path, page, tokens),
				...checkStylesheet(file.path, page),
				...checkScript(file.path, page),
			]
		}),
		...checkThemeCss(files, tokens),
	]
}
