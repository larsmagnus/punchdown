import { useEffect, useMemo, useState } from 'react'

import { useHostMessage } from '#src/hooks/use-host-message'
import { useIsDark } from '#src/hooks/use-is-dark'
import { host } from '#src/lib/webview-host'
import type { ShikiThemeKind } from '#src/shared/messages'

/**
 * Which theme to highlight with - a description, not the theme body.
 *
 * `raw: null` stands for "the bundled default for this kind", which
 * `ensureTheme` fetches on demand. Naming it rather than carrying it keeps
 * both bundled themes, and Shiki itself, out of the entry chunk: this module
 * is reachable from the editor's first render, and a note with no code blocks
 * must not pay for any of it.
 */
export type ShikiTheme = {
	themeId: string
	kind: ShikiThemeKind
	raw: Record<string, unknown> | null
}

function defaultTheme(dark: boolean): ShikiTheme {
	return {
		themeId: dark ? 'bundled-default-dark' : 'bundled-default-light',
		kind: dark ? 'dark' : 'light',
		raw: null,
	}
}

/** Whether a `ShikiThemeKind` belongs on the dark side of the toggle. */
export function kindIsDark(kind: ShikiThemeKind): boolean {
	return kind === 'dark' || kind === 'high-contrast'
}

/**
 * The theme Shiki should highlight code blocks with.
 *
 * VS Code only ever exposes one active theme, but this editor's own light/dark
 * toggle (`useIsDark()`) is independent of it - switching the extension to
 * light while VS Code itself stays dark must not keep painting code with a
 * dark theme's text colors over a light background, which reads as unreadable
 * noise. So the host's extracted theme is only used when its own `kind`
 * matches the current side of that toggle; the *other* side always keeps the
 * bundled default for its kind, which is guaranteed to be readable no matter
 * which VS Code theme is active. A theme the host failed to extract behaves
 * the same as one that doesn't match - the bundled default for the current
 * side is used.
 *
 * Outside VS Code (the standalone web build), no host theme ever arrives, so
 * the bundled default is permanent there too.
 */
export function useShikiTheme(): ShikiTheme {
	const dark = useIsDark()
	const [hostTheme, setHostTheme] = useState<ShikiTheme | null>(null)

	useEffect(() => {
		if (!host.isVSCode) return
		host.send({ type: 'getShikiTheme' })
	}, [])

	useHostMessage(
		'shikiTheme',
		(message) => {
			setHostTheme(
				message.raw
					? { themeId: message.themeId, kind: message.kind, raw: message.raw }
					: null
			)
		},
		host.isVSCode
	)

	return useMemo(() => {
		if (hostTheme && kindIsDark(hostTheme.kind) === dark) return hostTheme
		return defaultTheme(dark)
	}, [hostTheme, dark])
}
