/** The ways a Release snapshot, its feeds or a Language's date words can be rejected. One code per rule. */
export type ReleaseErrorCode =
	| "RELEASE_DATE_INVALID"
	| "RELEASE_MONTHS_INCOMPLETE"
	| "RELEASE_LANGUAGE_UNKNOWN"
	| "RELEASE_REGISTRY_UNREADABLE"
	| "RELEASE_PAYLOAD_UNREADABLE"

/** A rejected release rule: the rule's code, and the caller's own field name. */
export interface ReleaseError extends Error {
	readonly code: ReleaseErrorCode
	readonly field: string
}

/** The rejection of one release rule; `field` mirrors the caller's input path. */
export function releaseError(code: ReleaseErrorCode, field: string, message: string): ReleaseError {
	return Object.freeze(Object.assign(new Error(message), { code, field }))
}
