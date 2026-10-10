import { useCallback, useEffect, useState } from 'react'

import { useHostMessage } from '#src/hooks/use-host-message'
import { documentDirty } from '#src/lib/document-dirty-tracker'
import { toLf } from '#src/lib/host/line-endings'
import { host } from '#src/lib/webview-host'

/**
 * The note the host has open, and the way to write it back.
 *
 * Seeded from the globals the host injects ahead of the bundle, so the first
 * render already has the document rather than an empty editor.
 */
export function useHostDocument() {
	// LF only, whatever arrives: a textarea reports `\r\n` as `\n`, so offsets
	// into CRLF text drift from the ones the raw view's selection reports.
	const [content, setContent] = useState(() =>
		toLf(window.initialContent ?? '')
	)
	const [fileName, setFileName] = useState(() => window.fileName ?? '')

	// Those globals are frozen into the page when the note first opens, and a
	// window reload or reopening a closed tab rebuilds the page from that same
	// frozen HTML - so a page that just booted cannot tell whether it is
	// showing the file or a snapshot of it from an hour ago. Asking on every
	// boot is what closes that gap. `retainContextWhenHidden`
	// (`markdown-editor-provider.ts`) keeps a backgrounded page running, so
	// backgrounding never needs a re-ask. Only a freshly booted page asks,
	// which is why this is safe where a host-side push on visibility is not -
	// that would also hit pages whose context survived, still holding up to a
	// debounce of unsynced keystrokes.
	useEffect(() => {
		host.send({ type: 'getContent' })
	}, [])

	useHostMessage(
		'update',
		(message) => {
			setContent(toLf(message.content))
			setFileName(message.fileName)
		},
		host.isVSCode
	)

	// The one signal `documentDirty` (`use-note-sync.ts`) has for "the
	// `TextDocument` is clean again" - without it, the first edit after every
	// save but the very first would find the document still marked dirty from
	// before, and never sync immediately ahead of its debounce.
	useHostMessage(
		'documentSaved',
		() => {
			documentDirty.current = false
		},
		host.isVSCode
	)

	// Applying `next` here too, not just posting it, keeps `content` current for
	// readers like the toolbar's copy actions. The host suppresses its own echo
	// of this write (`DocumentWriter.matchesLastWrite`), so nothing else would
	// update `content` until the next external change. It can still lag the
	// latest keystroke by the sync debounce, the same latency the `TextDocument`
	// has.
	const syncContent = useCallback((next: string) => {
		setContent(next)
		host.send({ type: 'syncDocument', content: next })
	}, [])

	return { content, fileName, syncContent }
}
