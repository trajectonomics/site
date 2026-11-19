import { ROBOTS_FILE } from "../crawl/robots"
import { SITEMAP_FILE } from "../crawl/sitemap"
import type { Probe } from "./probe"
import {
	answered,
	choice,
	home,
	moved,
	PAGE_MEDIA,
	ROBOTS_MEDIA,
	SITEMAP_MEDIA,
} from "./probe-requests"

export type { Probe, ProbeFailure, ProbeFailureCode, ProbeResponse } from "./probe"
export { NO_BODY } from "./probe-requests"

/**
 * Every probe the local Worker must answer: the address in each Language the four inputs choose,
 * the choice link, every old prefix, both kinds of miss and both Crawler files.
 */
export const PROBES: readonly Probe[] = Object.freeze([
	home("en"),
	home("th", { acceptLanguage: "th" }),
	home("th", { country: "TH" }),
	home("th", { cookie: "traj_lang=th" }),
	home("en", { acceptLanguage: "en", country: "TH" }),
	home("en", { cookie: "traj_lang=../../etc/passwd" }),
	home("en", { cookie: "traj_lang=zz" }),
	choice("th"),
	choice("en"),
	choice(null),
	moved("/en"),
	moved("/en/"),
	moved("/en/anything"),
	moved("/th"),
	moved("/th/"),
	moved("/th/anything"),
	answered("/no-such-page", 404, "en", PAGE_MEDIA),
	answered("/__mf-preload.js", 404, null, PAGE_MEDIA),
	answered(`/${SITEMAP_FILE}`, 200, null, SITEMAP_MEDIA),
	answered(`/${ROBOTS_FILE}`, 200, null, ROBOTS_MEDIA),
])
