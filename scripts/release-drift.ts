/**
 * Reports a stale Release snapshot as one GitHub issue.
 *
 *   bun release-drift.ts
 *
 * `.github/workflows/release-drift.yml` runs it weekly and by hand. It opens, updates or closes the
 * issue titled "Release drift: ..." and stays green: a snapshot the owner has not refreshed yet is a
 * report, not a red run. It opens no branch and merges nothing.
 */
import { $ } from "bun"
import { RELEASE_SNAPSHOT } from "../src/lib/site/release-snapshot"
import { checkRelease, type ReleaseCheck } from "./release-status"

/** The prefix every drift issue's title starts with, so one open issue is found and no second is filed. */
const TITLE_PREFIX = "Release drift:"

/** What closes an issue whose drift a later run no longer finds. */
const NOTHING_STALE =
	"The Site names the release npm publishes again, so this issue closes itself (`bun run release:check`)."

/** One GitHub issue, as `gh issue list` writes it. */
interface Issue {
	readonly number: number
	readonly title: string
}

/** The issue's title: both versions, so a stale title is visible in the list. */
function title(check: ReleaseCheck): string {
	return `${TITLE_PREFIX} the Site names v${RELEASE_SNAPSHOT.version}, latest is v${check.feed.latest}`
}

/** The issue's body: what drifted, the two versions, and the one command that repairs it. */
function body(check: ReleaseCheck): string {
	const { version, releasedOn, asOf } = RELEASE_SNAPSHOT
	return [
		"The Site prints one release, from the committed Release snapshot in `src/lib/site/release.json`,",
		"and that snapshot is behind the release npm publishes.",
		"",
		`- The snapshot names \`v${version}\`, released ${releasedOn}, read ${asOf}.`,
		`- npm's \`latest\` is \`${check.feed.latest}\`, released ${check.feed.releasedOn ?? "unknown"}.`,
		"",
		"Run `bun run release:update`, then open the pull request it produces. Every page's version, release",
		"line and date come from that one file, and `bun run check` fails a page that names any other.",
		"",
		"If this issue is still open when the snapshot is current again, the next weekly run closes it.",
	].join("\n")
}

/** The one open issue whose title carries the prefix, so a second drift never opens a second issue. */
async function findIssue(): Promise<Issue | undefined> {
	const listed = await $`gh issue list --state open --limit 1000 --json number,title`.text()
	const issues = JSON.parse(listed) as readonly Issue[]
	return issues.find((issue) => issue.title.startsWith(TITLE_PREFIX))
}

async function main(): Promise<void> {
	const check = await checkRelease()
	const issue = await findIssue()
	console.log(`release:drift: ${check.message}`)
	if (check.status === "current") {
		if (issue !== undefined)
			await $`gh issue close ${issue.number} --comment ${NOTHING_STALE}`.quiet()
		return
	}
	if (check.status === "waiting") return
	if (issue === undefined) {
		const opened = await $`gh issue create --title ${title(check)} --body ${body(check)}`.text()
		console.log(opened.trim())
		return
	}
	await $`gh issue edit ${issue.number} --title ${title(check)} --body ${body(check)}`.quiet()
	console.log(`release:drift: updated #${issue.number}`)
}

if (import.meta.main) await main()
