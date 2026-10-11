import { DEMO_FILES } from '#src/lib/demo-files'
import { host } from '#src/lib/webview-host'
import type { DirectoryEntry } from '#src/shared/messages'

/**
 * Long enough that typing through one folder asks the host once, short enough
 * that a file created meanwhile shows up the next time the list opens.
 */
const LISTING_TTL_MS = 5_000

/** How long a reply may take before the folder lists as empty - a panel torn down mid-request never answers. */
const REPLY_TIMEOUT_MS = 3_000

const listings = new Map<
	string,
	{ at: number; entries: Promise<DirectoryEntry[]> }
>()
let lastRequestId = 0

/**
 * A folder's children, `directory` resolved by the host the way a link's
 * target is. Called on every keystroke, so a recent answer for the same folder
 * is reused.
 */
export function listDirectory(directory: string): Promise<DirectoryEntry[]> {
	const cached = listings.get(directory)
	if (cached && Date.now() - cached.at < LISTING_TTL_MS) return cached.entries

	const entries = host.isVSCode
		? requestListing(directory)
		: Promise.resolve(demoListing(directory))
	listings.set(directory, { at: Date.now(), entries })
	return entries
}

/** Answers are told apart by `requestId`, since folders take different times to read. */
function requestListing(directory: string): Promise<DirectoryEntry[]> {
	lastRequestId += 1
	const requestId = lastRequestId

	return new Promise((resolve) => {
		const settle = (entries: DirectoryEntry[]) => {
			clearTimeout(timeout)
			stopListening()
			resolve(entries)
		}
		const timeout = setTimeout(() => {
			listings.delete(directory)
			settle([])
		}, REPLY_TIMEOUT_MS)
		const stopListening = host.on('directoryListing', (message) => {
			if (message.requestId === requestId) settle(message.entries)
		})
		host.send({ type: 'listDirectory', requestId, directory })
	})
}

/** The demo notes all sit in one flat folder. */
function demoListing(directory: string): DirectoryEntry[] {
	if (!['', './', '/'].includes(directory)) return []
	return DEMO_FILES.map((name) => ({ name, kind: 'file' }))
}
