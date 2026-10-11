// oxlint-disable-next-line no-restricted-imports
import { toScriptLiteral } from '#src/lib/host/script-literal'
// Relative, not `#src/`: this module is also compiled by `tsconfig.host.json`,
// which has no `paths` mapping precisely so aliases cannot reach the host build.
import type {
	Config,
	HeadingJump,
	ImageBaseUris,
	SearchJump,
} from '#src/shared/messages'

export type WebviewHtmlInput = {
	/** Webview URI of the built entry chunk. */
	scriptUri: string
	styleUris: string[]
	/** Fetched up front rather than when the entry chunk imports them. */
	preloadUris: string[]
	nonce: string
	contentSecurityPolicy: string
	/** Injected ahead of the bundle so webview failures reach the log channel. */
	logBridge: string
	/** Read off `window` by the app on its very first render. */
	globals: {
		initialContent: string
		fileName: string
		initialConfig: Config
		/** Where this note was left this session; `0` if it has not been open. */
		initialScrollTop: number
		imageBaseUris: ImageBaseUris
		/** Only when this note is opening from a search result, which is rare. */
		searchJump?: SearchJump
		/** Only when this note is opening as a link's target with a `#hash`. */
		headingJump?: HeadingJump
	}
}

/** The webview document. */
export function buildWebviewHtml({
	scriptUri,
	styleUris,
	preloadUris,
	nonce,
	contentSecurityPolicy,
	logBridge,
	globals,
}: WebviewHtmlInput): string {
	return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">
        <title>punchdown_</title>
        ${styleUris.map((uri) => `<link rel="stylesheet" crossorigin href="${uri}">`).join('\n        ')}
        ${preloadUris.map((uri) => `<link rel="modulepreload" crossorigin href="${uri}" nonce="${nonce}">`).join('\n        ')}
        <style>
            body, html {
                margin: 0;
                padding: 0;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="root"></div>
        <script nonce="${nonce}">
            window.vscode = acquireVsCodeApi();
            ${logBridge}
            window.initialContent = ${toScriptLiteral(globals.initialContent)};
            window.fileName = ${toScriptLiteral(globals.fileName)};
            window.initialConfig = ${toScriptLiteral(globals.initialConfig)};
            window.initialScrollTop = ${toScriptLiteral(globals.initialScrollTop)};
            window.imageBaseUris = ${toScriptLiteral(globals.imageBaseUris)};
            ${optionalGlobalAssignment('searchJump', globals.searchJump)}
            ${optionalGlobalAssignment('headingJump', globals.headingJump)}
        </script>
        <script type="module" crossorigin src="${scriptUri}" nonce="${nonce}"></script>
    </body>
    </html>`
}

/**
 * Assigned only when `value` is given, so the page an ordinary open produces
 * is unchanged and `'searchJump' in window` (or `'headingJump'`) reads as
 * the answer on its own.
 */
function optionalGlobalAssignment(name: string, value: unknown): string {
	if (value === undefined) return ''

	return `window.${name} = ${toScriptLiteral(value)};`
}

/**
 * Shown when `dist/` has no manifest to load. An empty panel gives no hint as
 * to why, and the fix is always the same.
 */
export function buildMissingAssetsHtml(): string {
	return `<!DOCTYPE html>
    <html lang="en">
    <body>
        <h1>punchdown could not start</h1>
        <p>The built webview assets are missing. Run <code>pnpm build</code> and reopen the file.</p>
    </body>
    </html>`
}
