import { expandBraces } from '#src/lib/host/expand-braces'
import { MARKDOWN_FILE_EXTENSIONS } from '#src/lib/host/markdown-file-extensions'

/** Every file the editor opens, as a `findFiles` include glob. */
export const NOTE_INDEX_INCLUDE = `**/*.{${MARKDOWN_FILE_EXTENSIONS.map(
	(extension) => extension.slice(1)
).join(',')}}`

/**
 * Directories no one keeps notes in, but that hold thousands of markdown files
 * between them. Named one by one rather than as "every dot-directory", since
 * `.claude`, `.github` and their like are exactly where notes do live.
 */
const DEFAULT_EXCLUDED_DIRECTORIES = [
	'node_modules',
	'bower_components',
	'jspm_packages',
	'.git',
	'.svn',
	'.hg',
	'.vscode-test',
	'.next',
	'.nuxt',
	'.svelte-kit',
	'.turbo',
	'.cache',
	'.venv',
	'venv',
	'__pycache__',
	'.tox',
	'dist',
	'out',
	'build',
	'coverage',
	'vendor',
	'target',
	'test-results',
	'playwright-report',
	'.nyc_output',
	'.pytest_cache',
]

/**
 * One `findFiles` exclude glob from the defaults, `files.exclude` and the
 * index's own setting.
 *
 * `findFiles` applies `files.exclude` only when no exclude is passed at all,
 * so it has to be merged in by hand. Glob groups do not nest, so each
 * pattern's own braces are expanded before joining. Both settings arrive
 * untyped from the configuration API; entries that are not a plain enabled
 * glob are skipped.
 */
export function buildNoteIndexExclude(
	filesExclude: unknown,
	indexExclude: unknown
): string {
	const patterns = [
		...DEFAULT_EXCLUDED_DIRECTORIES.map((directory) => `**/${directory}/**`),
		...enabledGlobs(filesExclude),
		...stringGlobs(indexExclude),
	]
		.flatMap(expandBraces)
		.filter(isGroupable)

	return `{${patterns.join(',')}}`
}

/**
 * `files.exclude` maps globs to `true`, `false` or a `{ when }` sibling
 * condition, which a single exclude glob cannot express.
 */
function enabledGlobs(filesExclude: unknown): string[] {
	if (typeof filesExclude !== 'object' || filesExclude === null) return []

	return Object.entries(filesExclude)
		.filter(([, enabled]) => enabled === true)
		.map(([glob]) => glob)
}

/** The setting's non-empty string entries; anything else a user typed is ignored. */
function stringGlobs(globs: unknown): string[] {
	if (!Array.isArray(globs)) return []

	return globs.filter(
		(glob): glob is string => typeof glob === 'string' && glob !== ''
	)
}

/**
 * A pattern that still holds a brace or comma after expansion would split or
 * unbalance the joined group, excluding the wrong files or failing the search.
 */
function isGroupable(pattern: string): boolean {
	return !/[{},]/.test(pattern)
}

/** The `limit` most recently modified files, newest first. */
export function keepNewest<T extends { mtime: number }>(
	files: T[],
	limit: number
): T[] {
	return [...files].sort((a, b) => b.mtime - a.mtime).slice(0, limit)
}
