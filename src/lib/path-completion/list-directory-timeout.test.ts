import { describe, expect, it, vi } from 'vitest'

import { listDirectory } from '#src/lib/path-completion/list-directory'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock('#src/lib/webview-host', () => ({
	host: { isVSCode: true, send, on: () => () => {} },
}))

describe('listDirectory when the host never answers', () => {
	it('lists nothing, and asks afresh next time', async () => {
		vi.useFakeTimers()
		const docs = listDirectory('docs/')
		vi.advanceTimersByTime(3_000)
		await expect(docs).resolves.toEqual([])

		void listDirectory('docs/')
		expect(send).toHaveBeenCalledTimes(2)
	})
})
