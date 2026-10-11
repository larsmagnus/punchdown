import type { Page } from '@playwright/test'

import { expect, test } from '#e2e/lib/fixtures'
import { actionSettled, pressKeySettled } from '#e2e/lib/press-key-settled'
import { openInVSCode } from '#e2e/lib/vscode-host'

const NOTE = 'Meeting notes\n'

/** Longer than the gap under which consecutive keystrokes share one undo step. */
const NEW_UNDO_STEP_MS = 700

const rawTextarea = (page: Page) =>
	page.getByRole('textbox', { name: 'Raw markdown' })

const liveEditor = (page: Page) => page.locator('.ProseMirror')

async function showRaw(page: Page) {
	await page.getByRole('button', { name: 'Raw editor' }).click()
	await expect(rawTextarea(page)).toBeVisible()
}

async function showLive(page: Page) {
	await page.getByRole('button', { name: 'Live editor' }).click()
	await expect(liveEditor(page)).toBeVisible()
}

/** Puts the caret at the end of the raw note, ready to type. */
async function focusRawEnd(page: Page) {
	const raw = rawTextarea(page)
	await raw.focus()
	await raw.evaluate((element: HTMLTextAreaElement) =>
		element.setSelectionRange(element.value.length, element.value.length)
	)
}

/** Puts the caret at the end of the live note's first line, ready to type. */
async function focusLiveEnd(page: Page) {
	await actionSettled(page, () =>
		liveEditor(page).getByText('Meeting notes').click()
	)
	await pressKeySettled(page, 'End')
}

