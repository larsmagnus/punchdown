import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebviewToHost } from '#src/shared/messages'

const sent: WebviewToHost[] = []
const listeners = new Set<(message: unknown) => void>()

vi.mock('#src/lib/webview-host', () => ({
	host: {
		isVSCode: true,
		send: (message: WebviewToHost) => sent.push(message),
		on: (_kind: string, listener: (message: unknown) => void) => {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
	},
}))

function answer(requestId: number, names: string[]) {
	for (const listener of listeners) {
		listener({
			type: 'directoryListing',
			requestId,
			entries: names.map((name) => ({ name, kind: 'file' })),
		})
	}
}

function requestIdFor(directory: string) {
	const request = sent.find(
		(message) =>
			message.type === 'listDirectory' && message.directory === directory
	)
	return request?.type === 'listDirectory' ? request.requestId : -1
}

describe('listDirectory', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.resetModules()
		sent.length = 0
		listeners.clear()
	})

	async function load() {
		return (await import('#src/lib/path-completion/list-directory'))
			.listDirectory
	}

	it('resolves each folder with its own answer, whatever order they arrive in', async () => {
		const listDirectory = await load()
		const docs = listDirectory('docs/')
		const assets = listDirectory('assets/')

		answer(requestIdFor('assets/'), ['diagram.png'])
		answer(requestIdFor('docs/'), ['setup.md'])

		await expect(docs).resolves.toEqual([{ name: 'setup.md', kind: 'file' }])
		await expect(assets).resolves.toEqual([
			{ name: 'diagram.png', kind: 'file' },
		])
	})

	it('reuses a recent answer, and asks again once it has gone stale', async () => {
		const listDirectory = await load()
		void listDirectory('docs/')
		answer(requestIdFor('docs/'), ['setup.md'])
		vi.advanceTimersByTime(4_000)
		void listDirectory('docs/')
		expect(sent).toHaveLength(1)

		vi.advanceTimersByTime(1_000)
		void listDirectory('docs/')
		expect(sent).toHaveLength(2)
	})
})
