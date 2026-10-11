import { createOnceJump } from '#src/lib/once-jump'
import { searchJumpSchema } from '#src/lib/schemas'
import type { SearchJump } from '#src/shared/messages'

/**
 * The match this note was opened on, if it was opened from a search result.
 *
 * `window.searchJump` is injected ahead of the bundle and only then, so its
 * absence is the answer for most opens - there is no default to fall back to,
 * unlike `readScrollTop`. See `once-jump.ts` for the consume-once contract
 * this and `heading-jump.ts` share.
 */
function injectedJump(): SearchJump | undefined {
	if (!window.searchJump) return undefined

	const jump = searchJumpSchema.parse(window.searchJump)

	// Every field catches to a default rather than throwing, so a payload that
	// degraded to empty text arrives looking valid. This is the one place that
	// can notice there is nothing to look for.
	return jump.text ? jump : undefined
}

const jump = createOnceJump({
	read: injectedJump,
	consumedKey: 'searchJumpConsumed',
})

export const hasSearchJump = jump.has

/**
 * Every later caller gets `undefined`, which is what keeps a backgrounded tab
 * coming back - or raw mode being toggled an hour later - from yanking the note
 * to a long-forgotten search match.
 */
export const takeSearchJump = jump.take