test.describe('Undo and redo in raw mode', () => {
	test.beforeEach(async ({ page }) => {
		await openInVSCode(page, NOTE)
		await showRaw(page)
		await focusRawEnd(page)
	})

	test('one undo removes a whole typed run, and redo puts it back', async ({
		page,
	}) => {
		await page.keyboard.type('Agenda for Q3')

		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(NOTE)

		await page.keyboard.press('ControlOrMeta+Shift+z')
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda for Q3`)
	})

	test('Mod+Y redoes too', async ({ page }) => {
		await page.keyboard.type('Agenda for Q3')
		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(NOTE)

		await page.keyboard.press('ControlOrMeta+y')

		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda for Q3`)
	})

	test('runs typed after a pause undo one at a time', async ({ page }) => {
		await page.keyboard.type('Agenda')
		await page.waitForTimeout(NEW_UNDO_STEP_MS)
		await page.keyboard.type(' for Q3')

		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda`)

		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(NOTE)
	})

	test('undo puts the caret back where the undone edit started', async ({
		page,
	}) => {
		await rawTextarea(page).evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange('Meeting'.length, 'Meeting'.length)
		)
		await page.keyboard.type(' minutes')
		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(NOTE)

		await page.keyboard.type('!')

		await expect(rawTextarea(page)).toHaveValue('Meeting! notes\n')
	})

	test('a fresh edit after undo leaves nothing to redo', async ({ page }) => {
		await page.keyboard.type('Agenda')
		await page.keyboard.press('ControlOrMeta+z')
		await page.keyboard.type('Actions')

		await page.keyboard.press('ControlOrMeta+Shift+z')

		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Actions`)
	})

	// VS Code's Edit menu sends a native undo command, not a keystroke.
	test('an undo command from outside the keyboard undoes the same run', async ({
		page,
	}) => {
		await page.keyboard.type('Agenda for Q3')

		await page.evaluate(() => document.execCommand('undo'))
		await expect(rawTextarea(page)).toHaveValue(NOTE)

		await page.evaluate(() => document.execCommand('redo'))
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda for Q3`)
	})

	test('one undo restores a whole run of backspaces', async ({ page }) => {
		await page.keyboard.type('Agenda')
		await page.waitForTimeout(NEW_UNDO_STEP_MS)
		for (const _ of 'Agenda') await page.keyboard.press('Backspace')
		await expect(rawTextarea(page)).toHaveValue(NOTE)

		await page.keyboard.press('ControlOrMeta+z')

		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda`)
	})

	test('an undo arriving as a historyUndo input undoes the same run', async ({
		page,
	}) => {
		await page.keyboard.type('Agenda for Q3')

		await rawTextarea(page).evaluate((element) =>
			element.dispatchEvent(
				new InputEvent('beforeinput', {
					inputType: 'historyUndo',
					bubbles: true,
					cancelable: true,
				})
			)
		)

		await expect(rawTextarea(page)).toHaveValue(NOTE)
	})

	test('one undo input that the browser could not cancel steps back once', async ({
		page,
	}) => {
		await page.keyboard.type('Agenda')
		await page.waitForTimeout(NEW_UNDO_STEP_MS)
		await page.keyboard.type(' for Q3')

		await rawTextarea(page).evaluate((element) => {
			const init = { inputType: 'historyUndo', bubbles: true }
			element.dispatchEvent(new InputEvent('beforeinput', init))
			element.dispatchEvent(new InputEvent('input', init))
		})

		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda`)
	})

	test('redo puts the caret back inside an inserted code block', async ({
		page,
	}) => {
		await page.keyboard.type('/code')
		await page.keyboard.press('Enter')
		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}/code`)

		await page.keyboard.press('ControlOrMeta+Shift+z')
		await page.keyboard.type('npm test')

		await expect(rawTextarea(page)).toHaveValue(
			`${NOTE}\`\`\`\nnpm test\n\`\`\``
		)
	})

	test('an undone edit reaches live mode', async ({ page }) => {
		await page.keyboard.type('Agenda')
		await page.waitForTimeout(NEW_UNDO_STEP_MS)
		await page.keyboard.type(' for Q3')
		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda`)

		await showLive(page)

		await expect(liveEditor(page)).toHaveText('Meeting notesAgenda')
	})
})

test.describe('Undo and redo across modes', () => {
	test.beforeEach(async ({ page }) => {
		await openInVSCode(page, NOTE)
	})

	test('undo in raw mode reverts a live edit in both modes alike', async ({
		page,
	}) => {
		await focusLiveEnd(page)
		await page.keyboard.type(' draft')
		await showRaw(page)
		await expect(rawTextarea(page)).toHaveValue('Meeting notes draft\n')

		await rawTextarea(page).focus()
		await page.keyboard.press('ControlOrMeta+z')

		await expect(rawTextarea(page)).toHaveValue(NOTE)

		// Nothing left to undo here, and the browser's own undo must not reach
		// past it into the live editor's typing.
		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue(NOTE)
		await showLive(page)
		await expect(liveEditor(page)).toHaveText('Meeting notes')
	})

	test('undo in raw mode back to a live edit reaches live mode', async ({
		page,
	}) => {
		await focusLiveEnd(page)
		await page.keyboard.type(' draft')
		await showRaw(page)
		await focusRawEnd(page)
		await page.keyboard.type('Agenda')
		await expect(liveEditor(page)).toHaveText('Meeting notes draftAgenda')

		await page.keyboard.press('ControlOrMeta+z')
		await expect(rawTextarea(page)).toHaveValue('Meeting notes draft\n')

		await showLive(page)
		await expect(liveEditor(page)).toHaveText('Meeting notes draft')
	})

	test('undo in live mode reverts a raw edit, and redo restores it', async ({
		page,
	}) => {
		await showRaw(page)
		await focusRawEnd(page)
		await page.keyboard.type('Agenda')
		await showLive(page)
		await expect(liveEditor(page)).toHaveText('Meeting notesAgenda')

		await pressKeySettled(page, 'ControlOrMeta+z')
		await expect(liveEditor(page)).toHaveText('Meeting notes')

		await pressKeySettled(page, 'ControlOrMeta+Shift+z')
		await expect(liveEditor(page)).toHaveText('Meeting notesAgenda')
		await showRaw(page)
		await expect(rawTextarea(page)).toHaveValue(`${NOTE}Agenda`)
	})
})

test.describe('Undo and redo in live mode', () => {
	test.beforeEach(async ({ page }) => {
		await openInVSCode(page, NOTE)
		await focusLiveEnd(page)
	})

	test('one undo removes a whole typed run, and redo puts it back', async ({
		page,
	}) => {
		await page.keyboard.type(' for Q3')

		await pressKeySettled(page, 'ControlOrMeta+z')
		await expect(liveEditor(page)).toHaveText('Meeting notes')

		await pressKeySettled(page, 'ControlOrMeta+Shift+z')
		await expect(liveEditor(page)).toHaveText('Meeting notes for Q3')
	})

	test('an undo command from outside the keyboard undoes the same run', async ({
		page,
	}) => {
		await page.keyboard.type(' for Q3')

		await actionSettled(page, async () => {
			await page.evaluate(() => document.execCommand('undo'))
		})

		await expect(liveEditor(page)).toHaveText('Meeting notes')
	})

	test('an undone edit reaches raw mode', async ({ page }) => {
		await page.keyboard.type(' for Q3')
		await pressKeySettled(page, 'ControlOrMeta+z')
		await expect(liveEditor(page)).toHaveText('Meeting notes')

		await showRaw(page)

		await expect(rawTextarea(page)).toHaveValue(NOTE)
	})
})
