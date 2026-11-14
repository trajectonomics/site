/** The lowest mobile Lighthouse performance score a page may have. */
export const PERFORMANCE_MIN_SCORE = 0.95

/** The runs one page is measured by; the median decides, and a missing score fails. */
export const PERFORMANCE_RUNS = 3

/** Stable codes for every way a page can fail the mobile performance check. */
export type PerformanceFailureCode = "LIGHTHOUSE_SCORE_MISSING" | "LIGHTHOUSE_SCORE_TOO_LOW"

/** One failed performance rule: the code, the page it concerns and a line a maintainer can act on. */
export interface PerformanceFailure {
	readonly code: PerformanceFailureCode
	readonly path: string
	readonly message: string
}

/** The middle score of the runs, or `undefined` when a run has no score at all. */
export function medianScore(scores: readonly (number | undefined)[]): number | undefined {
	if (scores.length !== PERFORMANCE_RUNS) return undefined
	const present = scores.filter((score): score is number => score !== undefined)
	if (present.length !== PERFORMANCE_RUNS) return undefined
	const sorted = [...present].sort((left, right) => left - right)
	return sorted[Math.floor(sorted.length / 2)]
}

/** One page's failures: a missing score fails before its median is judged against the minimum. */
export function checkPerformance(
	path: string,
	scores: readonly (number | undefined)[],
): readonly PerformanceFailure[] {
	const median = medianScore(scores)
	if (median === undefined) {
		return [
			{
				code: "LIGHTHOUSE_SCORE_MISSING",
				path,
				message: `Lighthouse returned ${scores.length} run(s) without a full performance score.`,
			},
		]
	}
	if (median < PERFORMANCE_MIN_SCORE) {
		return [
			{
				code: "LIGHTHOUSE_SCORE_TOO_LOW",
				path,
				message: `median mobile performance is ${median}, below ${PERFORMANCE_MIN_SCORE}.`,
			},
		]
	}
	return []
}
