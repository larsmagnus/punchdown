export interface TextSelection {
	start: number
	end: number
}

interface TextEdit {
	before: string
	after: string
	selectionBefore: TextSelection
	selectionAfter: TextSelection
	/** The `InputEvent.inputType` that made the edit, `null` for one that should never merge. */
	inputType: string | null
	time: number
}

export interface TextHistoryStep {
	text: string
	selection: TextSelection
}

export interface TextHistory {
	record: (edit: TextEdit) => void
	undo: (selection: TextSelection) => TextHistoryStep | null
	redo: () => TextHistoryStep | null
}

/** The `inputType` of a change from outside the textarea, whether live mode's or the file's. */
export const OUTSIDE_CHANGE = 'outsideChange'

/** Matches ProseMirror's history defaults, so both modes step back by the same amount. */
const NEW_GROUP_DELAY_MS = 500
/** Longer than the sync debounce, so one burst of editing elsewhere stays one step. */
const OUTSIDE_GROUP_DELAY_MS = 2000
const DEPTH = 100

/**
 * Whether `edit` extends `last`'s undo step rather than starting a new one.
 *
 * Typing merges when it carries on from the caret within a short pause. Outside
 * changes arrive a sync at a time and say nothing of how the author grouped
 * them, so they merge with each other while they keep arriving close together.
 */
function continues(last: TextEdit, edit: TextEdit): boolean {
	if (edit.before !== last.after) return false
	if (edit.inputType === OUTSIDE_CHANGE) {
		return (
			last.inputType === OUTSIDE_CHANGE &&
			edit.time - last.time < OUTSIDE_GROUP_DELAY_MS
		)
	}
	return (
		edit.inputType !== null &&
		edit.inputType === last.inputType &&
		edit.time - last.time < NEW_GROUP_DELAY_MS &&
		edit.selectionBefore.start === edit.selectionBefore.end &&
		edit.selectionBefore.start === last.selectionAfter.start
	)
}

/**
 * An undo history of whole-text snapshots that groups a run of typing into one
 * step, as ProseMirror does.
 *
 * Raw mode keeps its own instead of the browser's. Chrome's undo stack is per
 * frame, so it stepped back through the hidden live editor's typing, and every
 * DOM write between keystrokes (the mirror redraws on each) closes its typing
 * group, leaving one step per character.
 */
export function createTextHistory(): TextHistory {
	const done: TextEdit[] = []
	const undone: TextEdit[] = []

	return {
		/** Adds an edit, merging it into the last step when it continues that step. */
		record(edit) {
			if (edit.before === edit.after) return
			undone.length = 0

			const last = done.at(-1)
			if (last && continues(last, edit)) {
				done[done.length - 1] = {
					...last,
					after: edit.after,
					selectionAfter: edit.selectionAfter,
					time: edit.time,
				}
				return
			}

			done.push(edit)
			if (done.length > DEPTH) done.shift()
		},
		/**
		 * Steps back one edit, or returns `null` when there is nothing to undo.
		 *
		 * `selection` is where the caret sits as it is undone, and where redo puts
		 * it back. A programmatic insertion moves the caret after its edit was
		 * recorded, so the recorded position would be stale.
		 */
		undo(selection) {
			const edit = done.pop()
			if (!edit) return null
			undone.push({ ...edit, selectionAfter: selection })
			return { text: edit.before, selection: edit.selectionBefore }
		},
		/** Steps forward over the last undone edit, or returns `null` when there is nothing to redo. */
		redo() {
			const edit = undone.pop()
			if (!edit) return null
			done.push(edit)
			return { text: edit.after, selection: edit.selectionAfter }
		},
	}
}
