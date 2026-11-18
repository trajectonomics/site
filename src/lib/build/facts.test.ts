import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { checkFacts } from "./facts"
import { factsStrip, heroCodes, heroHome } from "./testing/hero"

describe("the three facts above the install window", () => {
	it("passes a home that states every fact above the window", () => {
		expect(heroCodes(checkFacts)).toEqual([])
	})

	it("passes the Thai home, whose facts are Thai", () => {
		expect(heroCodes(checkFacts, heroHome("th"))).toEqual([])
	})

	it("fails a home that states no facts at all", () => {
		expect(heroCodes(checkFacts, heroHome("en", { facts: "" }))).toEqual(["PAGE_FACTS_MISSING"])
	})

	it("names every fact the home leaves out", () => {
		const dictionary = dictionaryFor("en")
		const failure = checkFacts([heroHome("en", { facts: "" })])[0]
		for (const text of dictionary.factTexts) {
			expect(failure?.message).toContain(text)
		}
	})

	it("fails a home that states some of the facts and not the rest", () => {
		const dictionary = dictionaryFor("en")
		const partial = factsStrip({ ...dictionary, factTexts: dictionary.factTexts.slice(0, 2) })
		expect(heroCodes(checkFacts, heroHome("en", { facts: partial }))).toEqual([
			"PAGE_FACTS_MISSING",
		])
	})

	it("fails a home that states the facts below the install window, where a visitor reads them too late", () => {
		const dictionary = dictionaryFor("en")
		const page = heroHome("en", { facts: "" })
		const content = page.content.replace("</main>", `${factsStrip(dictionary)}</main>`)
		expect(checkFacts([{ path: page.path, content }])).toEqual([
			expect.objectContaining({ code: "PAGE_FACTS_BELOW_WINDOW" }),
		])
	})
})
