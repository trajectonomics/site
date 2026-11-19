import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describeStatus } from "./release-status"

/** The Release snapshot's Pure Cores and the built-file rules that judge them, relative to this script. */
const CORE = [
	join("src", "lib", "site", "release.ts"),
	join("src", "lib", "site", "release-snapshot.ts"),
	join("src", "lib", "site", "release-feed.ts"),
	join("src", "lib", "build", "release.ts"),
]

/** The clock, the host locale and the network: the three an offline build and a fixture test cannot have. */
const IMPURE = /\b(fetch\(|new Date|Date\.now|Intl\.|Math\.random|process\.env)/

describe("the Release snapshot's core", () => {
	it("reads no clock, no host locale and no network, so a build stays offline and a page stays fixed", () => {
		for (const path of CORE) {
			const source = readFileSync(join(import.meta.dir, "..", path), "utf8")
			expect({ path, impure: IMPURE.exec(source)?.[0] }).toEqual({ path, impure: undefined })
		}
	})

	it("is the only place a release fact enters the Site, so no page holds a second copy", () => {
		const snapshot = JSON.parse(
			readFileSync(join(import.meta.dir, "..", "src", "lib", "site", "release.json"), "utf8"),
		) as Record<string, unknown>
		expect(Object.keys(snapshot).sort()).toEqual(["asOf", "releasedOn", "version"])
	})
})

describe("where the snapshot stands, in one line", () => {
	it("says the Site names the release npm publishes when the snapshot is current", () => {
		const message = describeStatus("current", { latest: "0.2.0", releasedOn: "2026-11-17" })
		expect(message).toContain("v0.2.0")
		expect(message.startsWith("the Site names")).toBe(true)
	})

	it("waits while npm's latest has no published release, and never calls that drift", () => {
		const message = describeStatus("waiting", { latest: "9.9.9", releasedOn: undefined })
		expect(message).toContain("waiting")
		expect(message).toContain("9.9.9")
		expect(message.includes("Release drift")).toBe(false)
	})

	it("opens with Release drift and names both versions when the snapshot is behind", () => {
		const message = describeStatus("drift", { latest: "9.9.9", releasedOn: "2027-01-05" })
		expect(message.startsWith("Release drift:")).toBe(true)
		expect(message).toContain("v9.9.9")
	})
})
