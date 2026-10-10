import { host } from '#src/lib/webview-host'

/**
 * Asks the host to open a relative link's target. A no-op outside VS Code -
 * the standalone build has nowhere to open a workspace file, same as today.
 */
export function openLink(href: string): void {
	host.send({ type: 'openLink', href })
}
