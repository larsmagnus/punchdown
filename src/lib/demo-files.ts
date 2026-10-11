/**
 * The demo notes live in `public/` so both surfaces can reach the images they
 * reference: the web app serves that folder at the site root, and in the
 * extension the paths resolve against the file on disk. `import.meta.glob`
 * cannot see into `public/`, so the list is kept here and the files fetched.
 */
export const DEMO_NOTE_FILE_NAMES = [
	'notes.md',
	'other-note.md',
	'markdown-notes-architect.md',
	'sample-b.markdown',
	'sample-c.mdown',
	'sample-d.mkd',
	'sample-e.mdx',
	'sample-f.txt',
]

/** Everything else in `public/`, for path completion to offer beside the notes. */
export const DEMO_FILES = [
	...DEMO_NOTE_FILE_NAMES,
	'architecture.drawio.svg',
	'empty-note.md',
	'icon-punchdown.png',
	'icon-punchdown.svg',
	'sample-a.pdf',
	'screenshot-ask-claude.png',
	'screenshot-mermaid-visual-editing.png',
	'screenshot-punchdown.png',
	'screenshot-raw-editor.png',
]
