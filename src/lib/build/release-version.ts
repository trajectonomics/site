import { RELEASE_SNAPSHOT } from "../site/release-snapshot"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Every version token a page prints: the tag form the pill and the release line name it in. */
const VERSION = /\bv\d+\.\d+\.\d+\b/g

/** The one version the pages may print, in the tag form the Release snapshot derives. */
const TAG = `v${RELEASE_SNAPSHOT.version}`

/** Every version a page prints is the snapshot's, and a page that prints none names no release at all. */
export function versionFailures(file: BuiltFile): readonly BuildFailure[] {
	const printed = [...new Set([...file.content.matchAll(VERSION)].map((match) => match[0]))]
	if (printed.length === 0) {
		return [
			buildFailure(
				"RELEASE_VERSION_UNKNOWN",
				file.path,
				`names no version; the Release snapshot names ${TAG}.`,
			),
		]
	}
	return printed
		.filter((tag) => tag !== TAG)
		.map((tag) =>
			buildFailure(
				"RELEASE_VERSION_UNKNOWN",
				file.path,
				`prints ${tag}; the Release snapshot names ${TAG}.`,
			),
		)
}
