import type { SlashCommandItem } from '#src/editor/extensions/slash-command/commands'
import { filterCommands } from '#src/editor/extensions/slash-command/slash-command-extension'
import type { RawSuggestionSource } from '#src/hooks/use-raw-suggestion-menu'
import { findSlashQuery } from '#src/lib/raw-slash-query'
import type { SlashQuery } from '#src/lib/raw-slash-query'

/** Raw mode's `/` menu: only the commands that have a markdown form to write. */
export const RAW_SLASH_SOURCE: RawSuggestionSource<
	SlashQuery,
	SlashCommandItem
> = {
	find: findSlashQuery,
	items: ({ query }) => filterCommands(query).filter((item) => item.raw),
	insertion: (item) => item.raw ?? null,
}
