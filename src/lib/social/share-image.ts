import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import { SITE_NAME, SITE_ORIGIN } from "../site"
import {
	LOCKUP_HEIGHT,
	MARGIN,
	META_BASELINE,
	META_SIZE,
	ORIGIN_BASELINE,
	RULE_HEIGHT,
	RULE_WIDTH,
	ruleTop,
	SHARE_IMAGE_HEIGHT,
	SHARE_IMAGE_WIDTH,
	STATEMENT_SIZE,
	statementBaselines,
} from "./layout"
import { placedLockup, type ShareLockup } from "./lockup"
import type { ShareColours } from "./share-colours"
import { escapeXml, statementLines } from "./statement"

/** The most a share image may weigh, in bytes, so a card is fetched by a crawler and not by a page. */
export const SHARE_IMAGE_MAX_BYTES = 100_000

/** The media type every share sheet reads a large card's image as. */
export const SHARE_IMAGE_TYPE = "image/png"

/** The face the statement is set in: the Brand Typeface, with the Thai face the Theme names after it. */
const STATEMENT_FAMILY = "Aleo, Noto Sans Thai"

/** The face the meta layer is set in, with the same Thai face behind it. */
const META_FAMILY = "Azeret Mono, Noto Sans Thai"

/** The host a visitor types, without its scheme: the line under the statement. */
const HOST = SITE_ORIGIN.replace(/^https?:\/\//, "")

/** Everything one Language's share image is composed from: its words, its colours, and the lockup. */
export interface ShareImageInput {
	readonly language: Language
	readonly dictionary: Dictionary
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/** One Language's share image: the file it is written to, its pixel size, and the SVG that draws it. */
export interface ShareImage {
	readonly path: string
	readonly width: number
	readonly height: number
	readonly svg: string
}

/** The path one Language's share image is written to, relative to the Worker's assets root. */
export function shareImagePath(language: Language): string {
	return `og/${language}.png`
}

/** That path on the Site's own origin: the absolute form `og:image` and `twitter:image` need. */
export function absoluteShareImageUrl(language: Language): string {
	return `${SITE_ORIGIN}/${shareImagePath(language)}`
}

/** What the image shows, for a reader who cannot see it: the wordmark, and the value statement. */
export function shareImageAlt(dictionary: Dictionary): string {
	return `${SITE_NAME} — ${dictionary.description}`
}

/** One line of the statement, at its own baseline. */
function lineMarkup(text: string, baseline: number, colour: string): string {
	return `<text x="${MARGIN}" y="${baseline}" font-family="${STATEMENT_FAMILY}" font-size="${STATEMENT_SIZE}" fill="${colour}">${escapeXml(text)}</text>`
}

/** Every line of the statement, laid out upwards from the last baseline, in the Theme's ink. */
function statementMarkup(colours: ShareColours, lines: readonly string[]): string {
	const baselines = statementBaselines(lines.length)
	return lines
		.map((text, index) => lineMarkup(text, baselines[index] ?? 0, colours.foreground))
		.join("")
}

/**
 * One Language's share image: the Theme's own colours, the brand lockup, the Language's value statement
 * and the host under it, at the size every share sheet cuts a large card to.
 */
export function shareImage(input: ShareImageInput): ShareImage {
	const { colours } = input
	const lines = statementLines(input.dictionary.description)
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}">`,
		`<rect width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" fill="${colours.background}"/>`,
		placedLockup(input.lockup, MARGIN, MARGIN, LOCKUP_HEIGHT, colours.foreground),
		`<text x="${SHARE_IMAGE_WIDTH - MARGIN}" y="${META_BASELINE}" text-anchor="end" font-family="${META_FAMILY}" font-size="${META_SIZE}" fill="${colours.mutedForeground}">${escapeXml(input.dictionary.languageName)}</text>`,
		`<rect x="${MARGIN}" y="${ruleTop(lines.length)}" width="${RULE_WIDTH}" height="${RULE_HEIGHT}" fill="${colours.accent}"/>`,
		statementMarkup(colours, lines),
		`<text x="${MARGIN}" y="${ORIGIN_BASELINE}" font-family="${META_FAMILY}" font-size="${META_SIZE}" fill="${colours.mutedForeground}">${escapeXml(HOST)}</text>`,
		"</svg>",
	].join("\n")
	return Object.freeze({
		path: shareImagePath(input.language),
		width: SHARE_IMAGE_WIDTH,
		height: SHARE_IMAGE_HEIGHT,
		svg,
	})
}
