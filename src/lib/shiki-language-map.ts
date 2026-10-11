import type { LanguageRegistration } from 'shiki'

/**
 * Fence-tag aliases people actually type, mapped to the dynamic import that
 * loads their Shiki grammar.
 *
 * A lookup table, not a templated `import(`@shikijs/langs/${tag}`)`: Vite
 * cannot code-split a fully dynamic specifier (it would either bundle every
 * known language or fail to split at all), and a fence tag is freeform text
 * with no existing allowlist - it must never flow into an import specifier.
 * An unmapped tag is a lookup miss, not an error - the block just renders
 * unhighlighted (see `use-syntax-highlight.ts`).
 */
export const SHIKI_LANGUAGES: Record<
	string,
	() => Promise<{ default: LanguageRegistration[] }>
> = {
	js: () => import('@shikijs/langs/javascript'),
	javascript: () => import('@shikijs/langs/javascript'),
	jsx: () => import('@shikijs/langs/jsx'),
	ts: () => import('@shikijs/langs/typescript'),
	typescript: () => import('@shikijs/langs/typescript'),
	tsx: () => import('@shikijs/langs/tsx'),
	json: () => import('@shikijs/langs/json'),
	jsonc: () => import('@shikijs/langs/jsonc'),
	css: () => import('@shikijs/langs/css'),
	html: () => import('@shikijs/langs/html'),
	md: () => import('@shikijs/langs/markdown'),
	markdown: () => import('@shikijs/langs/markdown'),
	yaml: () => import('@shikijs/langs/yaml'),
	yml: () => import('@shikijs/langs/yaml'),
	sh: () => import('@shikijs/langs/bash'),
	bash: () => import('@shikijs/langs/bash'),
	shell: () => import('@shikijs/langs/bash'),
	python: () => import('@shikijs/langs/python'),
	py: () => import('@shikijs/langs/python'),
	go: () => import('@shikijs/langs/go'),
	rust: () => import('@shikijs/langs/rust'),
	rs: () => import('@shikijs/langs/rust'),
	java: () => import('@shikijs/langs/java'),
	c: () => import('@shikijs/langs/c'),
	cpp: () => import('@shikijs/langs/cpp'),
	'c++': () => import('@shikijs/langs/cpp'),
	sql: () => import('@shikijs/langs/sql'),
	graphql: () => import('@shikijs/langs/graphql'),
	toml: () => import('@shikijs/langs/toml'),
	diff: () => import('@shikijs/langs/diff'),
	dockerfile: () => import('@shikijs/langs/docker'),
	xml: () => import('@shikijs/langs/xml'),
	mermaid: () => import('@shikijs/langs/mermaid'),
}

/** Resolves a fence tag to its `SHIKI_LANGUAGES` importer, if there is one. */
export function findLanguageImporter(tag: string) {
	return SHIKI_LANGUAGES[tag.toLowerCase()]
}
