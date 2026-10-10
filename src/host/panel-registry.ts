import type * as vscode from 'vscode'

import type { DocumentWriter } from '#src/host/document-updates'
import type { HostToWebview } from '#src/shared/messages'

/** One open note: the panel showing it and the writer that applies its edits. */
export type OpenPanel = {
	uri: string
	panel: vscode.WebviewPanel
	writer: Pick<DocumentWriter, 'write'>
}

/**
 * Every open panel, in one place, so a broadcast, a link's heading reveal and
 * a save each ask the same registry rather than keeping their own list.
 */
export class PanelRegistry {
	private readonly open = new Set<OpenPanel>()

	/**
	 * Registers a panel and returns the call that removes it again.
	 *
	 * A `null` writer is a session that was cancelled before it wired anything
	 * (`attachPanelSession`): its page will never read a message, so registering
	 * it would let a heading reveal vanish into it rather than fall back to the
	 * pending-reveal queue.
	 */
	public track(
		uri: string,
		panel: vscode.WebviewPanel,
		writer: OpenPanel['writer'] | null
	): () => void {
		if (!writer) return () => {}

		const entry: OpenPanel = { uri, panel, writer }
		this.open.add(entry)

		return () => {
			this.open.delete(entry)
		}
	}

	/** Every panel showing `uri`, which may be more than one tab. */
	public forUri(uri: string): OpenPanel[] {
		return [...this.open].filter((entry) => entry.uri === uri)
	}

	/** Posts to every open panel, which keeps two tabs on one note agreeing. */
	public broadcast(message: HostToWebview): void {
		for (const { panel } of this.open) {
			void panel.webview.postMessage(message)
		}
	}

	/** The panel the user is looking at, if any is. */
	public activePanel(): vscode.WebviewPanel | undefined {
		return [...this.open].find(({ panel }) => panel.active)?.panel
	}
}
