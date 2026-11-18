import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import { LANGUAGES } from "../src/lib/language/languages"
import { shareColours } from "../src/lib/social/share-colours"
import { type ShareImage, shareImage } from "../src/lib/social/share-image"
import { readDesignTokens } from "./adapters/design-tokens"
import { readShareLockup } from "./adapters/share-lockup"
import { BRAND_FACES, brandFontsSource } from "./copy-fonts"

/**
 * The Thai face the repository commits for its visual baselines, which are the one thing in the tree
 * that renders Thai: the Site ships no Thai file, so the Theme names this family and the visitor's own
 * face draws it ([ADR 0005](../docs/adr/0005-page-weight-and-web-font-budget.md)).
 */
const THAI_FACE = fileURLToPath(new URL("../e2e/fonts/NotoSansThai.ttf", import.meta.url))

/** The font files the rasterizer draws text through: the Brand Typeface, then the Thai face. */
export function shareImageFonts(source: string = brandFontsSource()): readonly string[] {
	return Object.freeze([...BRAND_FACES.map((face) => join(source, face)), THAI_FACE])
}

/** The PNG one composed share image rasterizes to, with its own fonts and no system font consulted. */
export function renderShareImage(image: ShareImage, fonts: readonly string[]): Uint8Array {
	const resvg = new Resvg(image.svg, {
		font: { fontFiles: [...fonts], loadSystemFonts: false, defaultFontFamily: "Aleo" },
	})
	return resvg.render().asPng()
}

/**
 * Writes one share image per Language into the Site's static directory, and returns the language codes
 * it wrote: the words come from the Dictionaries, the colours from the pinned Theme, the lockup from the
 * assets package, so no part of the picture is written twice.
 */
export async function writeShareImages(destination: string): Promise<readonly string[]> {
	const colours = shareColours(await readDesignTokens())
	const lockup = await readShareLockup()
	const fonts = shareImageFonts()
	await mkdir(destination, { recursive: true })
	for (const entry of LANGUAGES) {
		const image = shareImage({
			language: entry.language,
			dictionary: entry.dictionary,
			colours,
			lockup,
		})
		const png = renderShareImage(image, fonts)
		const path = join(destination, `${entry.language}.png`)
		await writeFile(path, png)
		const written = Bun.file(path)
		if (!(await written.exists()) || written.size !== png.length) {
			throw new Error(`share-image: ${path} was not written in full.`)
		}
	}
	return Object.freeze(LANGUAGES.map((entry) => entry.language))
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public/og", import.meta.url))
	const languages = await writeShareImages(destination)
	console.log(`share-image: ${languages.join(", ")} in ${destination}`)
}
