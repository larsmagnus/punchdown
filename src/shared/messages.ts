/**
 * Shared contract between the extension host (`src/host.ts`) and the
 * webview React app. Types and plain constants only — no runtime imports —
 * so this file is safe to include in both build graphs.
 */

export type Theme = 'dark' | 'light' | 'system'

/**
 * The writing checks the text tools panel can run. Adding one here is the first
 * of three steps - `RULES` in `src/lib/text-tools/rules.ts` carries its label,
 * and `RULE_PLUGINS` in `src/lib/text-tools/word-issues.ts` the retext plugin
 * behind it. Both are keyed by this union, so neither compiles until updated.
 * `RULE_SOURCES` in `src/lib/text-tools/vfile-message-to-issue.ts` is the
 * fourth, and the one a miss does not fail to compile on.
 *
 * These ids are persisted in the host's `globalState`, so renaming one silently
 * drops that rule from a user's saved selection.
 */
export const TEXT_TOOL_RULE_IDS = [
	'readability',
	'passive',
	'simplify',
	'intensify',
	'repeatedWords',
	'spelling',
	'polarity',
	'dashOveruse',
] as const

export type TextToolRuleId = (typeof TEXT_TOOL_RULE_IDS)[number]

/**
 * The English dictionaries spelling can check against, one Hunspell dictionary
 * each. Ordered as the panel's picker lists them.
 */
export const SPELLING_LANGUAGES = ['en-US', 'en-GB', 'en-AU'] as const

export type SpellingLanguage = (typeof SPELLING_LANGUAGES)[number]

/**
 * What each language is called, rather than its tag. Shared because the panel's
 * picker and the host's "Select spelling language" quick pick offer the same
 * three choices and should name them the same way.
 */
export const SPELLING_LANGUAGE_LABELS: Record<SpellingLanguage, string> = {
	'en-US': 'American',
	'en-GB': 'British',
	'en-AU': 'Australian',
}

export type ViewOptions = {
	raw: boolean
	fullWidth: boolean
	theme: Theme
	/** Whether the text tools sidebar is open. */
	textTools: boolean
	/** Which checks that sidebar runs. */
	textToolRules: TextToolRuleId[]
	/** Which English dictionary the spelling check uses. */
	spellingLanguage: SpellingLanguage
	/**
	 * Words the spelling check accepts on top of its dictionary.
	 *
	 * Written by `dictionary-words-command.ts`'s "Add words to dictionary"
	 * command and forwarded to the MCP server as `EMN_IGNORE_WORDS`.
	 */
	spellingIgnoreWords: string[]
	/** Whether the note index drops what the workspace's `.gitignore` ignores. */
	noteIndexRespectGitignore: boolean
	/**
	 * Whether the note index keeps AI tools' own directories in view even when
	 * they are gitignored.
	 */
	noteIndexShowAiToolFolders: boolean
}

export type ItalicMarker = '_' | '*'

/**
 * Matches `maxLength` on both `claudePromptTemplate` settings in
 * `package.json` - JSON has no way to reference this constant, so keep the
 * two in sync by hand.
 */
export const CLAUDE_PROMPT_TEMPLATE_MAX_LENGTH = 500

/**
 * How much of a `%c` excerpt reaches the prompt. It is there to point Claude
 * at one part of a file it is also being told to read, so a locator's worth is
 * enough - and the whole prompt is typed into a terminal a character at a time.
 */
export const CLAUDE_PROMPT_CONTENT_MAX_LENGTH = 300

