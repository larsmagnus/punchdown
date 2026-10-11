import type { RawSuggestionSource } from '#src/hooks/use-raw-suggestion-menu'
import { listsSameFolder } from '#src/lib/path-completion/find-path-query'
import type { PathQuery } from '#src/lib/path-completion/find-path-query'
import { findRawPathQuery } from '#src/lib/path-completion/find-raw-path-query'
import { listDirectory } from '#src/lib/path-completion/list-directory'
import { pathSuggestions } from '#src/lib/path-completion/path-suggestions'
import type { PathSuggestion } from '#src/lib/path-completion/path-suggestions'

/** Raw mode's path completion, inside a link target or an inline code span. */
export const RAW_PATH_SOURCE: RawSuggestionSource<PathQuery, PathSuggestion> = {
	find: findRawPathQuery,
	items: async (query) =>
		pathSuggestions(await listDirectory(query.directory), query),
	insertion: ({ insert }) => ({ text: insert }),
	keepsItems: listsSameFolder,
}
