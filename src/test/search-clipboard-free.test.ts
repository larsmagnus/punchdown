import * as assert from 'assert'

import * as vscode from 'vscode'

import { readSearchMatches } from '#src/host/read-search-match'
import { runSearch } from '#src/test/search-test-support'

/**
 * The clipboard-free jump path, which is the one meant to run on every open.
 *
 * `search.action.getSearchResults` names every match in a file without touching
 * the clipboard. When a file holds exactly one match there is nothing to
 * disambiguate, so that alone is enough to jump the right place - and the
 * clipboard, which `vscode.env.clipboard` can only round-trip as text, is left
 * alone.
 *
 * Searches the repo's own fixture notes rather than a temp file, so the counts
 * reflect real notes.
 */
suite('Clipboard-free search match', function () {
	this.timeout(60000)

	const workspace = vscode.workspace.workspaceFolders?.[0]

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors')
	})

	test("identifies a note's matches without reading the clipboard", async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')

		const clipboardBefore = 'a user copied this and must keep it'
		await vscode.env.clipboard.writeText(clipboardBefore)

		await runSearch('<input')
		const [match, ...rest] = await readSearchMatches(note)

		assert.ok(match, 'other-note.md holds a `<input` match')
		assert.strictEqual(rest.length, 0, 'and only the one')
		// `<input` sits on line 67, column 2 (1-based) of the fixture note.
		assert.strictEqual(match.line, 66, 'line, 0-based')
		assert.strictEqual(match.column, 1, 'column, 0-based')
		assert.strictEqual(
			await vscode.env.clipboard.readText(),
			clipboardBefore,
			'the clipboard must be untouched on this path'
		)
	})

	test('reports every match when a note holds several', async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')

		await runSearch('email')

		const matches = await readSearchMatches(note)

		assert.ok(
			matches.length > 1,
			`expected several matches, got ${matches.length}`
		)
	})

	test('finds nothing for a note with no matches, the ordinary open', async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')

		await runSearch('zzz-nothing-matches-this-zzz', { expectMatches: false })

		assert.deepStrictEqual(await readSearchMatches(note), [])
	})
})
