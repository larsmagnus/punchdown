import type { RefObject } from 'react'
import { useCallback, useRef, useState } from 'react'
import { useEventCallback, useEventListener } from 'usehooks-ts'

import { historyInputAction, historyKeyAction } from '#src/lib/history-action'
import type { HistoryAction } from '#src/lib/history-action'
import { createTextHistory } from '#src/lib/text-history'
import type {
	OUTSIDE_CHANGE,
	TextHistoryStep,
	TextSelection,
} from '#src/lib/text-history'

interface RawHistoryOptions {
	textareaRef: RefObject<HTMLTextAreaElement | null>
	/** Puts an undone or redone text on screen, as the author's own edit. */
	apply: (step: TextHistoryStep) => void
}

interface PendingInput {
	selection: TextSelection
	inputType: string
}

/** The textarea's selection offsets, or the start when it is not mounted. */
function selectionOf(textarea: HTMLTextAreaElement | null): TextSelection {
	return {
		start: textarea?.selectionStart ?? 0,
		end: textarea?.selectionEnd ?? 0,
	}
}

/**
 * Routes the textarea's undo and redo through raw mode's own history
 * (`text-history.ts`), from keystrokes and from menus alike.
 */
export function useRawHistory({ textareaRef, apply }: RawHistoryOptions) {
	const [history] = useState(createTextHistory)
	// Captured at `beforeinput`, since the selection it replaced is gone by the
	// time the change arrives.
	const pendingInputRef = useRef<PendingInput | null>(null)

	/** Moves the history one step and puts the resulting text on screen. */
	const step = useEventCallback((action: HistoryAction) => {
		const next =
			action === 'undo'
				? history.undo(selectionOf(textareaRef.current))
				: history.redo()
		if (next) apply(next)
	})

	/** Answers an undo or redo input, and captures the selection of any other edit for `record`. */
	const onBeforeInput = useEventCallback((event: InputEvent) => {
		const action = historyInputAction(event)
		// A non-cancelable undo still fires `input`, where `onInput` steps it.
		if (action && event.cancelable) {
			event.preventDefault()
			step(action)
			return
		}
		if (action) return

		const pending = {
			selection: selectionOf(textareaRef.current),
			inputType: event.inputType,
		}
		pendingInputRef.current = pending
		// A real input's change lands within this task. Clear the pending input
		// after it, so a cancelled one can't describe a later write.
		setTimeout(() => {
			if (pendingInputRef.current === pending) pendingInputRef.current = null
		})
	})

	/** Overwrites the browser's own undo when a menu issued it, since `beforeinput` never fired. */
	const onInput = useEventCallback((event: InputEvent) => {
		const action = historyInputAction(event)
		if (action) step(action)
	})

	/** Answers undo and redo keystrokes before the browser acts on them. */
	const onKeyDown = useEventCallback((event: KeyboardEvent) => {
		const action = historyKeyAction(event)
		if (!action) return
		event.preventDefault()
		step(action)
	})

	// usehooks-ts types its ref without `| null`, though it accepts one.
	const target = textareaRef as RefObject<HTMLTextAreaElement>
	useEventListener('beforeinput', onBeforeInput, target)
	useEventListener('input', onInput, target)
	useEventListener('keydown', onKeyDown, target)

	/** Records the textarea's change from `before` to `after`, as the author's own edit unless it came from outside. */
	const record = useCallback(
		(before: string, after: string, inputType?: typeof OUTSIDE_CHANGE) => {
			const pending = inputType ? null : pendingInputRef.current
			pendingInputRef.current = null
			const selectionAfter = selectionOf(textareaRef.current)
			history.record({
				before,
				after,
				selectionBefore: pending?.selection ?? selectionAfter,
				selectionAfter,
				inputType: inputType ?? pending?.inputType ?? null,
				time: Date.now(),
			})
		},
		[history, textareaRef]
	)

	return record
}
