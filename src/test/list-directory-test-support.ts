import type * as vscode from 'vscode'

import { listDirectory } from '#src/host/list-directory'

export const DEFAULT_LISTING_FILTERS = {
	noteIndexRespectGitignore: true,
	noteIndexShowAiToolFolders: true,
}

/** The names listed, `/`-suffixed for a folder, so one assertion reads both. */
export async function listedNames(
	note: vscode.Uri,
	directory: string,
	filters = DEFAULT_LISTING_FILTERS
) {
	const entries = await listDirectory(note, directory, filters)
	return entries.map(({ name, kind }) =>
		kind === 'directory' ? `${name}/` : name
	)
}
