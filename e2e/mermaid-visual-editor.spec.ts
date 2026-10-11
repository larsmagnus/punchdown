import type { Page } from '@playwright/test'

import { expect, test } from '#e2e/lib/fixtures'
import { openInVSCode } from '#e2e/lib/vscode-host'

const NOTE = [
	'# Title',
	'',
	'```mermaid',
	'graph TD',
	'  A[Start] --> B{Decision}',
	'  B -->|Yes| C[Finish]',
	'  B -->|No| D[Alternate]',
	'  %% keep me',
	'```',
	'',
	'after text',
].join('\n')

/** A diagram ending on its last edge, with nothing after it for new lines to land before. */
const NOTE_WITHOUT_COMMENT = NOTE.replace('  %% keep me\n', '')

/** Visimer writes new lines ahead of a trailing comment, not after it. */
const withEndAfterFinish = NOTE.replace(
	'  %% keep me',
	'  E[End]\n  C --> E\n  %% keep me'
)

async function openVisualEditor(page: Page, note = NOTE) {
	await openInVSCode(page, note)
	await page.getByRole('button', { name: 'Edit diagram visually' }).click()

	const canvas = page.getByTestId('mermaid-visual-canvas')
	await expect(canvas.locator('svg .node').first()).toBeVisible()
	return canvas
}

function nodeLabelled(canvas: ReturnType<Page['getByTestId']>, label: string) {
	return canvas.locator('svg .node', { hasText: label }).first()
}

/**
 * Resolves once visimer has stopped replacing the diagram's elements. It
 * redraws asynchronously after an edit - twice, a few hundred ms apart - and
 * a node measured in between is gone by the time it is used.
 */
async function waitForDiagramToSettle(canvas: ReturnType<Page['getByTestId']>) {
	await canvas.evaluate(
		(element, quietMs) =>
			new Promise<void>((resolve) => {
				let timer = setTimeout(done, quietMs)
				const observer = new MutationObserver(() => {
					clearTimeout(timer)
					timer = setTimeout(done, quietMs)
				})
				function done() {
					observer.disconnect()
					resolve()
				}
				observer.observe(element, { childList: true, subtree: true })
			}),
		500
	)
}

/** The note as the raw view shows it, which is the text VS Code would save. */
async function expectNote(page: Page, expected: string) {
	await page.getByRole('button', { name: 'Raw editor' }).click()
	await expect(page.getByRole('textbox', { name: 'Raw markdown' })).toHaveValue(
		expected
	)
}

/** Types over a label that is already open for editing, then commits it. */
async function replaceOpenLabel(
	page: Page,
	canvas: ReturnType<Page['getByTestId']>,
	text: string
) {
	await expect(canvas.locator('p[contenteditable=true]')).toBeVisible()
	await page.keyboard.press('ControlOrMeta+a')
	await page.keyboard.type(text)
	await page.keyboard.press('Enter')
}

/**
 * A mermaid block can be edited by dragging and clicking on the diagram itself;
 * every gesture is written back into the fence as the smallest change that
 * makes it, so the rest of the note - comments included - is left alone.
 */
