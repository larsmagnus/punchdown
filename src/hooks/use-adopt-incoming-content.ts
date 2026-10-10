import type { RefObject } from 'react'
import { useEffect } from 'react'

import { useCarriedSelection } from '#src/hooks/use-carried-selection'
import { host } from '#src/lib/webview-host'

interface AdoptIncomingContentOptions {
	content: string
	draft: string
	draftRef: RefObject<string>
	adoptedRef: RefObject<string>
	setDraft: (value: string) => void
	textareaRef: RefObject<HTMLTextAreaElement | null>
}

/**
 * Takes each new `content` into raw mode's draft, unless the author has
 * anything pending.
 *
 * The host echoes every sync back as an `update`, and that echo is a debounce
 * behind the keystrokes still arriving - adopting it mid-edit would reset both
 * the text and the caret. With nothing pending a focused textarea adopts too,
 * caret carried over: a switch from live mode focuses this view before live
 * mode's last keystrokes have reached it.
 *
 * Standalone, `content` only changes when the file selector picks another
 * note, so an unfocused view always takes it: there is no echo to wait out.
 */
export function useAdoptIncomingContent({
	content,
	draft,
	draftRef,
	adoptedRef,
	setDraft,
	textareaRef,
}: AdoptIncomingContentOptions) {
	const carrySelectionTo = useCarriedSelection(draft)

	useEffect(() => {
		const textarea = textareaRef.current
		const focused = textarea !== null && document.activeElement === textarea
		const hasUnsynced = draftRef.current !== adoptedRef.current
		if (hasUnsynced && (focused || host.isVSCode)) return
		if (focused) carrySelectionTo(textarea, content)

		adoptedRef.current = content
		setDraft(content)
	}, [adoptedRef, carrySelectionTo, content, draftRef, setDraft, textareaRef])
}
