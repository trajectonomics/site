import { FALLBACK_LANGUAGE } from "../language/language"
import { LANGUAGES, languageHomeFile } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { builtPages, fileAt } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The path the Site's one address is built at: the fallback Language's home (ADR 0020). */
const ROOT_DOCUMENT = languageHomeFile(FALLBACK_LANGUAGE)

/** The Language directories the build is allowed to write: a Language's own build path. */
const BUILD_PATHS: ReadonlySet<string> = new Set(
	LANGUAGES.map((entry) => entry.buildPath).filter((path) => path !== ""),
)

/** The directories that name a Language the build must not write under, because `/` is the address. */
const PREFIXED_DIRECTORIES: ReadonlySet<string> = new Set(
	LANGUAGES.map((entry) => entry.language).filter((language) => !BUILD_PATHS.has(language)),
)

/** The elements a page carries exactly one of: the router injects onto the landmarks, and a page has one title. */
const SINGLE_ELEMENTS = [
	{ tag: "head", code: "HEAD_NOT_SINGLE" },
	{ tag: "body", code: "BODY_NOT_SINGLE" },
	{ tag: "nav", code: "PAGE_NAV_COUNT" },
	{ tag: "main", code: "PAGE_MAIN_COUNT" },
	{ tag: "h1", code: "PAGE_H1_COUNT" },
] as const satisfies readonly { tag: string; code: BuildFailureCode }[]

/** Every one-count rule a page breaks, so one page can name more than its first broken landmark. */
function checkSingleElements(file: BuiltFile): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	return SINGLE_ELEMENTS.flatMap((rule) => {
		const count = elementsByTag(page, rule.tag).length
		if (count === 1) return []
		return [
			buildFailure(
				rule.code,
				pageUrl(file.path),
				`expected exactly one <${rule.tag}>, found ${count}.`,
			),
		]
	})
}

/** The root document is the Site's address, and no page is written under a Language prefix. */
function checkRoot(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	if (fileAt(files, ROOT_DOCUMENT) === undefined) {
		failures.push(
			buildFailure(
				"ROOT_DOCUMENT_MISSING",
				"/",
				"the build has no document at /, which is the Site's one address.",
			),
		)
	}
	for (const file of files) {
		const [directory] = file.path.split("/")
		if (directory === undefined || !PREFIXED_DIRECTORIES.has(directory)) continue
		failures.push(
			buildFailure(
				"PREFIXED_LANGUAGE_DIRECTORY",
				pageUrl(file.path),
				`is built under ${directory}/, but no address carries a Language prefix.`,
			),
		)
	}
	return failures
}

/** Every built page carries exactly one `head`, `body`, `nav`, `main` and `h1`, and `/` is one. */
export function checkStructure(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = [...checkRoot(files)]
	for (const file of builtPages(files)) failures.push(...checkSingleElements(file))
	return failures
}
