import { isExternalHref } from '#src/lib/link/is-external-href'

export type ResolvedLinkHref =
	| { kind: 'external' }
	| { kind: 'same-document-hash'; hash: string }
	| { kind: 'relative'; href: string }

/**
 * What a link's click handler does with `href`: an absolute URL keeps opening
 * through `window.open` unchanged, a bare `#hash` scrolls the current
 * document with no host round trip, and everything else (a workspace-relative
 * path, optionally with its own `#hash`) is sent to the host as-is - the hash
 * travels along so the host can forward it for cross-document jump.
 */
export function resolveLinkHref(href: string): ResolvedLinkHref {
	if (isExternalHref(href)) return { kind: 'external' }
	if (href.startsWith('#'))
		return { kind: 'same-document-hash', hash: href.slice(1) }

	return { kind: 'relative', href }
}
