import { toLf } from '#src/lib/host/line-endings'

const HISTORY_SIZE = 5

/**
 * Undoes exactly what `files.trimTrailingWhitespace` and
 * `files.insertFinalNewline` do to a file on save, and a CRLF document's line
 * endings, so text touched up by any of them still compares equal to what was
 * synced before.
 *
 * `tiptap-markdown`'s `HardBreak` serializer writes a hard break as a
 * trailing `\` rather than the GFM convention of two trailing spaces, so
 * trimming trailing whitespace here can never eat one - there is none to
 * trim.
 */
function normalize(text: string): string {
	const trimmed = toLf(text)
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/, ''))
		.join('\n')

	if (trimmed === '' || trimmed.endsWith('\n')) return trimmed
	return `${trimmed}\n`
}

/**
 * Remembers the last few texts this side synced, to tell its own echo apart
 * from a genuine external change.
 *
 * A single last-value ref loses in two real cases: two panels on the same
 * document, where panel B has to recognise panel A's write as well as its
 * own; and a second sync queued before the first one's echo arrives, which a
 * one-slot ref would already have overwritten by the time that echo shows up.
 */
export function createOwnSyncTracker() {
	const recent: string[] = []
	let headEchoed = false

	return {
		record(text: string) {
			recent.push(normalize(text))
			if (recent.length > HISTORY_SIZE) {
				recent.shift()
				headEchoed = false
			}
		},
		/**
		 * Returns whether `text` is a recorded sync coming back.
		 *
		 * Echoes arrive in send order, so a match retires every older sync. Text
		 * that matches nothing retires the head if it was already echoed. The head's
		 * text returning later, such as an undo in the other mode, reads as another
		 * writer's. Syncs still awaiting their echo stay matchable, since an outside
		 * change can reach the host before one of ours.
		 */
		matches(text: string): boolean {
			const index = recent.lastIndexOf(normalize(text))
			if (index === -1) {
				if (headEchoed) recent.shift()
				headEchoed = false
				return false
			}

			recent.splice(0, index)
			headEchoed = true
			return true
		},
	}
}
