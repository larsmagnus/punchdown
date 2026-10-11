import * as path from 'path'

import * as vscode from 'vscode'

import { listGitIgnored } from '#src/host/list-git-ignored'
import { isGitIgnored } from '#src/lib/host/git-ignored-paths'
import { isVisibleNote } from '#src/lib/host/note-index-filter'
import type { DirectoryEntry, ViewOptions } from '#src/shared/messages'

/**
 * Never a link target, whatever `.gitignore` says. The note index's longer
 * denylist is about folders full of markdown nobody wrote, and a build or
 * coverage folder is exactly what a link may point into.
 */
const NEVER_LISTED = new Set(['.git', '.svn', '.hg', 'node_modules'])

type ListingFilters = Pick<
	ViewOptions,
	'noteIndexRespectGitignore' | 'noteIndexShowAiToolFolders'
>

/**
 * A folder's children for path completion, left out by the same rules as the
 * note index so its gitignore switch governs both. Empty for a folder that
 * cannot be read, or a `/` path with no workspace folder to anchor it.
 */
export async function listDirectory(
	note: vscode.Uri,
	directory: string,
	filters: ListingFilters
): Promise<DirectoryEntry[]> {
	const folder = vscode.workspace.getWorkspaceFolder(note)
	const target = directory.startsWith('/')
		? folder && vscode.Uri.joinPath(folder.uri, directory)
		: vscode.Uri.joinPath(note, '..', directory)
	if (!target) return []

	const [children, ignored] = await Promise.all([
		vscode.workspace.fs.readDirectory(target).then(undefined, () => []),
		folder && filters.noteIndexRespectGitignore
			? listGitIgnored(
					folder.uri.fsPath,
					path.posix.relative(folder.uri.path, target.path) || '.'
				)
			: null,
	])

	return children.flatMap(([name, type]): DirectoryEntry[] => {
		const kind = type & vscode.FileType.Directory ? 'directory' : 'file'
		if (kind === 'directory' && NEVER_LISTED.has(name)) return []
		if (!folder) return [{ name, kind }]

		// A trailing slash is how both git's verdict and the AI-tool
		// exemption tell a folder from a file of the same name.
		const relativePath =
			path.posix.relative(folder.uri.path, `${target.path}/${name}`) +
			(kind === 'directory' ? '/' : '')
		const visible = isVisibleNote(
			relativePath,
			ignored ? isGitIgnored(relativePath, ignored) : false,
			{
				respectGitignore: filters.noteIndexRespectGitignore,
				showAiToolFolders: filters.noteIndexShowAiToolFolders,
				hiddenDirectories: [],
			}
		)

		return visible ? [{ name, kind }] : []
	})
}
