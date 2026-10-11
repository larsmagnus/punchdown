import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'

import { SLASH_COMMANDS } from '#src/editor/extensions/slash-command/commands'
import type { SlashCommandItem } from '#src/editor/extensions/slash-command/commands'
import { createSuggestionMenuRender } from '#src/editor/extensions/suggestion-menu-render'
import { host } from '#src/lib/webview-host'

/**
 * Lower ranks first: a label starting with the query ("Ask Claude" for "ask")
 * beats one only matching because a keyword happens to contain it as a
 * substring ("task-list"'s `task` keyword also contains "ask") - without this,
 * `SLASH_COMMANDS`' declaration order would surface the coincidental match first.
 */
function rank(item: SlashCommandItem, search: string): number {
	const label = item.label.toLowerCase()
	if (label.startsWith(search)) return 0
	if (item.keywords.some((keyword) => keyword.startsWith(search))) return 1
	if (label.includes(search)) return 2
	return 3
}

/** Exported for `extension.test.ts` - hiding a `vscodeOnly` command has no other observable seam. */
export function filterCommands(query: string): SlashCommandItem[] {
	const search = query.toLowerCase()

	return SLASH_COMMANDS.filter(
		(item) =>
			(!item.vscodeOnly || host.isVSCode) &&
			(item.label.toLowerCase().includes(search) ||
				item.keywords.some((keyword) => keyword.includes(search)))
	).sort((a, b) => rank(a, search) - rank(b, search))
}

/**
 * Opens a filterable menu of editor actions when `/` is typed at the start of
 * an empty line - mermaid diagrams, code blocks, task lists, tables, and
 * images, listed in `commands.ts`. Modeled on TipTap's own slash-command
 * example.
 *
 * Contributes a `Suggestion` plugin only, no schema node, so where this sits
 * in `extensions.ts` doesn't matter.
 */
export const SlashCommand = Extension.create({
	name: 'slashCommand',

	addProseMirrorPlugins() {
		return [
			Suggestion<SlashCommandItem>({
				editor: this.editor,
				char: '/',
				startOfLine: true,
				// Raw mode's text reaches this editor through `setContent` while it is
				// hidden; a trailing `/` there must not pop a menu over the raw view.
				allow: ({ editor }) => editor.view.hasFocus(),
				items: ({ query }) => filterCommands(query),
				command: ({ editor, range, props }) => props.run(editor, range),
				render: createSuggestionMenuRender<SlashCommandItem>(),
			}),
		]
	},
})
