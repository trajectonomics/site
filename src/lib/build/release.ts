import { LLMS_FULL_FILE } from "../crawl/llms-full"
import type { Dictionary } from "../language/dictionary"
import { languageEntry } from "../language/languages"
import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"
import { NOT_FOUND_PAGES } from "./not-found-pages"

/** Every version token a page prints: the tag form the pill and the release line name it in. */
const VERSION = /\bv\d+\.\d+\.\d+\b/g

/** The one version the pages may print, in the tag form the Release snapshot derives. */
const TAG = `v${RELEASE_SNAPSHOT.version}`

/** A file the rules judge, with the Dictionary whose release strings it must print, if it has a footer. */
interface CoveredPage {
	readonly file: BuiltFile
	readonly dictionary: Dictionary | undefined
}

/** Both Language homes, the three Not-found pages and the full Answer engine file, as the build wrote them. */
function coveredPages(files: readonly BuiltFile[]): readonly CoveredPage[] {
	const homes = builtHomes(files).map(({ entry, file }) => ({ file, dictionary: entry.dictionary }))
	const notFound = NOT_FOUND_PAGES.flatMap((page) => {
		const file = fileAt(files, page.path)
		return file === undefined ? [] : [{ file, dictionary: languageEntry(page.language).dictionary }]
	})
	const full = fileAt(files, LLMS_FULL_FILE)
	return [
		...homes,
		...notFound,
		...(full === undefined ? [] : [{ file: full, dictionary: undefined }]),
	]
}

/** Every version a page prints is the snapshot's: a page names one release, and never a second. */
function versionFailures(file: BuiltFile): readonly BuildFailure[] {
	const printed = [...file.content.matchAll(VERSION)].map((match) => match[0])
	const unknown = [...new Set(printed)].filter((tag) => tag !== TAG)
	return unknown.map((tag) =>
		buildFailure(
			"RELEASE_VERSION_UNKNOWN",
			file.path,
			`prints ${tag}; the Release snapshot names ${TAG}.`,
		),
	)
}

/** The footer's `<time>`, the element that carries the release day as text and as a machine date. */
function releaseTime(page: ScannedPage, footer: HtmlElement): HtmlElement | undefined {
	return elementsByTag(page, "time").find((element) => element.ancestors.includes(footer))
}

/** The footer names the release line and the release day the Dictionary writes, and the snapshot's own date. */
function footerFailures(file: BuiltFile, dictionary: Dictionary): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const footer = elementsByTag(page, "footer")[0]
	if (footer === undefined) return []
	const failures: BuildFailure[] = []
	if (!textOf(page, footer).includes(dictionary.releaseLine)) {
		failures.push(
			buildFailure(
				"RELEASE_LINE_NOT_NAMED",
				file.path,
				`the footer does not print "${dictionary.releaseLine}".`,
			),
		)
	}
	const time = releaseTime(page, footer)
	const shown = time === undefined ? "" : textOf(page, time)
	if (shown !== dictionary.releaseDate) {
		failures.push(
			buildFailure(
				"RELEASE_DATE_TEXT_NOT_NAMED",
				file.path,
				`the footer's <time> shows "${shown}" instead of "${dictionary.releaseDate}".`,
			),
		)
	}
	const machine = time?.attributes["datetime"] ?? ""
	if (machine !== RELEASE_SNAPSHOT.releasedOn) {
		failures.push(
			buildFailure(
				"RELEASE_DATE_MISMATCH",
				file.path,
				`the footer's <time> datetime is "${machine}" instead of "${RELEASE_SNAPSHOT.releasedOn}".`,
			),
		)
	}
	return failures
}

/**
 * Every covered page names the Release snapshot's version, its release line and its release day, so a
 * hand-written literal, a stale component and a Dictionaries-only edit all fail before merge. A page
 * with no footer is left to the landmark rule, which owns that failure.
 */
export function checkReleaseFacts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return coveredPages(files).flatMap(({ file, dictionary }) => [
		...versionFailures(file),
		...(dictionary === undefined ? [] : footerFailures(file, dictionary)),
	])
}
