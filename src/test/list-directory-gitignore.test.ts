import * as assert from 'assert'

import * as vscode from 'vscode'

import {
	DEFAULT_LISTING_FILTERS,
	listedNames,
} from '#src/test/list-directory-test-support'
import { workspaceUri } from '#src/test/note-index-test-support'

/**
 * This repo's own `.gitignore` supplies the fixtures: `blob-report/` is
 * ignored without being in the built-in exclusions, and `.claude/worktrees` is
 * ignored but is an AI tool's directory.
 */
const IGNORED_NOTE = ['blob-report', 'path-fixture.md']
const IGNORED_AI_TOOL_NOTE = ['.claude', 'worktrees', 'path-fixture.md']

suite('Path completion directory listing and .gitignore', () => {
	const sampleNote = workspaceUri('public', 'notes.md')

	suiteSetup(async () => {
		for (const segments of [IGNORED_NOTE, IGNORED_AI_TOOL_NOTE]) {
			await vscode.workspace.fs.writeFile(
				workspaceUri(...segments),
				new TextEncoder().encode('# Fixture note\n')
			)
		}
	})

	suiteTeardown(async () => {
		await vscode.workspace.fs.delete(workspaceUri('blob-report'), {
			recursive: true,
			useTrash: false,
		})
		await vscode.workspace.fs.delete(workspaceUri(...IGNORED_AI_TOOL_NOTE), {
			useTrash: false,
		})
	})

	test('leaves out a gitignored folder', async () => {
		const listed = await listedNames(sampleNote, '/')

		assert.ok(!listed.includes('blob-report/'), listed.join(', '))
	})

	test('lists a gitignored folder once .gitignore is not respected', async () => {
		const listed = await listedNames(sampleNote, '/', {
			...DEFAULT_LISTING_FILTERS,
			noteIndexRespectGitignore: false,
		})

		assert.ok(listed.includes('blob-report/'), listed.join(', '))
	})

	test('still leaves out node_modules when .gitignore is not respected', async () => {
		const listed = await listedNames(sampleNote, '/', {
			...DEFAULT_LISTING_FILTERS,
			noteIndexRespectGitignore: false,
		})

		assert.ok(!listed.includes('node_modules/'), listed.join(', '))
	})

	test('lists a build folder, unlike the note index, once .gitignore is not respected', async () => {
		const listed = await listedNames(sampleNote, '/', {
			...DEFAULT_LISTING_FILTERS,
			noteIndexRespectGitignore: false,
		})

		assert.ok(listed.includes('out/'), listed.join(', '))
	})

	test('leaves out a file inside a gitignored folder', async () => {
		const listed = await listedNames(sampleNote, '/blob-report/')

		assert.deepStrictEqual(listed, [])
	})

	test('keeps a gitignored folder in an AI tool’s territory', async () => {
		const listed = await listedNames(sampleNote, '/.claude/')

		assert.ok(listed.includes('worktrees/'), listed.join(', '))
	})

	test('leaves out a gitignored AI-tool folder once those are not shown', async () => {
		const listed = await listedNames(sampleNote, '/.claude/', {
			...DEFAULT_LISTING_FILTERS,
			noteIndexShowAiToolFolders: false,
		})

		assert.ok(!listed.includes('worktrees/'), listed.join(', '))
	})
})
