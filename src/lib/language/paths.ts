import { FALLBACK_LANGUAGE } from "./language"
import { LANGUAGES } from "./languages"

/** The props a Language page is built with: the Language of the build path it lands at. */
export interface LanguagePageProps {
	readonly language: string
}

/** One route the build produces for a Language page. */
export interface LanguagePath {
	readonly params: { readonly lang: string }
	readonly props: LanguagePageProps
}

/**
 * The routes a Language page is built for besides the Site's address: every Language but the
 * fallback, which the build writes to the assets root instead.
 */
export function languagePaths(): readonly LanguagePath[] {
	return LANGUAGES.filter((entry) => entry.language !== FALLBACK_LANGUAGE).map((entry) => ({
		params: { lang: entry.language },
		props: { language: entry.language },
	}))
}
