import * as assert from 'assert'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

import * as vscode from 'vscode'

import { createLinkDeps, openTestLink } from '#src/test/link-test-support'
import {
	EXTENSION_ID,
	isCustomEditorTab,
	waitForActiveTab,
} from '#src/test/tab-test-support'

suite('Opening a link with a heading hash', () => {
	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension(EXTENSION_ID)
		assert.ok(extension, `Extension ${EXTENSION_ID} is not installed`)
		await extension.activate()
	})

	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors')
	})

	/**
	 * `PendingHeadingJumpStore` is instance-scoped, owned by the real
	 * `MarkdownEditorProvider` the running extension activated - a test
	 * calling `openLinkTarget` directly supplies its own instance, which the
	 * real `resolveCustomTextEditor` never touches, so there is no reachable
	 * seam here to assert the queued hash was actually consumed. That
	 * contract - queued once, taken once - is owned by
	 * `pending-heading-jump-store.test.ts` and `heading-jump-delivery.test.ts`
	 * instead. What an integration test can still prove: a hash on the href
	 * does not stop the target from opening.
	 */
	test('still opens the target when the href carries a hash', async () => {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'emn-link-test-'))
		try {
			const source = vscode.Uri.file(path.join(directory, 'source.md'))
			const target = vscode.Uri.file(path.join(directory, 'target.md'))
			await fs.writeFile(source.fsPath, '# Source\n')
			await fs.writeFile(target.fsPath, '# Target\n\n## Heading Two\n')
			const document = await vscode.workspace.openTextDocument(source)

			await openTestLink('./target.md#heading-two', document, createLinkDeps())
			const tab = await waitForActiveTab(isCustomEditorTab)

			assert.ok(tab, 'the target should still open with a hash on the href')
		} finally {
			await fs.rm(directory, { recursive: true, force: true })
		}
	})
})
