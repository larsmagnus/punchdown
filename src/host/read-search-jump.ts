import * as vscode from 'vscode'

import { readSearchResults } from '#src/host/read-search-match'
import { buildSearchJump } from '#src/host/search-jump'
import type { SearchMatch } from '#src/host/search-match'
import { splitFrontmatter } from '#src/lib/host/frontmatter'
import type { Logger } from '#src/shared/logger'
import type { SearchJump } from '#src/shared/messages'

/**
 * Nothing may open a note more slowly than this, jump or no jump. The search
 * view answers in single-digit milliseconds when it answers at all, so this is a
 * ceiling on the pathological case rather than a budget.
 */
const SEARCH_TIMEOUT_MS = 150

/**
 * Where to scroll and what to highlight for a note opening from a search result.
 *
 * `resolveCustomTextEditor` is the only moment a search click is observable - it
 * carries no selection, and revealing an already-open tab raises no event at
 * all. So this runs on every open and answers `undefined` for almost all of
 * them.
 */
export async function readSearchJump(
	document: vscode.TextDocument,
	log: Logger
): Promise<SearchJump | undefined> {
	const results = await readResultsWithinTimeout(log)

	const matches = results.get(document.uri.fsPath) ?? []
	if (matches.length === 0) return undefined

	const { lineOffset } = splitFrontmatter(document.getText())
	const jump = buildSearchJump({
		matches,
		allMatches: [...results.values()].flat(),
		lineOffset,
	})
	if (!jump) return undefined

	return isRepeat(document.uri, jump) ? undefined : remember(document.uri, jump)
}

/**
 * Whether this is the same jump already delivered once.
 *
 * The search view keeps serving its results long after the click that produced
 * them, so "this file has a match" stays true for a note reopened much later for
 * unrelated reasons. Skipping an exact repeat is what stops that note being
 * yanked to the same old match every single time it is opened.
 */
function isRepeat(uri: vscode.Uri, jump: SearchJump): boolean {
	return keyOf(uri, jump) === lastDelivered
}

function remember(uri: vscode.Uri, jump: SearchJump): SearchJump {
	lastDelivered = keyOf(uri, jump)

	return jump
}

let lastDelivered: string | undefined

function keyOf(uri: vscode.Uri, jump: SearchJump): string {
	return `${uri.toString()}:${jump.line}:${jump.column}`
}

/**
 * The current search results, or none if the search view is slow or unavailable.
 *
 * Both failure modes degrade the same way and for the same reason: this sits in
 * front of `panel.webview.html`, so a rejection here would blank the panel and a
 * hang would leave the note unopened. Neither is a price worth paying for a
 * scroll offset.
 */
async function readResultsWithinTimeout(log: Logger) {
	let timer: NodeJS.Timeout | undefined

	try {
		return await Promise.race([
			readSearchResults(),
			new Promise<Map<string, SearchMatch[]>>((resolve) => {
				timer = setTimeout(() => resolve(new Map()), SEARCH_TIMEOUT_MS)
			}),
		])
	} catch (error) {
		log.warn(`Could not read the search results: ${String(error)}`)

		return new Map<string, SearchMatch[]>()
	} finally {
		clearTimeout(timer)
	}
}
