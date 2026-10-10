import * as vscode from 'vscode'

import { CONFIG_SECTION, VIEW_TYPE } from '#src/host/constants'
import { PanelRegistry } from '#src/host/panel-registry'
import { attachPanelSession } from '#src/host/panel-session'
import { PendingHeadingRevealStore } from '#src/host/pending-heading-reveal-store'
import { readSearchReveal } from '#src/host/read-search-reveal'
import { registerSaveParticipant } from '#src/host/save-participant'
import type { ScrollPositionStore } from '#src/host/scroll-position-store'
import type { SettingsStore } from '#src/host/settings-store'
import type { ShikiThemeStore } from '#src/host/shiki-theme-store'
import type { Logger } from '#src/shared/logger'
import type { HostToWebview } from '#src/shared/messages'

/**
 * The custom editor itself. Owns the set of open panels, which is what lets a
 * change in one tab reach all the others.
 */
export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
	private readonly context: vscode.ExtensionContext
	private readonly store: SettingsStore
	private readonly shikiThemeStore: ShikiThemeStore
	private readonly scrollPositions: ScrollPositionStore
	private readonly log: Logger
	private readonly panelRegistry = new PanelRegistry()
	/** A link's heading reveal, queued until its not-yet-open target exists. */
	private readonly pendingReveals = new PendingHeadingRevealStore()

	constructor(
		context: vscode.ExtensionContext,
		store: SettingsStore,
		shikiThemeStore: ShikiThemeStore,
		scrollPositions: ScrollPositionStore,
		log: Logger
	) {
		this.context = context
		this.store = store
		this.shikiThemeStore = shikiThemeStore
		this.scrollPositions = scrollPositions
		this.log = log
	}

	public register(): vscode.Disposable {
		return vscode.Disposable.from(
			// `enableFindWidget` is what makes Cmd/Ctrl+F trigger VSCode's built-in
			// webview find widget (searches rendered DOM text); it can only be set
			// here, not on `webviewPanel.options`, which is read-only per-panel.
			//
			// `retainContextWhenHidden` keeps a backgrounded tab's webview alive
			// instead of VSCode tearing it down and rebuilding it from frozen HTML
			// on return - the only way to keep TipTap's undo history across a tab
			// switch, since it lives entirely in the page. The cost is real: every
			// open note keeps its DOM, its TipTap instance, its Shiki highlighter
			// and (with the writing checks on) its retext worker resident for the
			// life of the window. If that bites, the lever is disposing the text
			// tools analyzer on `onDidChangeViewState`, not reverting this flag.
			// Reload and reopening a closed tab still rebuild the webview from
			// scratch - only backgrounding stops doing so.
			vscode.window.registerCustomEditorProvider(VIEW_TYPE, this, {
				webviewOptions: {
					enableFindWidget: true,
					retainContextWhenHidden: true,
				},
			}),
			vscode.workspace.onDidChangeConfiguration((event) => {
				if (event.affectsConfiguration(CONFIG_SECTION)) this.broadcastConfig()
			}),
			this.shikiThemeStore.onDidChangeTheme(this.broadcastShikiTheme),
			registerSaveParticipant(
				(uri) => this.panelRegistry.forUri(uri.toString()),
				this.log
			)
		)
	}

	/** Keeps every open editor tab in sync with the shared state. */
	public broadcastConfig = () => {
		this.panelRegistry.broadcast({
			type: 'config',
			...this.store.getConfig(),
		})
	}

	/** Keeps every open editor tab's syntax highlighting in sync with the
	 *  user's actual active VS Code color theme. */
	public broadcastShikiTheme = () => {
		this.panelRegistry.broadcast({
			type: 'shikiTheme',
			...this.shikiThemeStore.getTheme(),
		})
	}

	/** Only the focused tab opens its index; the others stay as they are. */
	public showNoteIndex = () => {
		const message: HostToWebview = { type: 'showNoteIndex' }

		void this.panelRegistry.activePanel()?.webview.postMessage(message)
	}

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		token: vscode.CancellationToken
	): Promise<void> {
		// Before the panel's HTML is built, since the reveal is injected into it -
		// this is the only moment a search-result click is observable at all.
		const searchReveal = await readSearchReveal(document, this.log)

		const session = attachPanelSession({
			panel: webviewPanel,
			document,
			extensionPath: this.context.extensionPath,
			store: this.store,
			scrollPositions: this.scrollPositions,
			searchReveal,
			log: this.log,
			broadcastConfig: this.broadcastConfig,
			readShikiTheme: () => this.shikiThemeStore.getTheme(),
			token,
			registry: this.panelRegistry,
			pendingReveals: this.pendingReveals,
		})

		const untrack = this.panelRegistry.track(
			document.uri.toString(),
			webviewPanel,
			session.writer
		)

		webviewPanel.onDidDispose(() => {
			untrack()
			session.disposable.dispose()
		})
	}
}
