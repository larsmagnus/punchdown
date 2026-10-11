import type { Page } from '@playwright/test'

import { expect, test } from '#e2e/lib/fixtures'
import { pressKeySettled } from '#e2e/lib/press-key-settled'
import { openInVSCode } from '#e2e/lib/vscode-host'
import type { DirectoryEntry } from '#src/shared/messages'

const WORKSPACE: Record<string, DirectoryEntry[]> = {
	'': [
		{ name: 'docs', kind: 'directory' },
		{ name: 'package.json', kind: 'file' },
		{ name: 'Q3 plan.md', kind: 'file' },
		{ name: 'notes.md', kind: 'file' },
	],
	'docs/': [
		{ name: 'adr', kind: 'directory' },
		{ name: 'setup.md', kind: 'file' },
	],
}

async function openRaw(page: Page) {
	await openInVSCode(page, 'Intro\n\n', 'notes.md', WORKSPACE)
	await page.getByRole('button', { name: 'Raw editor' }).click()
	const raw = page.getByRole('textbox', { name: 'Raw markdown' })
	await raw.focus()
	await raw.evaluate((element: HTMLTextAreaElement) =>
		element.setSelectionRange(element.value.length, element.value.length)
	)
	return raw
}

async function openLive(page: Page) {
	await openInVSCode(page, 'Intro\n\n', 'notes.md', WORKSPACE)
	await page.locator('.ProseMirror').click()
	await pressKeySettled(page, 'Control+End')
	await pressKeySettled(page, 'Enter')
}

test.describe('Path completion in raw mode', () => {
	test('lists the note’s folder in an empty link target, folders first', async ({
		page,
	}) => {
		await openRaw(page)
		await page.keyboard.type('See [plan](')

		await expect(page.getByRole('option')).toHaveText([
			'docs',
			'notes.md',
			'package.json',
			'Q3 plan.md',
		])
		// The hidden live editor receives this text too, and must not open its own.
		await expect(page.getByRole('listbox')).toHaveCount(1)
	})

	test('Enter writes the file, percent-encoded, and closes the list', async ({
		page,
	}) => {
		const raw = await openRaw(page)
		await page.keyboard.type('See [plan](q3')
		await expect(page.getByRole('option')).toHaveText(['Q3 plan.md'])
		await page.keyboard.press('Enter')

		await expect(raw).toHaveValue('Intro\n\nSee [plan](Q3%20plan.md')
		await expect(page.getByRole('listbox')).toHaveCount(0)
	})

	test('picking a folder writes it and lists its children', async ({
		page,
	}) => {
		const raw = await openRaw(page)
		await page.keyboard.type('[setup](do')
		await expect(page.getByRole('option')).toHaveText(['docs'])
		await page.keyboard.press('Enter')

		await expect(raw).toHaveValue('Intro\n\n[setup](docs/')
		await expect(page.getByRole('option')).toHaveText(['adr', 'setup.md'])

		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('Enter')

		await expect(raw).toHaveValue('Intro\n\n[setup](docs/setup.md')
	})

	test('Tab completes a path in inline code, written as named', async ({
		page,
	}) => {
		const raw = await openRaw(page)
		await page.keyboard.type('Edit `pack')
		await expect(page.getByRole('option')).toHaveText(['package.json'])
		await page.keyboard.press('Tab')

		await expect(raw).toHaveValue('Intro\n\nEdit `package.json')
	})

	test('Escape closes the list until the path moves on', async ({ page }) => {
		const raw = await openRaw(page)
		await page.keyboard.type('[](d')
		await expect(page.getByRole('option', { name: 'docs' })).toBeVisible()

		await page.keyboard.press('Escape')
		await page.keyboard.type('o')

		await expect(page.getByRole('listbox')).toHaveCount(0)
		await expect(raw).toHaveValue('Intro\n\n[](do')
	})

	test('shows no list when nothing matches', async ({ page }) => {
		await openRaw(page)
		await page.keyboard.type('[](zzz')

		await expect(page.getByRole('listbox')).toHaveCount(0)
	})

	test('stays closed in a URL target', async ({ page }) => {
		await openRaw(page)
		await page.keyboard.type('[site](https://')

		await expect(page.getByRole('listbox')).toHaveCount(0)
	})

	test('stays closed when the caret only moves into a link target, until Ctrl+Space', async ({
		page,
	}) => {
		await openInVSCode(page, 'See [plan](no) today\n', 'notes.md', WORKSPACE)
		await page.getByRole('button', { name: 'Raw editor' }).click()
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await raw.focus()
		await raw.evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange(0, 0)
		)
		for (let step = 0; step < 13; step += 1) {
			await page.keyboard.press('ArrowRight')
		}
		await expect(page.getByRole('listbox')).toHaveCount(0)

		await page.keyboard.press('Control+Space')

		await expect(page.getByRole('option')).toHaveText(['notes.md'])
	})

	test('sits under the caret on a line that is not the note’s last', async ({
		page,
	}) => {
		await openInVSCode(page, 'Intro\n\nOutro\n', 'notes.md', WORKSPACE)
		await page.getByRole('button', { name: 'Raw editor' }).click()
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await raw.focus()
		await raw.evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange(5, 5)
		)
		await page.keyboard.type(' [plan](')
		await expect(page.getByRole('option').first()).toBeVisible()

		const field = await raw.boundingBox()
		const menu = await page.getByRole('listbox').boundingBox()
		expect(menu?.y).toBeGreaterThan(field?.y ?? Infinity)
		expect(menu?.x).toBeGreaterThan(field?.x ?? Infinity)
	})

	test('does not offer the parent folder’s entries while a picked folder loads', async ({
		page,
	}) => {
		await openInVSCode(page, 'Intro\n\n', 'notes.md', WORKSPACE, {
			'docs/': 1_000,
		})
		await page.getByRole('button', { name: 'Raw editor' }).click()
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await raw.focus()
		await raw.evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange(element.value.length, element.value.length)
		)
		await page.keyboard.type('[setup](do')
		await expect(page.getByRole('option')).toHaveText(['docs'])
		await page.keyboard.press('Tab')

		await expect(page.getByRole('listbox')).toHaveCount(0)
		await expect(page.getByRole('status')).toHaveText('Loading…')
		await expect(page.getByRole('option')).toHaveText(['adr', 'setup.md'])
		await expect(raw).toHaveValue('Intro\n\n[setup](docs/')
	})

	test('stays closed inside a fenced code block', async ({ page }) => {
		await openRaw(page)
		await page.keyboard.type('```js\nconst file = `pack')

		await expect(page.getByRole('listbox')).toHaveCount(0)
	})
})

