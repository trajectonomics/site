/** The committed Release snapshot: the CLI's stable version, the day it was released, and the day it was read. */
export interface ReleaseSnapshot {
	/** The bare semver a visitor installs, as npm's `latest` names it: `0.2.0`. */
	readonly version: string
	/** The release day as a UTC ISO calendar date: `2026-11-17`. */
	readonly releasedOn: string
	/** The day the snapshot was read, as an ISO calendar date. */
	readonly asOf: string
}

/** The release strings one Language prints, and the machine-readable date beside them. */
export interface ReleaseFacts {
	/** The pill's first run: the version in its tag form, `v0.2.0`. */
	readonly heroVersion: string
	/** The footer's release line: the version and both part names. */
	readonly releaseLine: string
	/** The release day as the Language writes it, `17 Nov 2026`. */
	readonly releaseDate: string
	/** The release day as `<time datetime>` carries it, the snapshot's own ISO date. */
	readonly datetime: string
}

/** The two part names the release line carries: the same words in every Language, like the version. */
const CLI_PART = "traj CLI"
const ONBOARDING_PART = "traj-onboarding"

/** The ways a Release snapshot and a Language's date words can be rejected. One code per rule. */
export type ReleaseErrorCode =
	| "RELEASE_DATE_INVALID"
	| "RELEASE_MONTHS_INCOMPLETE"
	| "RELEASE_REGISTRY_UNREADABLE"
	| "RELEASE_PAYLOAD_UNREADABLE"

/** A rejected Release snapshot: the rule's code, and the caller's own field name. */
export interface ReleaseError extends Error {
	readonly code: ReleaseErrorCode
	readonly field: string
}

/** The rejection of one release rule; `field` mirrors the caller's input path. */
export function releaseError(code: ReleaseErrorCode, field: string, message: string): ReleaseError {
	return Object.freeze(Object.assign(new Error(message), { code, field }))
}

/** A calendar date split into the parts a Language writes: no `Date`, so no clock and no locale. */
interface CalendarDay {
	readonly year: string
	readonly month: number
	readonly day: number
}

/** Twelve months of words: what a Language's date table holds, January first. */
const MONTHS_PER_YEAR = 12

/** The bare `YYYY-MM-DD` shape the snapshot and every feed date take. */
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** One release day's parts, or the rejection of a value that is not a calendar date. */
export function calendarDay(date: string, field: string): CalendarDay {
	const match = CALENDAR_DATE.exec(date)
	const month = Number(match?.[2])
	const day = Number(match?.[3])
	if (match === null || month < 1 || month > MONTHS_PER_YEAR || day < 1) {
		throw releaseError("RELEASE_DATE_INVALID", field, `"${date}" is not a calendar date.`)
	}
	return Object.freeze({ year: match[1] ?? "", month, day })
}

/**
 * The release strings one Language prints, from the snapshot and that Language's twelve month words.
 * The version and the part names are Language-neutral; only the month word is the Language's own.
 */
export function releaseFacts(snapshot: ReleaseSnapshot, months: readonly string[]): ReleaseFacts {
	const day = calendarDay(snapshot.releasedOn, "releasedOn")
	const month = months[day.month - 1]
	if (months.length !== MONTHS_PER_YEAR || month === undefined) {
		throw releaseError(
			"RELEASE_MONTHS_INCOMPLETE",
			"months",
			`a Language writes a release day with ${MONTHS_PER_YEAR} month words, not ${months.length}.`,
		)
	}
	return Object.freeze({
		heroVersion: `v${snapshot.version}`,
		releaseLine: `v${snapshot.version} — ${CLI_PART} + ${ONBOARDING_PART}`,
		releaseDate: `${day.day} ${month} ${day.year}`,
		datetime: snapshot.releasedOn,
	})
}
