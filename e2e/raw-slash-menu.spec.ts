import { expect, test } from '@playwright/test'

import { openInVSCode } from '#e2e/lib/vscode-host'

test.describe('Raw slash menu', () => {
	test.beforeEach(async ({ page }) => {
		await openInVSCode(page, 'Intro\n\n')
		await page.getByRole('button', { name: 'Raw editor' }).click()
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await raw.focus()
		await raw.evaluate((element: HTMLTextAreaElement) =>
			element.setSelectionRange(element.value.length, element.value.length)
		)
	})

	test('opens on a slash at the start of a line and narrows as the query is typed', async ({
		page,
	}) => {
		await page.keyboard.type('/')
		await expect(page.getByRole('option', { name: 'Table' })).toBeVisible()
		// The hidden live editor receives this text too, and must not open its own.
		await expect(page.getByRole('listbox')).toHaveCount(1)

		await page.keyboard.type('tab')

		await expect(page.getByRole('option')).toHaveCount(1)
		await expect(page.getByRole('option', { name: 'Table' })).toBeVisible()
	})

	test('stays closed for a slash inside a sentence', async ({ page }) => {
		await page.keyboard.type('either/')

		await expect(page.getByRole('option')).toHaveCount(0)
	})

	test('leaves out the commands that need a flow of their own', async ({
		page,
	}) => {
		await page.keyboard.type('/')

		await expect(page.getByRole('option', { name: 'Image' })).toHaveCount(0)
		await expect(page.getByRole('option', { name: 'Ask Claude' })).toHaveCount(
			0
		)
	})

	test('Enter writes the highlighted command over the query', async ({
		page,
	}) => {
		await page.keyboard.type('/bullet')
		await page.keyboard.press('Enter')

		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await expect(raw).toHaveValue('Intro\n\n- ')
		await expect(page.getByRole('option')).toHaveCount(0)
	})

	test('Tab accepts the highlighted command too', async ({ page }) => {
		await page.keyboard.type('/numbered')
		await page.keyboard.press('Tab')

		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n1. ')
	})

	test('arrow keys move the highlight before Enter picks it', async ({
		page,
	}) => {
		await page.keyboard.type('/list')
		await page.keyboard.press('ArrowDown')
		await expect(
			page.getByRole('option', { name: 'Numbered list' })
		).toHaveAttribute('aria-selected', 'true')
		await page.keyboard.press('Enter')

		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n1. ')
	})

	test('puts the caret between the fences of a code block', async ({
		page,
	}) => {
		await page.keyboard.type('/code')
		await page.keyboard.press('Enter')
		await page.keyboard.type('npm test')

		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n```\nnpm test\n```')
	})

	test('Escape closes the menu and keeps the typed text', async ({ page }) => {
		await page.keyboard.type('/tab')
		await page.keyboard.press('Escape')

		await expect(page.getByRole('option')).toHaveCount(0)
		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n/tab')
	})

	test('one undo reverts the inserted command', async ({ page }) => {
		await page.keyboard.type('/task')
		await page.keyboard.press('Enter')
		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n- [ ] ')

		await page.keyboard.press('ControlOrMeta+z')

		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).toHaveValue('Intro\n\n/task')
	})

	test('sits directly under the slash that opened it', async ({ page }) => {
		await page.keyboard.type('/')

		const menu = page.getByRole('listbox')
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		const menuBox = await menu.boundingBox()
		const rawBox = await raw.boundingBox()
		expect(menuBox).not.toBeNull()
		expect(rawBox).not.toBeNull()
		expect(menuBox?.y ?? 0).toBeGreaterThan(rawBox?.y ?? 0)
		expect(menuBox?.y ?? 0).toBeLessThan(
			(rawBox?.y ?? 0) + (rawBox?.height ?? 0) + 40
		)
	})

	test('leaves Ctrl+Enter alone while the menu is open', async ({ page }) => {
		await page.keyboard.type('/tab')
		await page.keyboard.press('Control+Enter')

		await expect(page.getByRole('option', { name: 'Table' })).toBeVisible()
		await expect(
			page.getByRole('textbox', { name: 'Raw markdown' })
		).not.toHaveValue(/\|/)
	})

	test('ignores Enter pressed to confirm an IME composition', async ({
		page,
	}) => {
		await page.keyboard.type('/tab')
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })

		const defaultPrevented = await raw.evaluate((element) => {
			const event = new KeyboardEvent('keydown', {
				key: 'Enter',
				isComposing: true,
				cancelable: true,
			})
			element.dispatchEvent(event)
			return event.defaultPrevented
		})

		expect(defaultPrevented).toBe(false)
		await expect(raw).toHaveValue('Intro\n\n/tab')
		await expect(page.getByRole('option', { name: 'Table' })).toBeVisible()
	})

	test('reopens when focus returns with the caret still after the query', async ({
		page,
	}) => {
		const raw = page.getByRole('textbox', { name: 'Raw markdown' })
		await page.keyboard.type('/tab')
		await raw.evaluate((element) => element.blur())
		await expect(page.getByRole('option')).toHaveCount(0)

		await raw.focus()

		await expect(page.getByRole('option', { name: 'Table' })).toBeVisible()
	})

	test('keeps the highlighted item in view while arrowing down a list taller than the window', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 800, height: 320 })
		await page.keyboard.type('/')

		const lastItem = page.getByRole('option', { name: 'Table' })
		for (let index = 0; index < 10; index += 1) {
			await page.keyboard.press('ArrowDown')
		}

		await expect(lastItem).toHaveAttribute('aria-selected', 'true')
		await expect(lastItem).toBeInViewport({ ratio: 1 })
	})
})
