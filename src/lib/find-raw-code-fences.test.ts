import { describe, expect, it } from 'vitest'

import {
	findRawCodeFences,
	overlayFenceTokens,
} from '#src/lib/find-raw-code-fences'

describe('findRawCodeFences', () => {
	it('should find the body of a js fence', () => {
		const body =
			'const total = items.reduce((sum, item) => sum + item.price, 0)\n'
		const text = `Intro\n\n\`\`\`js\n${body}\`\`\`\n\nOutro\n`

		const fences = findRawCodeFences(text)

		expect(fences).toHaveLength(1)
		expect(fences[0].language).toBe('js')
		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should find the body of an html fence', () => {
		const body = '<a href="https://example.com">Docs</a>\n'
		const text = `\`\`\`html\n${body}\`\`\`\n`

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['html'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should find the body of an sh fence', () => {
		const body = 'pnpm install --frozen-lockfile\npnpm build\n'
		const text = `\`\`\`sh\n${body}\`\`\`\n`

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['sh'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should find the body of a mermaid fence', () => {
		const body = 'graph TD\n  Host --> Webview\n'
		const text = `\`\`\`mermaid\n${body}\`\`\`\n`

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['mermaid'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should use only the first word of the info string as the language', () => {
		const text = '```ts title="user.ts"\nconst id = "user-123"\n```\n'

		expect(findRawCodeFences(text)[0].language).toBe('ts')
	})

	it('should accept up to three spaces of fence indent', () => {
		const text = '   ```js\nconst a = 1\n   ```\n'

		expect(findRawCodeFences(text)).toHaveLength(1)
	})

	it('should omit untagged fences', () => {
		expect(findRawCodeFences('```\nplain output\n```\n')).toEqual([])
	})

	it('should not read a tagged fence inside an untagged one as a fence', () => {
		const text = '````\n```js\nconst a = 1\n```\n````\n'

		expect(findRawCodeFences(text)).toEqual([])
	})

	it('should find a tilde fence', () => {
		const body = 'echo "Hello, World"\n'
		const text = `~~~sh\n${body}~~~\n`

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['sh'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should close a fence on a longer run of the same character', () => {
		const body = 'const a = 1\n'
		const text = `\`\`\`js\n${body}\`\`\`\`\`\nAfter\n`

		const fences = findRawCodeFences(text)

		expect(text.slice(fences[0].from, fences[0].to)).toBe(body)
	})

	it('should not close a fence on a shorter run or a different character', () => {
		const text = '````js\nconst a = 1\n```\n~~~~\nconst b = 2\n````\n'

		const fences = findRawCodeFences(text)

		expect(fences).toHaveLength(1)
		expect(text.slice(fences[0].from, fences[0].to)).toBe(
			'const a = 1\n```\n~~~~\nconst b = 2\n'
		)
	})

	it('should treat a js fence line inside an open fence as code', () => {
		const text = '```sh\necho start\n```js\necho end\n```\n'

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['sh'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe(
			'echo start\n```js\necho end\n'
		)
	})

	it('should run an unclosed fence to the end of the text', () => {
		const text = 'Intro\n\n```js\nconst unfinished = true\n'

		const fences = findRawCodeFences(text)

		expect(fences).toHaveLength(1)
		expect(fences[0].to).toBe(text.length)
		expect(text.slice(fences[0].from)).toBe('const unfinished = true\n')
	})

	it('should not read a backtick line with a backtick in its info string as an opener', () => {
		const text = '```js` const x = 1 ```\n\n```sh\necho done\n```\n'

		const fences = findRawCodeFences(text)

		expect(fences.map((f) => f.language)).toEqual(['sh'])
		expect(text.slice(fences[0].from, fences[0].to)).toBe('echo done\n')
	})

	it('should find several fences in one document', () => {
		const text = '```js\nlet a\n```\n\n```html\n<p></p>\n```\n'

		expect(findRawCodeFences(text).map((f) => f.language)).toEqual([
			'js',
			'html',
		])
	})
})

describe('overlayFenceTokens', () => {
	it('should replace markdown tokens inside a fence body with shifted fence tokens', () => {
		const markdownTokens = [
			{ offset: 0, length: 3, color: '#111111' },
			{ offset: 10, length: 5, color: '#222222' },
			{ offset: 30, length: 3, color: '#333333' },
		]
		const fences = [{ language: 'js', from: 8, to: 24 }]
		const fenceTokens = [[{ offset: 2, length: 5, color: '#00ff00' }]]

		expect(overlayFenceTokens(markdownTokens, fences, fenceTokens)).toEqual([
			{ offset: 0, length: 3, color: '#111111' },
			{ offset: 10, length: 5, color: '#00ff00' },
			{ offset: 30, length: 3, color: '#333333' },
		])
	})

	it('should sort the result by offset across several fences', () => {
		const fences = [
			{ language: 'js', from: 20, to: 30 },
			{ language: 'sh', from: 0, to: 10 },
		]
		const fenceTokens = [
			[{ offset: 0, length: 2, color: '#00ff00' }],
			[{ offset: 1, length: 2, color: '#ffff00' }],
		]

		expect(
			overlayFenceTokens(
				[{ offset: 12, length: 3, color: '#111111' }],
				fences,
				fenceTokens
			)
		).toEqual([
			{ offset: 1, length: 2, color: '#ffff00' },
			{ offset: 12, length: 3, color: '#111111' },
			{ offset: 20, length: 2, color: '#00ff00' },
		])
	})

	it('should keep markdown tokens for a fence whose language produced no tokens', () => {
		const markdownTokens = [{ offset: 10, length: 5, color: '#222222' }]
		const fences = [{ language: 'brainfuck', from: 8, to: 24 }]

		expect(overlayFenceTokens(markdownTokens, fences, [[]])).toEqual(
			markdownTokens
		)
	})
})
