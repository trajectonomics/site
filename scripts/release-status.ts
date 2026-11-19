import type { ReleaseFeed, ReleaseStatus } from "../src/lib/site/release-feed"
import { releaseStatus } from "../src/lib/site/release-feed"
import { RELEASE_SNAPSHOT } from "../src/lib/site/release-snapshot"
import { readReleaseFeed } from "./adapters/release"

/** Where the committed snapshot stands, with the feed it was judged against and the line to print. */
export interface ReleaseCheck {
	readonly feed: ReleaseFeed
	readonly status: ReleaseStatus
	readonly message: string
}

/** The one line a check prints: current, waiting on the release, or behind it. */
export function describeStatus(status: ReleaseStatus, feed: ReleaseFeed): string {
	const site = `v${RELEASE_SNAPSHOT.version}`
	if (status === "waiting") {
		return `waiting on the release: npm's latest is ${feed.latest}, and v${feed.latest} has no published GitHub release yet`
	}
	if (status === "drift") return `Release drift: the Site names ${site}, latest is v${feed.latest}`
	return `the Site names ${site}, latest is v${feed.latest}`
}

/** Read both release feeds and say where the committed snapshot stands against them. */
export async function checkRelease(): Promise<ReleaseCheck> {
	const feed = await readReleaseFeed()
	const status = releaseStatus(RELEASE_SNAPSHOT, feed)
	return Object.freeze({ feed, status, message: describeStatus(status, feed) })
}
