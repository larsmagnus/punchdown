import retextEnglish from 'retext-english'
import retextSpell from 'retext-spell'
import { unified } from 'unified'
import { VFile } from 'vfile'
import { describe, expect, it } from 'vitest'

import enAu from '#src/lib/text-tools/dictionaries/en-au'
import enGb from '#src/lib/text-tools/dictionaries/en-gb'
import enUs from '#src/lib/text-tools/dictionaries/en-us'

type SpellOptions = Parameters<typeof retextSpell>[0]

const TERMS = [
	'ADR',
	'SVG',
	'JSX',
	'TSX',
	'MCP',
	'frontmatter',
	'backtick',
	'backticks',
	'blockquote',
	'blockquotes',
	'checkbox',
	'checkboxes',
	'formatter',
	'CSP',
	'CLI',
	'CJS',
	'DX',
	'zod',
	'retext',
	'ESM',
	'Vite',
	'Vitest',
	'TSDoc',
	'JSDoc',
	'shadcn',
	'parser',
	'parsers',
	'subagent',
	'subagents',
	'typesafe',
	'getters',
	'GFM',
	'ProseMirror',
	'Shiki',
	'TipTap',
	'E2E',
	'autofocus',
]

const DICTIONARIES = { 'en-US': enUs, 'en-GB': enGb, 'en-AU': enAu }

async function misspellings(text: string, dictionary: unknown) {
	const file = new VFile(text)
	await unified()
		.use(retextEnglish)
		.use(retextSpell, dictionary as SpellOptions)
		.run(unified().use(retextEnglish).parse(file), file)
	return file.messages.map((message) => message.actual)
}

describe.each(Object.entries(DICTIONARIES))(
	'%s curated terms',
	(_, dictionary) => {
		it.each(TERMS)('accepts %s', async (term) => {
			expect(await misspellings(term, dictionary)).toEqual([])
		})
	}
)
