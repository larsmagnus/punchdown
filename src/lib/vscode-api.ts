import type {
	Config,
	HeadingReveal,
	ImageBaseUris,
	SearchReveal,
	WebviewToHost,
} from '#src/shared/messages'

interface VSCodeAPI {
	postMessage: (message: WebviewToHost) => void
	getState: () => unknown
	setState: (state: unknown) => void
}

declare global {
	interface Window {
		vscode?: VSCodeAPI
		initialContent?: string
		fileName?: string
		initialConfig?: Config
		initialScrollTop?: number
		imageBaseUris?: ImageBaseUris
		/** Absent on an ordinary open, which is what makes it the trigger. */
		searchReveal?: SearchReveal
		/** Absent unless this note is opening as a link's target with a `#hash`. */
		headingReveal?: HeadingReveal
	}
}
