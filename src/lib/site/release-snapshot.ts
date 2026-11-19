import type { Language } from "../language/language"
import { type ReleaseFacts, type ReleaseSnapshot, releaseError, releaseFacts } from "./release"
import raw from "./release.json" with { type: "json" }

/** The committed snapshot `bun run release:update` writes: the release facts every page prints. */
export const RELEASE_SNAPSHOT: ReleaseSnapshot = Object.freeze({
	version: raw.version,
	releasedOn: raw.releasedOn,
	asOf: raw.asOf,
})

/**
 * The month words each Language writes a release day with, January first. A new Language adds one
 * row here and gets its release strings by construction; no page holds a second copy of them.
 */
export const RELEASE_MONTHS: Readonly<Record<string, readonly string[]>> = Object.freeze({
	en: Object.freeze([
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	]),
	th: Object.freeze([
		"ม.ค.",
		"ก.พ.",
		"มี.ค.",
		"เม.ย.",
		"พ.ค.",
		"มิ.ย.",
		"ก.ค.",
		"ส.ค.",
		"ก.ย.",
		"ต.ค.",
		"พ.ย.",
		"ธ.ค.",
	]),
})

/** One Language's release strings, from the committed snapshot and that Language's date words. */
export function releaseFor(language: Language): ReleaseFacts {
	const months = RELEASE_MONTHS[language]
	if (months === undefined) {
		throw releaseError(
			"RELEASE_MONTHS_INCOMPLETE",
			"language",
			`the Site has no release day words for ${language}.`,
		)
	}
	return releaseFacts(RELEASE_SNAPSHOT, months)
}