export type ExtensionSettings = {
	centerContent: boolean
	hideToolbar: boolean
	lineNumbers: boolean
	/**
	 * Reading age the readability check scores against. A sentence too hard for
	 * this age reads as "hard"; one still too hard six years later, "very hard"
	 * (see `VERY_HARD_AGE_OFFSET` for why six).
	 */
	textToolsTargetAge: number
	/**
	 * Marker used when italicizing from the editor itself, not when parsing an
	 * existing file - italics already on disk keep whichever marker they were
	 * written with (see `Italic.extend` in `src/editor/extensions.ts`).
	 */
	italicMarker: ItalicMarker
	/**
	 * Prompt sent to `claude` by the toolbar's "Open in Claude" action.
	 * Tokens: `%@` the note as an at-reference, `%s` its bare path relative to
	 * the workspace root, `%c` the excerpt being asked about (nothing here).
	 */
	claudePromptTemplate: string
	/**
	 * Prompt sent to `claude` by "Open in Claude" on one part of the note - a
	 * diagram, so far. Same tokens as `claudePromptTemplate`, but `%c` carries
	 * that part's source, which is what narrows Claude to it.
	 */
	claudeInlinePromptTemplate: string
	/**
	 * Where the slash command's "image" action copies a file picked from
	 * outside the open document's workspace folder, relative to the
	 * document's own folder. A file already inside the workspace is
	 * referenced in place instead of being copied.
	 */
	imageCopyDirectory: string
}

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
	raw: false,
	fullWidth: false,
	theme: 'system',
	textTools: false,
	// Listed rather than spread from `TEXT_TOOL_RULE_IDS`: spelling is the one
	// check that has to load a dictionary, and is the noisiest on a technical
	// note, so it is opt-in - as are polarity and dash overuse, the most
	// subjective/novel of the checks and both prone to false-flagging
	// legitimate writing. A spread would quietly enable every rule added
	// after it too.
	textToolRules: [
		'readability',
		'passive',
		'simplify',
		'intensify',
		'repeatedWords',
	],
	spellingLanguage: 'en-US',
	spellingIgnoreWords: [],
	noteIndexRespectGitignore: true,
	noteIndexShowAiToolFolders: true,
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
	centerContent: false,
	hideToolbar: false,
	lineNumbers: true,
	textToolsTargetAge: 16,
	italicMarker: '_',
	claudePromptTemplate: 'Read %@ so I can ask you questions about it.',
	claudeInlinePromptTemplate:
		'Read %@, then focus on the part of it that starts with "%c" so I can ask you questions about that.',
	imageCopyDirectory: 'assets',
}

/**
 * What the host knows. The host fills in `DEFAULT_VIEW_OPTIONS` for anything
 * missing from `globalState`, but the webview still validates the payload
 * (`src/lib/schemas.ts`) since it may come from an older host.
 */
export type Config = {
	settings: ExtensionSettings
	viewOptions: ViewOptions
}

/**
 * Where the webview resolves image paths that are not already absolute URLs.
 * Both are `vscode-resource` URIs - a webview page cannot load a plain file
 * path, and its own origin is nothing the author's relative path can target.
 */
export type ImageBaseUris = {
	/** The folder holding the open document, for `./x.png` and `x.png`. */
	document: string
	/** The workspace root, for `/x.png`. */
	workspace: string
}

/**
 * Where to scroll a note opened from a search result, and what to highlight.
 *
 * Injected as `window.searchReveal` rather than posted, so the first paint
 * already knows where to go. Absent on an ordinary open, which is most of them.
 *
 * Positions are in *body* coordinates: search reports source lines, the editor
 * is given the markdown with its frontmatter stripped, and the host subtracts
 * `splitFrontmatter`'s `lineOffset` before any of this leaves it. The webview
 * never sees a source line and so cannot get that subtraction wrong.
 */
export type SearchReveal = {
	/** 0-based, relative to the body the editor holds. */
	line: number
	/** 0-based. */
	column: number
	/**
	 * The matched source text, which is what the live editor looks for in the
	 * rendered document - no markdown source map exists, so finding the text
	 * again is what places the match, and every other place it occurs.
	 *
	 * Its extent is an upper bound rather than a measurement (see
	 * `deriveQueryLength`), so it can carry a few characters of the surrounding
	 * line. That makes it fail to match rather than match the wrong place, which
	 * is the safe direction.
	 */
	text: string
	/**
	 * Source lines the frontmatter occupies, already subtracted from `line`. Raw
	 * mode adds it back, since the textarea holds the whole file including the
	 * frontmatter.
	 */
	lineOffset: number
}

/**
 * Where a link's `#hash` should scroll to, once its target document is open.
 *
 * Delivered two ways depending on whether the target already has a panel
 * open (see `heading-reveal-delivery.ts`): injected as `window.headingReveal`
 * for a freshly built one, exactly like `SearchReveal`, or posted live as a
 * `revealHeading` message to one that already exists - which a bare
 * injected global can't reach, since nothing re-runs the script that reads it.
 */
export type HeadingReveal = {
	/** The link's #fragment, already what `slugify-heading.ts` expects to
	 *  match against a document's own heading slugs. */
	hash: string
}

export type LogLevel = 'error' | 'warn' | 'info'

export type ShikiThemeKind =
	| 'light'
	| 'dark'
	| 'high-contrast'
	| 'high-contrast-light'

/**
 * The user's active VS Code color theme, reshaped for Shiki. `raw` is
 * structurally a Shiki `ThemeRegistrationRaw` (itself close to a VS Code theme
 * JSON body) - typed loosely here since the host, which produces it, must stay
 * dependency-free and cannot import Shiki's types. `null` means extraction
 * failed (theme extension not found, file unreadable, malformed JSON); the
 * webview falls back to its own bundled theme for `kind` in that case.
 */