test.describe('Editing a mermaid diagram visually', () => {
	test('retyping a label changes only that label in the note', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)

		await nodeLabelled(canvas, 'Finish').dblclick()
		await expect(canvas.locator('p[contenteditable=true]')).toBeVisible()
		await page.keyboard.type('Complete')
		await page.keyboard.press('Enter')
		await page.getByRole('button', { name: 'Done editing' }).click()

		await expectNote(page, NOTE.replace('C[Finish]', 'C[Complete]'))
	})

	test('select-all inside a label stays inside the label', async ({ page }) => {
		const canvas = await openVisualEditor(page)

		await nodeLabelled(canvas, 'Finish').dblclick()
		await replaceOpenLabel(page, canvas, 'Complete')
		await page.getByRole('button', { name: 'Done editing' }).click()

		await expectNote(page, NOTE.replace('C[Finish]', 'C[Complete]'))
	})

	test('the plus beside a selected node adds a node connected to it', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)

		await nodeLabelled(canvas, 'Finish').click()
		await page.getByRole('button', { name: 'Add connected node' }).click()
		await replaceOpenLabel(page, canvas, 'End')
		await page.getByRole('button', { name: 'Done editing' }).click()

		await expectNote(page, withEndAfterFinish)
	})

	test('Add node followed by Connect nodes joins two nodes', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)

		await page.getByRole('button', { name: 'Add node' }).click()
		await replaceOpenLabel(page, canvas, 'End')
		await expect(nodeLabelled(canvas, 'End')).toBeVisible()
		await waitForDiagramToSettle(canvas)

		await page.getByRole('button', { name: 'Connect nodes' }).click()
		const from = (await nodeLabelled(canvas, 'Finish').boundingBox())!
		const to = (await nodeLabelled(canvas, 'End').boundingBox())!
		await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
		await page.mouse.down()
		await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
			steps: 12,
		})
		await page.mouse.up()
		await page.getByRole('button', { name: 'Done editing' }).click()

		await expectNote(page, withEndAfterFinish)
	})

	test('Delete selection removes the node and undo from the canvas brings it back', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)

		await nodeLabelled(canvas, 'Alternate').click()
		await page.getByRole('button', { name: 'Delete selection' }).click()
		await expect(nodeLabelled(canvas, 'Alternate')).toHaveCount(0)

		await canvas.click({ position: { x: 5, y: 5 } })
		await page.keyboard.press('ControlOrMeta+z')
		await expect(nodeLabelled(canvas, 'Alternate')).toBeVisible()
	})

	test('undoing in the document reverts a visual edit and the canvas follows', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)

		await nodeLabelled(canvas, 'Finish').dblclick()
		await replaceOpenLabel(page, canvas, 'Complete')
		await expect(nodeLabelled(canvas, 'Complete')).toBeVisible()

		await page
			.locator('#live-editor')
			.getByText('after text', { exact: true })
			.click()
		await page.keyboard.press('ControlOrMeta+z')

		await expect(nodeLabelled(canvas, 'Finish')).toBeVisible()
		await expect(nodeLabelled(canvas, 'Complete')).toHaveCount(0)
	})

	test('zoom buttons drive the canvas and replace the built-in ones', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)
		const width = async () =>
			(await nodeLabelled(canvas, 'Start').boundingBox())!.width
		const initial = await width()

		await page.getByRole('button', { name: 'Zoom in' }).click()
		await expect.poll(width).toBeGreaterThan(initial)

		await page.getByRole('button', { name: 'Reset zoom' }).click()
		await expect.poll(width).toBeCloseTo(initial, 0)
		await expect(canvas.locator('.mw-zoom-controls')).toBeHidden()
	})

	// The plus is positioned over the node it was opened from, so it has to
	// follow that node away: a plus left floating beside nothing invites a click
	// that cannot do anything.
	test('the plus goes away when the node it belongs to is deleted', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page)
		const plus = page.getByRole('button', { name: 'Add connected node' })

		await nodeLabelled(canvas, 'Finish').click()
		await plus.click()
		await replaceOpenLabel(page, canvas, 'End')
		await expect(nodeLabelled(canvas, 'End')).toBeVisible()

		await nodeLabelled(canvas, 'Alternate').click()
		await nodeLabelled(canvas, 'End').click()
		await expect(plus).toBeVisible()
		await page.keyboard.press('Delete')

		await expect(nodeLabelled(canvas, 'End')).toHaveCount(0)
		await expect(plus).toHaveCount(0)
	})

	test('a node added from the plus can be deleted from its own menu', async ({
		page,
	}) => {
		const canvas = await openVisualEditor(page, NOTE_WITHOUT_COMMENT)

		await nodeLabelled(canvas, 'Finish').click()
		await page.getByRole('button', { name: 'Add connected node' }).click()
		await expect(canvas.locator('p[contenteditable=true]')).toBeVisible()

		await nodeLabelled(canvas, 'Alternate').click()
		await expect(canvas.locator('p[contenteditable=true]')).toHaveCount(0)
		await nodeLabelled(canvas, 'New node').click()
		await page.locator('.mw-popover').getByTitle('Delete').click()

		await expect(nodeLabelled(canvas, 'New node')).toHaveCount(0)
	})

	test('a declared participant can be deleted along with its messages', async ({
		page,
	}) => {
		await openInVSCode(
			page,
			[
				'```mermaid',
				'sequenceDiagram',
				'  participant A as Alice',
				'  participant B as Bob',
				'  A->>B: Hello',
				'  B-->>A: Hi',
				'```',
			].join('\n')
		)
		await page.getByRole('button', { name: 'Edit diagram visually' }).click()
		const canvas = page.getByTestId('mermaid-visual-canvas')
		await expect(canvas.getByText('Bob').first()).toBeVisible()

		await canvas.getByText('Bob').first().click()
		await page.getByRole('button', { name: 'Delete selection' }).click()

		await expect(canvas.getByText('Bob')).toHaveCount(0)
		await expect(canvas.getByText('Hello')).toHaveCount(0)
	})
})
