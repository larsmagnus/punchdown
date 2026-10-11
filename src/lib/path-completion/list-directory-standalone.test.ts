import { describe, expect, it } from 'vitest'

import { listDirectory } from '#src/lib/path-completion/list-directory'

describe('listDirectory outside VS Code', () => {
	it.each(['', './', '/'])('lists the demo notes for %j', async (directory) => {
		expect(await listDirectory(directory)).toContainEqual({
			name: 'other-note.md',
			kind: 'file',
		})
	})

	it('lists nothing for a nested folder', async () => {
		expect(await listDirectory('docs/')).toEqual([])
	})
})