export type ShikiThemePayload = {
	themeId: string
	kind: ShikiThemeKind
	raw: Record<string, unknown> | null
}

/** What a note's card in the index shows, as the host read it from disk. */
export type NoteSummary = {
	title: string
	/** The frontmatter `description`, else the note's first paragraph of prose. */
	content: string | null
	tags: string[]
	/** `null` for a note too large to read in full. */
	characters: number | null
	words: number | null
}

/** One note in the index. `uri` is opaque to the webview; it only sends it back. */
export type NoteIndexEntry = NoteSummary & {
	uri: string
	fileName: string
	/** Relative to the workspace, `''` at its root. */
	directory: string
	/** Epoch milliseconds, `null` where the file has no known time (the demo notes). */
	modified: number | null
	size: number
	/** The note the index was opened from. */
	current: boolean
}

/** How many notes sit under one top-level directory of the workspace. */
export type DirectoryCount = { directory: string; count: number }

/**
 * `total` counts every note found, so the webview can say how many
 * `NOTE_INDEX_LIMIT` left out. `directories` are the ones on offer for hiding,
 * hidden ones included; `hiddenDirectories` is what the host has stored for
 * this workspace; `gitUnavailable` means `.gitignore` could not be consulted
 * for some folder, so only the built-in exclusions applied there.
 */
export type NoteIndex = {
	entries: NoteIndexEntry[]
	total: number
	directories: DirectoryCount[]
	hiddenDirectories: string[]
	gitUnavailable: boolean
}

/**
 * What the index is asked to leave out. `hiddenDirectories` is absent on the
 * first ask of a session, when the host answers with what it stored.
 */
export type NoteIndexRequest = {
	respectGitignore: boolean
	showAiToolFolders: boolean
	hiddenDirectories?: string[]
}

/**
 * The most notes the index reads and lists, newest first. Each one costs a file
 * read and a card, and a monorepo can hold tens of thousands.
 */
export const NOTE_INDEX_LIMIT = 2000

/** One child of a folder, as path completion offers it. */
export type DirectoryEntry = { name: string; kind: 'file' | 'directory' }

export type WebviewToHost =
	/** Applies `content` to the `TextDocument`, which makes it dirty - it does
	 *  not write anything to disk. Only VS Code itself saves. */
	| { type: 'syncDocument'; content: string }
	| { type: 'getContent' }
	| { type: 'setViewOptions'; viewOptions: ViewOptions }
	/**
	 * Where this note is scrolled to, so reopening it lands in the same place.
	 *
	 * Not part of `ViewOptions`: those are one shared set of toggles broadcast to
	 * every panel, while this is per-document and belongs to this one. The host
	 * keeps it in memory only (`ScrollPositionStore`), so it lasts the session.
	 */
	| { type: 'setScrollTop'; scrollTop: number }
	/** Enables keybindings that only apply when text is selected. */
	| { type: 'setHasSelection'; hasSelection: boolean }
	/**
	 * Asks the host to reopen this document with VSCode's built-in text editor.
	 * Deliberately not part of `ViewOptions` - the webview may be disposed the
	 * moment the host acts on it, so there is nothing to persist.
	 */
	| { type: 'openInTextEditor' }
	/**
	 * Asks the host to open an integrated terminal running `claude`, prompted
	 * to read this document by path (see `claudePromptTemplate`). The path is
	 * never sent - the host resolves it from the same `vscode.TextDocument`
	 * `openInTextEditor` uses.
	 *
	 * `content` is an excerpt to point Claude at within that document (a
	 * diagram's source, so far). Sending it switches the host to
	 * `claudeInlinePromptTemplate`; only the excerpt travels, never the note.
	 */
	| { type: 'openClaudeTerminal'; content?: string }
	/**
	 * Diagnostics from inside the webview. Nothing in there reaches the extension
	 * host's console, so without this a script that fails to load or throws on
	 * mount just leaves a blank panel.
	 */
	| { type: 'log'; level: LogLevel; message: string }
	/** Requested once on mount rather than injected alongside `initialConfig`:
	 *  a resolved theme is tens of kilobytes of JSON, and inlining that into
	 *  every panel's HTML would cost every note, code blocks or not. */
	| { type: 'getShikiTheme' }
	/** Asks the host to show its native file-open dialog for an image, for the
	 *  slash command's "image" action. Answered once, by `imagePicked`. */
	| { type: 'pickImage' }
	/**
	 * Asks the host to run `prompt` through the Claude Agent SDK, pointed at
	 * this document by path the same way `openClaudeTerminal` is - the path is
	 * never sent, the host resolves it from its own `vscode.TextDocument`.
	 * `selectedText` is the excerpt being asked about (bubble menu only; the
	 * `/ask` slash command has none). `requestId` is webview-generated so
	 * replies for more than one in-flight ask can be told apart.
	 */
	| {
			type: 'askClaude'
			requestId: string
			prompt: string
			selectedText?: string
	  }
	/** Stops a running `askClaude` request; no reply is sent for it. */
	| { type: 'cancelAsk'; requestId: string }
	/**
	 * Answers `requestLatest` with whatever the active view - live or raw -
	 * currently holds, read directly rather than through the debounced sync
	 * path. Sent by the view `active` at the moment the request arrives; the
	 * other stays silent, since its held text can lag by up to a debounce.
	 *
	 * `content` is `null` when nothing is pending: the document already holds
	 * this view's text, either because it was already synced or because the
	 * current state is only a freshly absorbed external change nobody typed.
	 * Answering with `currentFile()` regardless would let this view's own
	 * re-serialization of that external change (escaping a footnote, say)
	 * overwrite it.
	 */
	| { type: 'latestContent'; requestId: string; content: string | null }
	/**
	 * Asks the host to open a relative link's target - a workspace file, or a
	 * URL with no recognized scheme. Only sent for an href that is not an
	 * absolute URL with an external scheme (those still `window.open`
	 * directly) and not a same-document hash-only link (`#title` resolves
	 * entirely client-side). `href` is the literal delimiter text between the
	 * parens, unmodified - the host does all path resolution, mirroring how
	 * `image-base-uris.ts` resolves a relative image src. Still carries its
	 * own `#hash`, if any, so the host can forward it for cross-document
	 * reveal once the target is open.
	 */
	| { type: 'openLink'; href: string }
	/**
	 * Asks for every note in the workspace. Answered once, by `noteIndex`, which
	 * echoes `requestId`: scans take different times, so a late answer to an
	 * earlier ask must be recognisable as stale.
	 */
	| ({ type: 'getNoteIndex'; requestId: number } & NoteIndexRequest)
	/** `beside` opens it in the editor group to the side. */
	| { type: 'openNoteIndexEntry'; uri: string; beside: boolean }
	/**
	 * Asks for a folder's children, for path completion. `directory` is a path
	 * as a link would hold it, decoded: relative to this note's folder, or to its
	 * workspace folder when it starts with `/`. Answered once, by
	 * `directoryListing`.
	 */
	| { type: 'listDirectory'; requestId: number; directory: string }

