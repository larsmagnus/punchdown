import { Extension } from '@tiptap/core'
import type { ResolvedPos } from '@tiptap/pm/model'
import { PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'

import { createSuggestionMenuRender } from '#src/editor/extensions/suggestion-menu-render'
import {
	isAuthorEdit,
	rootOf,
} from '#src/editor/extensions/transaction-filters'
import { findPathQuery } from '#src/lib/path-completion/find-path-query'
import type { PathQuery } from '#src/lib/path-completion/find-path-query'
import { listDirectory } from '#src/lib/path-completion/list-directory'
import { pathSuggestions } from '#src/lib/path-completion/path-suggestions'
import type { PathSuggestion } from '#src/lib/path-completion/path-suggestions'

const pathCompletionKey = new PluginKey('pathCompletion')

/**
 * The path typed at `$pos`, `from` as a document position. Link and code
 * syntax is real text in this editor, so the textblock's text reads exactly
 * as raw mode's line does; each inline leaf stands in as one character to
 * keep offsets and positions aligned.
 */
function pathQueryAt($pos: ResolvedPos): PathQuery | null {
	if ($pos.parent.type.spec.code) return null

	const textBefore = $pos.parent.textBetween(
		0,
		$pos.parentOffset,
		undefined,
		'\ufffc'
	)
	const found = findPathQuery(textBefore)
	return found && { ...found, from: $pos.start() + found.from }
}

/** Ctrl+Space's ask to open the list, reopening it after Escape too. */
function isOpenRequest(transaction: Transaction): boolean {
	return rootOf(transaction).getMeta(pathCompletionKey)?.open === true
}

/**
 * Whether the list may show after `transaction`. Plugins append their own
 * transactions to a keystroke, and the list must answer the keystroke they
 * follow, not close on the selection-only batch that comes after it.
 */
function isEditOrOpenRequest(transaction: Transaction): boolean {
	const edited = rootOf(transaction).docChanged && isAuthorEdit([transaction])
	return edited || isOpenRequest(transaction)
}

/**
 * Suggests files and folders while a link or image target, or an inline code
 * span, is being typed - the live editor's half of path completion.
 *
 * Opens on an edit or Ctrl+Space only: a caret merely moved into a link
 * target would otherwise hand ArrowDown and Enter to a menu nobody asked for.
 * Picking a file closes the list. Left open, it would keep matching the file's
 * own name.
 */
export const PathCompletion = Extension.create({
	name: 'pathCompletion',

	addKeyboardShortcuts() {
		return {
			'Ctrl-Space': ({ editor }) => {
				if (!pathQueryAt(editor.state.selection.$from)) return false
				editor.view.dispatch(
					editor.state.tr.setMeta(pathCompletionKey, { open: true })
				)
				return true
			},
		}
	},

	addProseMirrorPlugins() {
		return [
			Suggestion<PathSuggestion>({
				pluginKey: pathCompletionKey,
				editor: this.editor,
				// Raw mode's text reaches this editor through `setContent` while it is
				// hidden; a link typed there must not pop a menu over the raw view.
				allow: ({ editor }) => editor.view.hasFocus(),
				// Once open, the list follows the caret like any other suggestion.
				shouldShow: ({ editor, transaction }) =>
					isEditOrOpenRequest(transaction) ||
					pathCompletionKey.getState(editor.state)?.active === true,
				shouldResetDismissed: ({ transaction }) => isOpenRequest(transaction),
				findSuggestionMatch: ({ $position }) => {
					const found = pathQueryAt($position)
					return (
						found && {
							range: { from: found.from, to: $position.pos },
							query: found.query,
							text: found.query,
						}
					)
				},
				items: async ({ editor }) => {
					const found = pathQueryAt(editor.state.selection.$from)
					if (!found) return []
					return pathSuggestions(await listDirectory(found.directory), found)
				},
				command: ({ editor, range, props }) => {
					const tr = editor.state.tr.insertText(
						props.insert,
						range.from,
						range.to
					)
					if (!props.insert.endsWith('/')) {
						tr.setMeta(pathCompletionKey, { exit: true })
					}
					editor.view.dispatch(tr)
				},
				render: createSuggestionMenuRender<PathSuggestion>({
					hideWhenEmpty: true,
				}),
			}),
		]
	},
})
