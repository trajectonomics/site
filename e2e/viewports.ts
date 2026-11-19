/** One viewport the browser checks judge, in CSS pixels. */
export interface Viewport {
	readonly height: number
	readonly width: number
}

/**
 * The two viewports every browser check judges: the desktop the Site is laid out at, and a phone.
 * The keys are also the names the screenshot baselines carry, so neither moves when a check reads
 * them ([ADR 0021](./docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
 */
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const satisfies Record<string, Viewport>
