import type { Language } from "../language/language"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"

/** A page must declare the Language of the Locale URL it is served at, in `<html lang>`. */
export function checkDeclaredLanguage(
	file: BuiltFile,
	language: Language,
): readonly BuildFailure[] {
	const [html] = elementsByTag(scanHtml(file.content), "html")
	const declared = html?.attributes["lang"]
	if (declared?.toLowerCase() === language) return []
	return [
		buildFailure(
			"LANGUAGE_NOT_DECLARED",
			file.path,
			`declares <html lang="${declared ?? ""}">, not "${language}"; the browser breaks and speaks lines by it.`,
		),
	]
}