test.describe('Path completion in live mode', () => {
	test('Enter writes a file into a link target', async ({ page }) => {
		await openLive(page)
		await page.keyboard.type('See [plan](no')
		await expect(page.getByRole('option')).toHaveText(['notes.md'])

		await pressKeySettled(page, 'Enter')

		await expect(page.locator('.ProseMirror p').last()).toHaveText(
			'See [plan](notes.md'
		)
		await expect(page.getByRole('listbox')).toHaveCount(0)
	})

	test('completing an existing link’s target updates where it points', async ({
		page,
	}) => {
		await openInVSCode(page, 'See [plan](no)\n', 'notes.md', WORKSPACE)
		await page.locator('.ProseMirror p').getByText('See').click()
		await pressKeySettled(page, 'End')
		await pressKeySettled(page, 'ArrowLeft')
		await page.keyboard.press('Control+Space')
		await expect(page.getByRole('option')).toHaveText(['notes.md'])

		await pressKeySettled(page, 'Enter')

		await expect(page.locator('.ProseMirror a[href="notes.md"]')).toHaveCount(1)
	})

	test('picking a folder writes it and lists its children', async ({
		page,
	}) => {
		await openLive(page)
		await page.keyboard.type('[setup](do')
		await expect(page.getByRole('option')).toHaveText(['docs'])
		await pressKeySettled(page, 'Enter')

		await expect(page.getByRole('option')).toHaveText(['adr', 'setup.md'])
		await expect(page.locator('.ProseMirror p').last()).toHaveText(
			'[setup](docs/'
		)
	})

	test('Escape closes the list and keeps the typed text', async ({ page }) => {
		await openLive(page)
		await page.keyboard.type('[](d')
		await expect(page.getByRole('option', { name: 'docs' })).toBeVisible()

		await page.keyboard.press('Escape')
		await page.keyboard.type('o')

		await expect(page.getByRole('listbox')).toHaveCount(0)
		await expect(page.locator('.ProseMirror p').last()).toHaveText('[](do')
	})

	test('stays closed when the caret only moves into a link target, until Ctrl+Space', async ({
		page,
	}) => {
		await openInVSCode(page, 'See [plan](no)\n', 'notes.md', WORKSPACE)
		await page.locator('.ProseMirror p').getByText('See').click()
		await pressKeySettled(page, 'End')
		await pressKeySettled(page, 'ArrowLeft')
		await expect(page.getByRole('listbox')).toHaveCount(0)

		await page.keyboard.press('Control+Space')

		await expect(page.getByRole('option')).toHaveText(['notes.md'])
	})

	test('says it is loading while a picked folder loads, holding Enter meanwhile', async ({
		page,
	}) => {
		await openInVSCode(page, 'Intro\n\n', 'notes.md', WORKSPACE, {
			'docs/': 1_000,
		})
		await page.locator('.ProseMirror').click()
		await pressKeySettled(page, 'Control+End')
		await pressKeySettled(page, 'Enter')
		await page.keyboard.type('[setup](do')
		await expect(page.getByRole('option')).toHaveText(['docs'])
		await page.keyboard.press('Tab')

		await expect(page.getByRole('status')).toHaveText('Loading…')
		await page.keyboard.press('Enter')
		await expect(page.locator('.ProseMirror p').last()).toHaveText(
			'[setup](docs/'
		)
		await expect(page.getByRole('option')).toHaveText(['adr', 'setup.md'])
	})

	test('Tab completes a path in inline code', async ({ page }) => {
		await openLive(page)
		await page.keyboard.type('Edit `pack')
		await expect(page.getByRole('option')).toHaveText(['package.json'])
		await page.keyboard.press('Tab')

		await expect(page.locator('.ProseMirror p').last()).toHaveText(
			'Edit `package.json'
		)
	})
})

test.describe('Path completion in the standalone app', () => {
	test('lists the demo notes beside the open one', async ({ page }) => {
		await page.goto('/')
		await page.getByRole('button', { name: 'Raw editor' }).click()
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await raw.focus()
		await raw.evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange(element.value.length, element.value.length)
		)

		await page.keyboard.type('\n[other](other-n')

		await expect(page.getByRole('option')).toHaveText(['other-note.md'])
	})
})