export type HostToWebview =
	| { type: 'update'; content: string; fileName: string }
	| ({ type: 'config' } & Config)
	/** Sent in reply to `getShikiTheme`, and again whenever the user switches
	 *  their active VS Code color theme. */
	| ({ type: 'shikiTheme' } & ShikiThemePayload)
	/** Sent in reply to `pickImage`. `path` is relative to the document's own
	 *  folder (the same base `resolveImageSrc` resolves a relative `src`
	 *  against), or `null` if the dialog was cancelled. */
	| { type: 'imagePicked'; path: string | null }
	/** Streamed reply to `askClaude`: one chunk of the response's text delta. */
	| { type: 'askChunk'; requestId: string; text: string }
	/** Sent once an `askClaude` request finishes successfully. */
	| { type: 'askDone'; requestId: string }
	/** Sent once an `askClaude` request fails - a bad/missing `claude` CLI,
	 *  an auth failure, or the request being aborted. */
	| { type: 'askError'; requestId: string; error: string }
	/**
	 * Asks the active view for its current text, ahead of a VS Code save
	 * (`onWillSaveTextDocument`) - the last debounced sync can be up to a
	 * second behind whatever was just typed. Answered once, by `latestContent`.
	 */
	| { type: 'requestLatest'; requestId: string }
	/**
	 * The document was just saved to disk. The one signal the webview has for
	 * "the `TextDocument` is clean again" - it has no other way to read
	 * `TextDocument.isDirty` directly.
	 */
	| { type: 'documentSaved' }
	/** Posted to an already-open panel whose document a link just targeted -
	 *  see `HeadingReveal`. A freshly opened panel gets the same information
	 *  injected as `window.headingReveal` instead. */
	| ({ type: 'revealHeading' } & HeadingReveal)
	/** Sent in reply to `getNoteIndex`. */
	| ({ type: 'noteIndex'; requestId: number } & NoteIndex)
	/** Sent in reply to `getNoteIndex` when the search itself failed. */
	| { type: 'noteIndexFailed'; requestId: number }
	/** The command palette's "Open index", posted to the active panel only. */
	| { type: 'showNoteIndex' }
	/** Sent in reply to `listDirectory`; empty for a folder that cannot be read. */
	| { type: 'directoryListing'; requestId: number; entries: DirectoryEntry[] }
