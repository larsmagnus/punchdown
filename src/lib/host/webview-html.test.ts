import { describe, expect, it } from 'vitest'

import {
	buildMissingAssetsHtml,
	buildWebviewHtml,
} from '#src/lib/host/webview-html'
import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'

const INPUT = {
	scriptUri: 'https://cdn.example/assets/index-a1b2c3.js',
	styleUris: ['https://cdn.example/assets/index-d4e5f6.css'],
	preloadUris: ['https://cdn.example/assets/vendor-99aabb.js'],
	nonce: 'abc123',
	contentSecurityPolicy: `default-src 'none'`,
	logBridge: 'window.__bridge = true;',
	globals: {
		initialContent: '# Roadmap',
		fileName: 'roadmap.md',
		initialConfig: {
			settings: DEFAULT_SETTINGS,
			viewOptions: DEFAULT_VIEW_OPTIONS,
		},
		initialScrollTop: 0,
		imageBaseUris: {
			document: 'https://cdn.example/',
			workspace: 'https://cdn.example/',
		},
	},
}

describe('buildWebviewHtml', () => {
	it('loads the entry chunk as a module with the nonce', () => {
		const html = buildWebviewHtml(INPUT)

		expect(html).toContain(
			'<script type="module" crossorigin src="https://cdn.example/assets/index-a1b2c3.js" nonce="abc123">'
		)
	})

	it('links every stylesheet', () => {
		const html = buildWebviewHtml({
			...INPUT,
			styleUris: ['https://cdn.example/a.css', 'https://cdn.example/b.css'],
		})

		expect(html).toContain(
			'<link rel="stylesheet" crossorigin href="https://cdn.example/a.css">'
		)
		expect(html).toContain(
			'<link rel="stylesheet" crossorigin href="https://cdn.example/b.css">'
		)
	})

	/** The nonce is required on preloads too, or the CSP rejects them. */
	it('preloads every imported chunk with the nonce', () => {
		const html = buildWebviewHtml({
			...INPUT,
			preloadUris: ['https://cdn.example/one.js', 'https://cdn.example/two.js'],
		})

		expect(html).toContain(
			'<link rel="modulepreload" crossorigin href="https://cdn.example/one.js" nonce="abc123">'
		)
		expect(html).toContain(
			'<link rel="modulepreload" crossorigin href="https://cdn.example/two.js" nonce="abc123">'
		)
	})

	it('carries the policy it was given', () => {
		const html = buildWebviewHtml(INPUT)

		expect(html).toContain(
			`<meta http-equiv="Content-Security-Policy" content="default-src 'none'">`
		)
	})

	it('injects the log bridge ahead of the bundle', () => {
		const html = buildWebviewHtml(INPUT)

		expect(html.indexOf('window.__bridge = true;')).toBeLessThan(
			html.indexOf('type="module"')
		)
	})

	it('seeds the globals the app reads on its first render', () => {
		const html = buildWebviewHtml(INPUT)

		expect(html).toContain('window.initialContent = "# Roadmap";')
		expect(html).toContain('window.fileName = "roadmap.md";')
		expect(html).toContain('"centerContent"')
		expect(html).toContain('"workspace":"https://cdn.example/"')
	})

	/**
	 * A note documenting HTML very often contains the literal `</script>`. Left
	 * alone it closes the inline block early and the editor loads blank.
	 */
	it('escapes a closing script tag in the note', () => {
		const html = buildWebviewHtml({
			...INPUT,
			globals: {
				...INPUT.globals,
				initialContent: 'Close it with </script> like so',
			},
		})

		expect(html).not.toContain('</script> like so')
		expect(html).toContain('\\u003c/script>')
	})

	it('escapes a closing script tag in the file name', () => {
		const html = buildWebviewHtml({
			...INPUT,
			globals: { ...INPUT.globals, fileName: '</script>.md' },
		})

		expect(html).toContain('window.fileName = "\\u003c/script>.md";')
	})

	it("injects the note's remembered scroll offset", () => {
		const html = buildWebviewHtml({
			...INPUT,
			globals: { ...INPUT.globals, initialScrollTop: 1840 },
		})

		expect(html).toContain('window.initialScrollTop = 1840;')
	})

	it('injects the search jump when the note opens from a search result', () => {
		const html = buildWebviewHtml({
			...INPUT,
			globals: {
				...INPUT.globals,
				searchJump: {
					line: 58,
					column: 1,
					text: '<input',
					lineOffset: 8,
				},
			},
		})

		expect(html).toContain(
			'window.searchJump = {"line":58,"column":1,"text":"\\u003cinput","lineOffset":8};'
		)
	})

	/** Its absence is what the webview reads as "an ordinary open". */
	it('leaves the search jump out entirely when there is none', () => {
		expect(buildWebviewHtml(INPUT)).not.toContain('window.searchJump')
	})

	it('injects the heading jump when the note opens as a link target', () => {
		const html = buildWebviewHtml({
			...INPUT,
			globals: { ...INPUT.globals, headingJump: { hash: 'title' } },
		})

		expect(html).toContain('window.headingJump = {"hash":"title"};')
	})

	/** Its absence is what the webview reads as "an ordinary open". */
	it('leaves the heading jump out entirely when there is none', () => {
		expect(buildWebviewHtml(INPUT)).not.toContain('window.headingJump')
	})

	it('gives the app its mount point', () => {
		expect(buildWebviewHtml(INPUT)).toContain('<div id="root"></div>')
	})
})

describe('buildMissingAssetsHtml', () => {
	it('names the command that produces the missing assets', () => {
		expect(buildMissingAssetsHtml()).toContain('pnpm build')
	})
})
