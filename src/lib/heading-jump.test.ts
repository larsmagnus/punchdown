import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { hasHeadingJump, takeHeadingJump } from '#src/lib/heading-jump'

const JUMP = { hash: 'title' }

/** A panel that actually remembers what `setState` wrote, as VS Code's does. */
function stubPanel() {
	let state: unknown
	window.vscode = {
		postMessage: vi.fn(),
		getState: () => state,
		setState: (next: unknown) => {
			state = next
		},
	}
}

beforeEach(stubPanel)

afterEach(() => {
	delete window.vscode
	delete window.headingJump
})

describe('takeHeadingJump', () => {
	it('hands back the hash the host injected', () => {
		window.headingJump = JUMP

		expect(takeHeadingJump()).toEqual(JUMP)
	})

	it('jumps to nothing on an ordinary open, where the host injected nothing', () => {
		expect(takeHeadingJump()).toBeUndefined()
		expect(hasHeadingJump()).toBe(false)
	})

	/**
	 * VS Code destroys the webview when a tab is backgrounded and rebuilds it
	 * from the HTML it already holds, so the injected jump comes back looking
	 * brand new every time the reader switches back.
	 */
	it('is owed only once, across a rebuild of the page', () => {
		window.headingJump = JUMP
		expect(takeHeadingJump()).toEqual(JUMP)

		expect(hasHeadingJump()).toBe(false)
		expect(takeHeadingJump()).toBeUndefined()
	})

	it('jumps to nothing when the payload is unusable', () => {
		window.headingJump = 'not a jump at all' as unknown as NonNullable<
			typeof window.headingJump
		>

		expect(takeHeadingJump()).toBeUndefined()
	})
})

describe('hasHeadingJump', () => {
	it('reports a jump without consuming it', () => {
		window.headingJump = JUMP

		expect(hasHeadingJump()).toBe(true)
		expect(hasHeadingJump()).toBe(true)
		expect(takeHeadingJump()).toEqual(JUMP)
	})
})
