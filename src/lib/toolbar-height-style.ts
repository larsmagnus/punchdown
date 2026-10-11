import type { CSSProperties } from 'react'

/** The toolbar's own height, matching `toolbar.tsx`'s padding and button size. */
const TOOLBAR_HEIGHT = '3.5rem'

/**
 * The scroll container's `--toolbar-height`, for anything laid out around the
 * toolbar - `0px` once `hideToolbar` removes it entirely, so nothing leaves a
 * gap where it used to be.
 */
export function toolbarHeightStyle(hideToolbar: boolean): CSSProperties {
	return {
		'--toolbar-height': hideToolbar ? '0px' : TOOLBAR_HEIGHT,
	} as CSSProperties
}
