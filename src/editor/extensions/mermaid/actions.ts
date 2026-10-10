import { copyToClipboard } from '#src/lib/clipboard'
import { host } from '#src/lib/webview-host'

/**
 * Hands one diagram to Claude: inside VS Code by asking the host to open a
 * terminal, and standalone by the only route a browser tab has - the clipboard
 * plus claude.ai, the same fallback `ButtonCopy` takes.
 *
 * The source travels with the host message because the host knows which file
 * this is but nothing about which of its diagrams was asked about.
 *
 * Returns whether the clipboard was written, which the caller owes the reader
 * an acknowledgement of - replacing what someone has copied is not something
 * to do silently.
 */
export function openDiagramInClaude(
	code: string,
	isVSCodeContext: boolean
): boolean {
	if (isVSCodeContext) {
		host.send({ type: 'openClaudeTerminal', content: code })
		return false
	}

	copyToClipboard(code)
	window.open('https://claude.ai', '_blank', 'noopener,noreferrer')
	return true
}

/**
 * Copies one diagram to the clipboard as draw.io XML.
 *
 * The converter and mermaid's parser are imported on demand since most
 * diagrams are never exported. A failure is reported rather than thrown so the
 * click never ends in an unhandled rejection, and `onCopied` only runs for a
 * copy that happened.
 */
export async function copyDiagramAsDrawio(
	code: string,
	svg: string,
	onCopied: () => void
) {
	try {
		const [{ svgToDrawio }, { readNodeTypes }] = await Promise.all([
			import('#src/editor/extensions/mermaid/drawio/svg-to-drawio'),
			import('#src/editor/extensions/mermaid/drawio/node-types'),
		])
		if (await copyToClipboard(svgToDrawio(svg, await readNodeTypes(code)))) {
			onCopied()
		}
	} catch (error) {
		console.error('Could not copy the diagram as draw.io:', error)
	}
}
