import { useEditor } from '@tiptap/react'
import { useCallback, useRef, useState } from 'react'

import {
	EDITOR_KEYBOARD_HINT_ID,
	LIVE_EDITOR_ID,
} from '#src/editor/editor-mode-live-surface'
import { buildExtensions } from '#src/editor/extensions/build-extensions'
import { useFocusNavigation } from '#src/editor/extensions/focus-navigation/use-focus-navigation'
import { prepareParseableContent } from '#src/hooks/prepare-parseable-content'
import type { AnalyzerHandle } from '#src/hooks/use-analyzer'
import { useAskProposal } from '#src/hooks/use-ask-proposal'
import { useFlushOnDeactivate } from '#src/hooks/use-flush-on-deactivate'
import { useFrontmatterDocument } from '#src/hooks/use-frontmatter-document'
import { useHeadingJump } from '#src/hooks/use-heading-jump'
import { useItalicMarker } from '#src/hooks/use-italic-marker'
import { useMarkdownAutosync } from '#src/hooks/use-markdown-autosync'
import { useSearchJump } from '#src/hooks/use-search-jump'
import { useSettings } from '#src/hooks/use-settings'
import { useSyntaxHighlight } from '#src/hooks/use-syntax-highlight'
import { useTextTools } from '#src/hooks/use-text-tools'
import { useTextToolsRequest } from '#src/hooks/use-text-tools-request'
import type { FileKind } from '#src/lib/file-kind'
import { createOwnSyncTracker } from '#src/lib/own-sync-tracker'
import { host } from '#src/lib/webview-host'

/** Module-level, so the default keeps one identity and `sync` stays stable. */
const writeToHost = (content: string) =>
	host.send({ type: 'syncDocument', content })

/**
 * Everything the editor needs to run one note: the TipTap instance, autosync,
 * the writing checks and the live italic marker.
 *
 * Composed here rather than in the component so the component is only layout,
 * and so the order these depend on each other is stated once.
 *
 * `syncContent` comes from the caller rather than from `useHostDocument` here,
 * because that hook holds state: calling it twice would give the editor a
 * second, private copy of the document, and every sync would land in the one
 * nothing else reads.
 *
 * `active` is false while raw mode is on screen (`EditorBody`). This editor stays
 * mounted behind raw mode, so it still absorbs incoming content while hidden.
 * Only the expensive or visibility-only parts (autosync, the writing checks,
 * syntax highlighting, "Skip to editor") gate on it.
 *
 * `analyzer` comes from `EditorBody` when it renders inside the full app - one
 * `useAnalyzer()` shared with the raw editor's own writing checks, since each
 * spinning up its own would mean two workers and two copies of the spelling
 * dictionary for the same note. Falls back to an analyzer owned here
 * for every standalone mount (stories, component tests) that has no
 * `EditorBody` to share one with.
 *
 * `fileKind` picks the schema once, at construction - a panel is bound to one
 * file for its lifetime, so nothing here reacts to it changing later.
 */
export function useMarkdownEditor(
	content: string,
	syncContent: (content: string) => void = writeToHost,
	active = true,
	analyzer?: AnalyzerHandle,
	fileKind: FileKind = 'markdown'
) {
	const { settings } = useSettings()
	const textToolsRequest = useTextToolsRequest(analyzer)

	// What this editor recently wrote back, so the `content` that returns
	// through the host is recognizable as its own echo rather than an outside
	// edit - a bounded history rather than a single last value, since two
	// panels on the same document each see the other's write as an `update`,
	// and a second sync can be queued before the first one's echo arrives.
	const ownSyncTracker = useRef(createOwnSyncTracker())

	const sync = useCallback(
		(next: string) => {
			// Standalone has no host to echo a write back, so a record there would
			// only ever be mistaken for an echo of a later switch to that same text.
			if (host.isVSCode) ownSyncTracker.current.record(next)
			syncContent(next)
		},
		[syncContent]
	)

	const isOwnSync = useCallback(
		(next: string) => ownSyncTracker.current.matches(next),
		[]
	)

	const recordOwnSync = useCallback(
		(next: string) => ownSyncTracker.current.record(next),
		[]
	)

	// `useEditor` never rebuilds without an explicit deps array, which this
	// call doesn't pass - both are read exactly once, at construction, so
	// computing them fresh on every render (a full extension list rebuild, a
	// full MDX/acorn parse for `.mdx`) would only ever throw the result away.
	const [editorExtensions] = useState(() => buildExtensions(fileKind))
	const [initialBody] = useState(
		() => prepareParseableContent(content, fileKind).body
	)

	const editor = useEditor({
		extensions: editorExtensions,
		// markdown-it has no concept of frontmatter or of MDX's own syntax and
		// would mangle either, so the initial content has both spliced out -
		// `useFrontmatterDocument` restores them as real nodes right after mount,
		// the same way it rebuilds the doc for any later incoming change.
		content: initialBody,
		// A note has to open where the reader left it (`useScrollPosition`), and
		// any autofocus scrolls its caret into view over that. `'end'` also put a
		// freshly opened note at the bottom of the document rather than the top,
		// and `'start'` would open a note beginning with a diagram or code block
		// showing that block's source - `useCaretInside` reveals whichever block
		// holds the caret.
		autofocus: false,
		// TipTap's stylesheet is unlayered and beats ours, so we define core styles separately.
		injectCSS: false,
		editorProps: {
			// Make space for toolbar + bubble menu
			scrollMargin: 110,
			// Set here, not as props on `<EditorContent>`, so they land on
			// `view.dom` itself rather than TipTap's wrapper div. `role` is
			// explicit: TipTap only adds its own `role="textbox"` default when
			// nothing here already provides an `attributes` object.
			attributes: {
				role: 'textbox',
				id: LIVE_EDITOR_ID,
				spellcheck: 'false',
				'aria-describedby': EDITOR_KEYBOARD_HINT_ID,
			},
		},
	})

	useFrontmatterDocument(editor, content, isOwnSync, fileKind)
	useFocusNavigation(editor, active)

	// After the rebuild above, which is what puts the note's real text in the
	// document - searching the doc it was constructed with would miss the
	// frontmatter and race the only content sync this note ever gets for free.
	useSearchJump(editor)
	useHeadingJump(editor, active)

	const { flushQueuedSync } = useMarkdownAutosync({
		editor,
		syncContent: sync,
		enabled: active,
		recordOwnSync,
	})
	useFlushOnDeactivate(active, flushQueuedSync)

	// Not gated on `active` - the sidebar showing this analysis now stays on
	// screen while raw mode is active too (`EditorBody`), and this editor keeps
	// absorbing content while hidden regardless, so there is nothing stale about
	// running it in the background.
	const { analysis, isAnalyzing, hasSpellingFailed } = useTextTools({
		editor,
		...textToolsRequest,
	})

	useItalicMarker(editor, settings.italicMarker)
	const codeBlockStyle = useSyntaxHighlight(editor, active)
	useAskProposal(editor)

	return {
		editor,
		analysis,
		isAnalyzing,
		hasSpellingFailed,
		codeBlockStyle,
	}
}
