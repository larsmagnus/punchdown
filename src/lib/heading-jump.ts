import { createOnceJump } from '#src/lib/once-jump'
import { headingJumpSchema } from '#src/lib/schemas'
import type { HeadingJump } from '#src/shared/messages'

/**
 * The hash this note was opened on, if it was opened as a link's target.
 *
 * `window.headingJump` is injected ahead of the bundle and only then, so
 * its absence is the answer for most opens - there is no default to fall
 * back to, unlike `readScrollTop`. See `once-jump.ts` for the consume-once
 * contract this and `search-jump.ts` share.
 */
function injectedJump(): HeadingJump | undefined {
	if (!window.headingJump) return undefined

	const jump = headingJumpSchema.parse(window.headingJump)

	return jump.hash ? jump : undefined
}

const jump = createOnceJump({
	read: injectedJump,
	consumedKey: 'headingJumpConsumed',
})

export const hasHeadingJump = jump.has

/**
 * Every later caller gets `undefined` - a backgrounded tab coming back must
 * not be yanked to the same target a second time. The *live* `jumpToHeading`
 * message a later link click posts to an already-open panel is a separate
 * path (`use-heading-jump.ts`'s own subscription), not gated by this at
 * all: each one is a fresh jump, not a repeat of this one.
 */
export const takeHeadingJump = jump.take
