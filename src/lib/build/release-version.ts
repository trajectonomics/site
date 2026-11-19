import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Every version token a page prints: the tag form the pill and the release line name it in. */
const VERSION = /\bv\d+\.\d+\.\d+\b/g

/** The one version the pages may print, in the tag form the Release snapshot derives. */
const TAG = `v${RELEASE_SNAPSHOT.version}`

/** Every version a page prints is the snapshot's: a page names one release, and never a second. */
export function versionFailures(file: BuiltFile): readonly BuildFailure[] {
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
