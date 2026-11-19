/** One viewport the browser checks judge, in CSS pixels. */
export interface Viewport {
	readonly height: number
	readonly width: number
}

/**
 * The two viewports every browser check judges: the desktop the Site is laid out at, and a phone.
 * The screenshot baselines name the phone `mobile`, so `e2e/visual.e2e.ts` maps this pair to its own
 * filenames and a shared definition renames nothing
 * ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
 */
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844 },
} as const satisfies Record<string, Viewport>
