import { describe, expect, it } from 'vitest'

import { findOccurrences } from '#src/editor/extensions/search-jump/find-occurrences'
import { liveTextModel } from '#src/lib/mode-switch/live-text-model'
import { createEditor } from '#src/test-utils/editor'

describe('liveTextModel', () => {
	it('puts one line break between consecutive blocks', () => {
		const editor = createEditor('# Weekly review\n\nShipped the importer.')

		expect(liveTextModel(editor.state.doc).text).toBe(
			'# Weekly review\nShipped the importer.'
		)
	})

	it('keeps formatting delimiters, which the document holds as real text', () => {
		const editor = createEditor('Shipped **the importer** today.')

		expect(liveTextModel(editor.state.doc).text).toBe(
			'Shipped **the importer** today.'
		)
	})

	it('maps a position inside a block to its offset in the text', () => {
		const editor = createEditor('# Weekly review\n\nShipped the importer.')
		const model = liveTextModel(editor.state.doc)
		const [importer] = findOccurrences(editor.state.doc, 'importer')

		expect(model.posToOffset(importer.from)).toBe(
			model.text.indexOf('importer')
		)
	})

	it('maps an offset back to the position it came from, for every character', () => {
		const editor = createEditor(
			'# Weekly review\n\n- Shipped the importer\n- Fixed the exporter\n\nNext up: billing.'
		)
		const model = liveTextModel(editor.state.doc)

		for (let offset = 0; offset <= model.text.length; offset += 1) {
			const pos = model.offsetToPos(offset)
			expect(model.posToOffset(pos)).toBe(offset)
		}
	})

	it('gives every table cell its own line, header row included', () => {
		const editor = createEditor(
			'| Name | Role |\n| --- | --- |\n| Ada | Engineer |\n'
		)

		// The last line is the empty paragraph the editor keeps after a table.
		expect(liveTextModel(editor.state.doc).text).toBe(
			'Name\nRole\nAda\nEngineer\n'
		)
	})

	it('gives an empty paragraph a position of its own', () => {
		const editor = createEditor({
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'First line' }] },
				{ type: 'paragraph' },
				{ type: 'paragraph', content: [{ type: 'text', text: 'Third line' }] },
			],
		})
		const model = liveTextModel(editor.state.doc)
		const emptyLineOffset = model.text.indexOf('\n') + 1

		const pos = model.offsetToPos(emptyLineOffset)

		expect(editor.state.doc.resolve(pos).parent.content.size).toBe(0)
	})

	it('maps text after an image past the image itself', () => {
		const editor = createEditor(
			'Before ![Flow chart](./images/flow.png) after the chart'
		)
		const model = liveTextModel(editor.state.doc)
		const [after] = findOccurrences(editor.state.doc, 'after the chart')

		expect(model.offsetToPos(model.text.indexOf('after the chart'))).toBe(
			after.from
		)
	})

	it('clamps an offset past the end to the end of the last block', () => {
		const editor = createEditor('Only paragraph')
		const model = liveTextModel(editor.state.doc)

		expect(model.offsetToPos(model.text.length + 50)).toBe(
			model.offsetToPos(model.text.length)
		)
	})
})
