import { File, Folder } from 'lucide-react'

import type { SuggestionMenuItem } from '#src/components/suggestion-menu'
import type {
	PathContext,
	PathQuery,
} from '#src/lib/path-completion/find-path-query'
import type { DirectoryEntry } from '#src/shared/messages'

export type PathSuggestion = SuggestionMenuItem & {
	/** Replaces the typed segment; a directory's ends in `/`, so the list moves into it. */
	insert: string
}

/**
 * The entries `query` fuzzily matches, as menu items: folders before files,
 * and within each kind, names starting with the query before the rest, then
 * alphabetical.
 */
export function pathSuggestions(
	entries: readonly DirectoryEntry[],
	{ query, context }: Pick<PathQuery, 'query' | 'context'>
): PathSuggestion[] {
	const search = query.toLowerCase()

	return entries
		.filter(({ name }) => isSubsequence(search, name.toLowerCase()))
		.sort(
			(a, b) =>
				rank(a, search) - rank(b, search) || a.name.localeCompare(b.name)
		)
		.map((entry) => ({
			id: entry.name,
			label: entry.name,
			icon: entry.kind === 'directory' ? Folder : File,
			insert: insertText(entry, context),
		}))
}

/** Lower sorts first. */
function rank({ name, kind }: DirectoryEntry, search: string): number {
	const kindRank = kind === 'directory' ? 0 : 2
	return kindRank + (name.toLowerCase().startsWith(search) ? 0 : 1)
}

/** Whether `search`'s characters all appear in `text`, in order. */
function isSubsequence(search: string, text: string): boolean {
	let index = 0
	for (const character of text) {
		if (character === search[index]) index += 1
	}
	return index === search.length
}

/**
 * `encodeURI` leaves `(`, `)`, `#`, `?` and `:` alone, which would end a link
 * target, start its anchor or query, or read as a URL scheme.
 */
function insertText({ name, kind }: DirectoryEntry, context: PathContext) {
	const path = kind === 'directory' ? `${name}/` : name
	if (context === 'code') return path

	return encodeURI(path).replace(
		/[()#?:]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
	)
}
