import { describe, expect, it } from 'vitest'

import { frontmatterFenceText } from '#src/editor/extensions/frontmatter/frontmatter-fence'
import { findOccurrences } from '#src/editor/extensions/search-jump/find-occurrences'
import { splitFrontmatter } from '#src/lib/host/frontmatter'
import { createOffsetMap } from '#src/lib/mode-switch/align-offsets'
import { liveTextModel } from '#src/lib/mode-switch/live-text-model'
import { createEditor } from '#src/test-utils/editor'

/**
 * A caret carried between the rendered document and its own markdown source,
 * one construct at a time, through the same two steps a mode switch takes.
 */
describe('mapping a caret between live and raw mode', () => {
	it.each([
		{
			construct: 'a paragraph with bold text',
			source: 'Intro line.\n\nShipped **the importer** on time.\n',
			marker: 'importer',
		},
		{
			construct: 'italic text',
			source: 'Intro line.\n\nShipped _the importer_ on time.\n',
			marker: 'importer',
		},
		{
			construct: 'struck-through text',
			source: 'Intro line.\n\nShipped ~~the importer~~ on time.\n',
			marker: 'importer',
		},
		{
			construct: 'inline code',
			source: 'Intro line.\n\nRun `pnpm verify` before pushing.\n',
			marker: 'verify',
		},
		{
			construct: 'a caret just inside a bold delimiter',
			source: 'Intro line.\n\nShipped **the importer** on time.\n',
			marker: '*the importer',
		},
		{
			construct: 'a link',
			source:
				'Intro line.\n\nRead [the changelog](https://example.com/changelog) first.\n',
			marker: 'changelog]',
		},
		{
			construct: 'a heading',
			source: '# Roadmap\n\n## Quarterly milestones\n\nBody text.\n',
			marker: 'milestones',
		},
		{
			construct: 'a bullet list item',
			source: 'Intro line.\n\n- First task\n- Second task\n- Third task\n',
			marker: 'Third',
		},
		{
			construct: 'an ordered list item',
			source: 'Intro line.\n\n1. Draft\n2. Review\n3. Publish\n',
			marker: 'Publish',
		},
		{
			construct: 'a nested list item',
			source: '- Groceries\n  - Fruit\n    - apples\n- Hardware\n',
			marker: 'apples',
		},
		{
			construct: 'a task item',
			source: 'Intro line.\n\n- [ ] Book flights\n- [x] Renew passport\n',
			marker: 'passport',
		},
		{
			construct: 'a blockquote',
			source: 'Intro line.\n\n> Measure twice, cut once.\n\nOutro.\n',
			marker: 'cut once',
		},
		{
			construct: 'an admonition',
			source: 'Intro line.\n\n> [!NOTE]\n> Rotate the backups weekly.\n',
			marker: 'backups',
		},
		{
			construct: 'a code block',
			source:
				'Intro line.\n\n```ts\nconst retries = 3\nexport default retries\n```\n',
			marker: 'export default',
		},
		{
			construct: 'a mermaid block',
			source:
				'Intro line.\n\n```mermaid\ngraph TD\n  Start --> Finish\n```\n\nOutro.\n',
			marker: 'Finish',
		},
		{
			construct: 'a table cell',
			source:
				'Intro line.\n\n| Name | Role |\n| --- | --- |\n| Ada | Engineer |\n| Grace | Admiral |\n',
			marker: 'Admiral',
		},
		{
			construct: 'a horizontal rule',
			source: 'Above the rule.\n\n---\n\nBelow the rule.\n',
			marker: 'Below',
		},
		{
			construct: 'text after an image',
			source:
				'Intro line.\n\n![Flow chart](./images/flow.png) explains the pipeline.\n',
			marker: 'pipeline',
		},
	])('lands on the same text in $construct', ({ source, marker }) => {
		const editor = createEditor(source)
		const model = liveTextModel(editor.state.doc)
		const [occurrence] = findOccurrences(editor.state.doc, marker)

		const rawOffset = createOffsetMap(
			model.text,
			source
		)(model.posToOffset(occurrence.from))
		const livePos = model.offsetToPos(
			createOffsetMap(source, model.text)(source.indexOf(marker))
		)

		expect(rawOffset).toBe(source.indexOf(marker))
		expect(livePos).toBe(occurrence.from)
	})

	it('lands on the same text in frontmatter', () => {
		const source = '---\ntitle: Roadmap\nstatus: draft\n---\n\n# Roadmap\n'
		const { frontmatter, body } = splitFrontmatter(source)
		const editor = createEditor(body)
		editor.commands.insertContentAt(0, {
			type: 'frontmatter',
			content: [
				{ type: 'text', text: frontmatterFenceText(frontmatter ?? '') },
			],
		})
		const model = liveTextModel(editor.state.doc)
		const [occurrence] = findOccurrences(editor.state.doc, 'draft')

		const rawOffset = createOffsetMap(
			model.text,
			source
		)(model.posToOffset(occurrence.from))
		const livePos = model.offsetToPos(
			createOffsetMap(source, model.text)(source.indexOf('draft'))
		)

		expect(rawOffset).toBe(source.indexOf('draft'))
		expect(livePos).toBe(occurrence.from)
	})
})
