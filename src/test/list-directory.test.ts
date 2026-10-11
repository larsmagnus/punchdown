import * as assert from 'assert'

import { listedNames } from '#src/test/list-directory-test-support'
import { workspaceUri } from '#src/test/note-index-test-support'

suite('Path completion directory listing', () => {
	const sampleNote = workspaceUri('public', 'notes.md')

	test('lists the note’s own folder for an empty path', async () => {
		const listed = await listedNames(sampleNote, '')

		assert.ok(listed.includes('other-note.md'), listed.join(', '))
	})

	test('climbs out of the note’s folder with ../', async () => {
		const listed = await listedNames(sampleNote, '../')

		assert.ok(listed.includes('src/'), listed.join(', '))
		assert.ok(listed.includes('package.json'), listed.join(', '))
	})

	test('anchors a leading slash at the workspace folder', async () => {
		const listed = await listedNames(sampleNote, '/src/')

		assert.ok(listed.includes('host.ts'), listed.join(', '))
	})

	test('lists nothing for a folder that does not exist', async () => {
		assert.deepStrictEqual(await listedNames(sampleNote, 'no-such-folder/'), [])
	})
})
