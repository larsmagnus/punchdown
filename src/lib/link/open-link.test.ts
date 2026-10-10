import { afterEach, describe, expect, it, vi } from 'vitest'

import { openLink } from '#src/lib/link/open-link'

describe('openLink', () => {
	afterEach(() => {
		delete window.vscode
	})

	it('posts an openLink message with the href', () => {
		const postMessage = vi.fn()
		window.vscode = { postMessage, getState: vi.fn(), setState: vi.fn() }

		openLink('./notes.md')

		expect(postMessage).toHaveBeenCalledWith({
			type: 'openLink',
			href: './notes.md',
		})
	})
})
