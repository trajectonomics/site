import { describe, expect, it } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pngPixels } from "../src/lib/build/image-pixels"
import { dictionaryFor, LANGUAGES } from "../src/lib/language/languages"
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "../src/lib/social/layout"
import { shareColours } from "../src/lib/social/share-colours"
import { SHARE_IMAGE_MAX_BYTES, shareImage } from "../src/lib/social/share-image"
import { readDesignTokens } from "./adapters/design-tokens"
import { readShareLockup } from "./adapters/share-lockup"
import { renderShareImage, shareImageFonts, writeShareImages } from "./share-image"

/** The card every share image must be cut at, which the checks hold it to. */
const CARD = Object.freeze({ width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT })

/** The one Language whose composition the render is judged on. */
const LANGUAGE = LANGUAGES[0]?.language ?? "en"

/** One composed image, from the pinned Theme and the shipped lockup, as the prebuild step builds it. */
async function composedImage(language: string = LANGUAGE) {
	return shareImage({
		language,
		dictionary: dictionaryFor(language),
		colours: shareColours(await readDesignTokens()),
		lockup: await readShareLockup(),
	})
}

describe("the fonts a share image is rasterized through", () => {
	it("names the three Brand Typeface files and the Thai face the repository commits", () => {
		const fonts = shareImageFonts()
		expect(fonts).toHaveLength(4)
		for (const path of fonts) expect(Bun.file(path).size).toBeGreaterThan(0)
	})
})

describe("the PNG a share image rasterizes to", () => {
	it("is the card's own size and light enough for a crawler to fetch", async () => {
		const png = renderShareImage(await composedImage(), shareImageFonts())
		expect(pngPixels(png)).toEqual(CARD)
		expect(png.length).toBeLessThan(SHARE_IMAGE_MAX_BYTES)
	})

	it("prints the same bytes twice, so a rebuild does not touch the file", async () => {
		const fonts = shareImageFonts()
		const image = await composedImage()
		expect(renderShareImage(image, fonts)).toEqual(renderShareImage(image, fonts))
	})

	it("draws the two Languages as two different pictures", async () => {
		const fonts = shareImageFonts()
		const thai = renderShareImage(await composedImage("th"), fonts)
		const english = renderShareImage(await composedImage("en"), fonts)
		expect(pngPixels(thai)).toEqual(CARD)
		expect(pngPixels(english)).toEqual(CARD)
		expect(thai).not.toEqual(english)
	})
})

describe("the share images the prebuild step writes", () => {
	it("writes one PNG per Language, at the card's size, into the static directory", async () => {
		const destination = await mkdtemp(join(tmpdir(), "share-image-"))
		try {
			const languages = await writeShareImages(destination)
			expect(languages).toEqual(LANGUAGES.map((entry) => entry.language))
			for (const language of languages) {
				const png = await Bun.file(join(destination, `${language}.png`)).bytes()
				expect(pngPixels(png)).toEqual(CARD)
			}
		} finally {
			await rm(destination, { recursive: true, force: true })
		}
	})
})
