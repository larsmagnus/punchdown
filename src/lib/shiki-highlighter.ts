import type { HighlighterCore } from 'shiki'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

import type { ShikiTheme } from '#src/hooks/use-shiki-theme'
import { kindIsDark } from '#src/hooks/use-shiki-theme'
import { loadDefaultShikiTheme } from '#src/lib/default-shiki-theme'
import { findLanguageImporter } from '#src/lib/shiki-language-map'

/**
 * Lazily creates and caches the singleton Shiki highlighter.
 *
 * Fine-grained core build (`shiki/core` + the JS regex engine), not the `shiki`
 * package's main entry: the main entry bundles a resolution index for ~200
 * languages unconditionally and defaults to a WASM oniguruma engine. This
 * app's CSP has neither `unsafe-eval` nor `wasm-unsafe-eval` - the JS engine
 * sidesteps that question entirely instead of requiring it be verified, and it
 * avoids shipping a ~1MB WASM binary for a feature most notes never use.
 *
 * Reached only through `await import()` - from `use-syntax-highlight.ts` once
 * it has found a code block, and from `use-raw-syntax-highlight.ts` once raw
 * mode has any text at all - the core and the regex engine together are a
 * ~160kB chunk a note without code, or a note never opened in raw mode, must
 * not pay for. Nothing may import this module statically.
 */
let highlighterPromise: Promise<HighlighterCore> | undefined

export function getHighlighter(): Promise<HighlighterCore> {
	highlighterPromise ??= createHighlighterCore({
		themes: [],
		langs: [],
		// `forgiving` skips the Oniguruma patterns this engine cannot emulate
		// rather than throwing out of the grammar load. The alternative is one
		// unsupported pattern in a future `@shikijs/langs` release taking a whole
		// language down; a few uncolored tokens is the better failure.
		engine: createJavaScriptRegexEngine({ forgiving: true }),
	})

	return highlighterPromise
}

const languageLoads = new Map<string, Promise<void>>()

/**
 * Loads a fence tag's grammar if it isn't already loaded, returning the id to
 * pass Shiki, or `undefined` if the tag has no known grammar - the caller
 * falls back to rendering the block unhighlighted rather than throwing.
 */
export async function ensureLanguage(
	highlighter: HighlighterCore,
	tag: string
): Promise<string | undefined> {
	const importer = findLanguageImporter(tag)
	if (!importer) return undefined

	const canonical = tag.toLowerCase()
	// The pending load is cached, not just a finished one, so blocks tokenized
	// concurrently in one language share a single import and registration.
	if (!languageLoads.has(canonical)) {
		languageLoads.set(
			canonical,
			importer()
				.then(({ default: language }) => highlighter.loadLanguage(language))
				.catch((error: unknown) => {
					languageLoads.delete(canonical)
					throw error
				})
		)
	}
	await languageLoads.get(canonical)

	return canonical
}

const loadedThemeIds = new Set<string>()

/**
 * Loads a theme into the highlighter if it isn't already loaded, returning
 * its id to pass Shiki. Idempotent per `themeId`, so a theme that hasn't
 * changed since the last call is a no-op.
 *
 * `type` is set from the kind the host reported rather than left to the theme
 * JSON: Shiki reads a theme without one as dark (`theme.type ||= 'dark'`), and
 * that drives its foreground/background fallback for a theme that names
 * neither.
 */
async function ensureTheme(
	highlighter: HighlighterCore,
	theme: ShikiTheme
): Promise<string> {
	const dark = kindIsDark(theme.kind)

	if (!loadedThemeIds.has(theme.themeId)) {
		const raw = theme.raw ?? (await loadDefaultShikiTheme(dark))

		await highlighter.loadTheme({
			...raw,
			name: theme.themeId,
			type: dark ? 'dark' : 'light',
		})
		loadedThemeIds.add(theme.themeId)
	}

	return theme.themeId
}

/**
 * Resolves the singleton highlighter with `theme` loaded and ready to
 * tokenize - the "get a highlighter" step every caller of `tokenizeBlock`
 * needs before it, shared so `use-syntax-highlight.ts` and
 * `use-raw-syntax-highlight.ts` don't each re-sequence it themselves.
 */
export async function getThemedHighlighter(
	theme: ShikiTheme
): Promise<{ highlighter: HighlighterCore; themeId: string }> {
	const highlighter = await getHighlighter()
	const themeId = await ensureTheme(highlighter, theme)
	return { highlighter, themeId }
}

/**
 * A loaded theme's editor background/foreground, resolved by Shiki itself
 * (its own `colors['editor.background']` → `settings.background` → built-in
 * default fallback chain, not just a raw lookup that could come back empty).
 *
 * The token colors this module hands out assume they sit on this background -
 * Tailwind Typography's own fixed `pre` background is a different, unrelated
 * dark shade, so a light theme's dark-on-white token colors read as
 * unreadable dark-on-dark unless the block's actual background is overridden
 * to match. Call after `ensureTheme` has loaded the same `themeId`.
 */
export function themeColors(
	highlighter: HighlighterCore,
	themeId: string
): { bg: string; fg: string } {
	const resolved = highlighter.getTheme(themeId)
	return { bg: resolved.bg, fg: resolved.fg }
}
