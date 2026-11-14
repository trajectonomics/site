import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { scanHtml, type TextRun } from "./html"
import { pageUrl } from "./page-url"

const THAI_SCRIPT = /[\u0E00-\u0E7F]/

/** The Language a text run inherits: the nearest ancestor that declares one. */
function languageOf(run: TextRun): string | undefined {
	const declared = [...run.ancestors]
		.reverse()
		.find((ancestor) => ancestor.attributes["lang"] !== undefined)
	return declared?.attributes["lang"]
}

/** Whether a declared Language is Thai, or a Thai variant such as `th-TH`. */
function speaksThai(language: string | undefined): boolean {
	return (language ?? "").toLowerCase().startsWith("th")
}

/** Thai text is spoken correctly only when the Language it inherits is Thai, `html` included. */
function failuresOf(file: BuiltFile): readonly BuildFailure[] {
	const unmarked = scanHtml(file.content).text.find(
		(run) => THAI_SCRIPT.test(run.text) && !speaksThai(languageOf(run)),
	)
	if (unmarked === undefined) return []
	return [
		buildFailure(
			"THAI_TEXT_LANGUAGE_WRONG",
			pageUrl(file.path),
			`Thai text "${unmarked.text.trim().slice(0, 40)}" inherits no ancestor whose lang starts with "th".`,
		),
	]
}

/** Every run of Thai script on a built page inherits a Language that is Thai. */
export function checkThaiTextLanguage(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap(failuresOf)
}
