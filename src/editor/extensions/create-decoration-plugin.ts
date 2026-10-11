import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorProps } from '@tiptap/pm/view'
import { DecorationSet } from '@tiptap/pm/view'

/**
 * The plugin scaffold shared by every decoration-only TipTap extension:
 * starts empty, replaces its decorations when `key`'s meta carries a fresh
 * set, and otherwise maps the existing ones through the transaction so they
 * survive edits between analyses.
 *
 * `clearable` adds a second meta shape - `null` wipes the decorations rather
 * than replacing them - for the one extension (`searchJump`) whose command
 * set includes an explicit clear. `props` merges in anything past
 * `decorations` a caller needs on the same plugin, e.g. `searchJump`'s
 * `handleDOMEvents`.
 */
export function createDecorationPlugin<Meta>(
	key: PluginKey<DecorationSet>,
	toDecorations: (doc: ProseMirrorNode, meta: Meta) => DecorationSet,
	{
		clearable = false,
		props,
	}: {
		clearable?: boolean
		props?: Omit<EditorProps<Plugin<DecorationSet>>, 'decorations'>
	} = {}
): Plugin<DecorationSet> {
	return new Plugin<DecorationSet>({
		key,
		state: {
			init: () => DecorationSet.empty,
			apply(tr, current) {
				const meta = tr.getMeta(key) as Meta | null | undefined

				if (clearable && meta === null) return DecorationSet.empty
				if (meta) return toDecorations(tr.doc, meta)

				return tr.docChanged ? current.map(tr.mapping, tr.doc) : current
			},
		},
		props: {
			...props,
			decorations(state) {
				return key.getState(state)
			},
		},
	})
}
