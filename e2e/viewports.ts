/** One viewport the browser checks judge, in CSS pixels. */
export interface Viewport {
	readonly height: number
	readonly width: number
}

/**
 * The desktop and phone the hero, rim, visual and accessibility checks judge. `e2e/visual.e2e.ts`
 * maps each one to its own `-desktop` / `-mobile` snapshot filename, so a shared definition renames
 * nothing ([ADR 0021](../docs/adr/0021-the-browser-checks-judge-a-phone-and-the-demo-output-wraps.md)).
 */
export const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844 },
} as const satisfies Record<string, Viewport>
