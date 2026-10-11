/**
 * Hand-maintained terms the generated wordlist lacks or gets wrong.
 *
 * Unlike `technical-terms.generated.ts` this file is edited by hand and ships
 * to every user. Case is exact for acronyms and proper names (`SVG`, `Vite`);
 * lowercase entries also match their sentence-initial form.
 */
export const CURATED_TERMS: string[] = [
	// Formats and acronyms
	'ADR',
	'CJS',
	'CSP',
	'DX',
	'E2E',
	'ESM',
	'GFM',
	'JSX',
	'MCP',
	'CLI',
	'SVG',
	'TSX',

	// Tools and libraries
	'ProseMirror',
	'Shiki',
	'TipTap',
	'Vite',
	'Vitest',
	'TSDoc',
	'JSDoc',
	'retext',
	'shadcn',
	'zod',

	// Markdown and editor vocabulary
	'autofocus',
	'backtick',
	'backticks',
	'blockquote',
	'blockquotes',
	'checkbox',
	'checkboxes',
	'formatter',
	'frontmatter',
	'getters',
	'parser',
	'parsers',
	'subagent',
	'subagents',
	'typesafe',
]
