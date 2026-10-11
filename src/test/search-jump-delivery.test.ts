import * as assert from 'assert'

import * as vscode from 'vscode'

import { readSearchJump } from '#src/host/read-search-jump'
import { runSearch } from '#src/test/search-test-support'

/**
 * What the host hands the webview when a note opens from a search result.
 *
 * Runs against the repo's own fixture notes rather than a temp file, so the
 * positions are the ones from the reported bug: `<input` on source line 67 of
 * `public/other-note.md`, whose eight lines of frontmatter put it on body line
 * 58 - the coordinate the editor actually works in.
 */
suite('Search jump delivery', function () {
	this.timeout(60000)

	const workspace = vscode.workspace.workspaceFolders?.[0]
	const log = { info: () => {}, warn: () => {}, error: () => {} }

	suiteTeardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors')
	})

	test('names the match in body coordinates, without touching the clipboard', async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')
		const document = await vscode.workspace.openTextDocument(note)

		const clipboardBefore = 'a user copied this and must keep it'
		await vscode.env.clipboard.writeText(clipboardBefore)

		await runSearch('<input')
		const jump = await readSearchJump(document, log)

		assert.ok(jump, 'other-note.md holds a `<input` match')
		assert.strictEqual(jump.line, 58, 'body line, 0-based')
		assert.strictEqual(jump.column, 1, 'column, 0-based')

		// An upper bound, and asserted as one. `deriveQueryLength` reads the query
		// off the matches themselves, so how tightly it lands depends on what else
		// in the workspace the same search hit. Pinning the exact text here would
		// make any new `<input` anywhere in the repo fail this test.
		assert.ok(
			jump.text.toLowerCase().startsWith('<input'),
			`the matched text begins with the query, got ${jump.text}`
		)
		assert.strictEqual(jump.lineOffset, 8, 'the frontmatter it subtracted')
		assert.strictEqual(
			await vscode.env.clipboard.readText(),
			clipboardBefore,
			'the jump path must never touch the clipboard'
		)
	})

	/**
	 * The search view keeps serving its results long after the click, so without
	 * this the note would be yanked back to the same match every time it opened.
	 */
	test('delivers a given match once, not on every later open', async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')
		const document = await vscode.workspace.openTextDocument(note)

		// A different match from the test above, so the guard's memory of that one
		// is not what makes this pass.
		await runSearch('companion fixture')
		assert.ok(await readSearchJump(document, log), 'the first open jumps')

		assert.strictEqual(
			await readSearchJump(document, log),
			undefined,
			'a second open under the same search jumps to nothing'
		)
	})

	test('jumps to nothing for a note the search did not match', async () => {
		assert.ok(workspace, 'expected a workspace folder')
		const note = vscode.Uri.joinPath(workspace.uri, 'public', 'other-note.md')
		const document = await vscode.workspace.openTextDocument(note)

		await runSearch('zzz-nothing-matches-this-zzz', { expectMatches: false })

		assert.strictEqual(await readSearchJump(document, log), undefined)
	})
})
