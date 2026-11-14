import { contrastRatio, parseRgb } from "../design/colour"
import type { DesignTokens, Theme } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { type ScannedPage, scanHtml, type TextRun } from "./html"
import { colourOf, paintedColours } from "./roles"

/**
 * WCAG AA for normal-size text. Every run is held to this bar, because the shell's role pairs clear
 * it: the large-text exception (3:1) could not let an unreadable pair through here.
 */
const MINIMUM_CONTRAST = 4.5

/** The text of a run, as a failure line shows it: whitespace collapsed, a long run cut short. */
function excerpt(text: string): string {
	const collapsed = text.replace(/\s+/g, " ").trim()
	return collapsed.length <= 40 ? collapsed : `${collapsed.slice(0, 37)}...`
}

function contrastFailures(
	path: string,
	run: TextRun,
	theme: Theme,
	tokens: DesignTokens,
): readonly BuildFailure[] {
	const painted = paintedColours(run.ancestors, tokens.colourUtilities)
	const background = colourOf(theme, painted.background)
	const foreground = colourOf(theme, painted.foreground)
	if (background === undefined || foreground === undefined) {
		return [
			buildFailure(
				"TEXT_COLOUR_UNRESOLVED",
				path,
				`"${excerpt(run.text)}" paints background ${painted.background ?? "none"} and text ${painted.foreground ?? "none"} in the ${theme.name} Theme, which the published Theme does not resolve to a colour.`,
			),
		]
	}
	const a = parseRgb(background)
	const b = parseRgb(foreground)
	if (a === undefined || b === undefined) {
		return [
			buildFailure(
				"TEXT_COLOUR_UNRESOLVED",
				path,
				`"${excerpt(run.text)}" paints ${foreground} on ${background} in the ${theme.name} Theme, which is not a colour this check reads.`,
			),
		]
	}
	const ratio = contrastRatio(b, a)
	if (ratio >= MINIMUM_CONTRAST) return []
	return [
		buildFailure(
			"TEXT_CONTRAST_TOO_LOW",
			path,
			`"${excerpt(run.text)}" reads at ${ratio.toFixed(2)}:1 in the ${theme.name} Theme, under the ${MINIMUM_CONTRAST}:1 WCAG AA requires for text.`,
		),
	]
}

/** Every text run on every built page meets WCAG AA against its background, in every Theme. */
export function checkTextContrast(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const page: ScannedPage = scanHtml(file.content)
		return tokens.themes.flatMap((theme) =>
			page.text.flatMap((run) => contrastFailures(file.path, run, theme, tokens)),
		)
	})
}
