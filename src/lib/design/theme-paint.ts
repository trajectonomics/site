import type { DesignTokens } from "./tokens"

/** The device schemes `prefers-color-scheme` names, which are also the names a Theme is published under. */
const SCHEMES = ["light", "dark"] as const

/** The Semantic Token Role the browser's own bar carries: the surface behind the fixed header. */
const BAR_ROLE = "background"

/** One browser bar paint: the published Theme it follows, the device scheme's media query, and its colour. */
export interface ThemePaint {
	/** The published Theme the device scheme names: `light` or `dark`. */
	readonly theme: string
	/** The media query that follows that device scheme. */
	readonly media: string
	/** The published colour of the Theme's `background` role. */
	readonly colour: string
}

/**
 * One paint per published Theme a device scheme names, at the `background` colour the pinned Theme
 * CSS publishes. A Theme the device has no scheme for, or one that publishes no `background`, has no
 * paint: the browser bar follows the Theme the page paints its header with, and nothing else.
 */
export function themePaints(tokens: DesignTokens): readonly ThemePaint[] {
	return SCHEMES.flatMap((scheme) => {
		const theme = tokens.themes.find((published) => published.name === scheme)
		const colour = theme?.colours[BAR_ROLE]
		if (colour === undefined) return []
		return [Object.freeze({ theme: scheme, media: `(prefers-color-scheme: ${scheme})`, colour })]
	})
}
