import * as vscode from 'vscode'

import { readSearchResults } from '#src/host/read-search-match'
import type { SearchMatch } from '#src/host/search-match'

/** Shared fixtures and helpers for the search-jump integration suites. */

export function pause(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

const SEARCH_POLL_MS = 250
const SEARCH_DEADLINE_MS = 20_000

/**
 * A query certain to match this workspace, which is what makes an empty result
 * set afterwards mean "this query found nothing" rather than "ripgrep has yet
 * to answer".
 */
const SEED_QUERY = 'punchdown'

/**
 * Whether the search view is serving `query`'s results rather than a previous
 * search's. A query expected to match nothing is done once the view is empty.
 */
function servesQuery(
	results: Map<string, SearchMatch[]>,
	query: string,
	expectMatches: boolean
): boolean {
	const matches = [...results.values()].flat()
	if (matches.length === 0) return !expectMatches

	const needle = query.toLowerCase()
	return matches.every((match) => match.lineText.toLowerCase().includes(needle))
}

/** Triggers the search and waits for its results to belong to `query`. */
async function search(query: string, expectMatches: boolean) {
	await vscode.commands.executeCommand('workbench.action.findInFiles', {
		query,
		triggerSearch: true,
		isRegex: false,
	})

	let previous: string | undefined
	let settled = false
	for (
		let waited = 0;
		waited < SEARCH_DEADLINE_MS && !settled;
		waited += SEARCH_POLL_MS
	) {
		await pause(SEARCH_POLL_MS)
		const results = await readSearchResults()
		const snapshot = JSON.stringify([...results])
		settled =
			servesQuery(results, query, expectMatches) && snapshot === previous
		previous = snapshot
	}

	if (!settled) {
		throw new Error(`Search for "${query}" did not settle within the deadline`)
	}
}

/**
 * Runs a workspace search (seeding SEED_QUERY first when expecting no matches),
 * waits for its results to settle, and leaves focus on the result list.
 *
 * ripgrep runs in the renderer and nothing signals completion to an extension,
 * so completion is polled for: the results have to belong to this query and
 * read the same twice running, since they stream in.
 */
export async function runSearch(
	query: string,
	{ expectMatches = true }: { expectMatches?: boolean } = {}
) {
	if (!expectMatches) await search(SEED_QUERY, true)
	await search(query, expectMatches)

	await vscode.commands.executeCommand('search.action.focusSearchList')
	await pause(500)
}
