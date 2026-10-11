import { z } from 'zod'

import {
	CLAUDE_PROMPT_TEMPLATE_MAX_LENGTH,
	DEFAULT_SETTINGS,
	DEFAULT_VIEW_OPTIONS,
	SPELLING_LANGUAGES,
	TEXT_TOOL_RULE_IDS,
} from '#src/shared/messages'
import type { NoteIndexEntry } from '#src/shared/messages'

/**
 * Runtime validation for everything the webview receives from outside itself:
 * `localStorage` (hand-editable), and the config payloads posted by the
 * extension host (which may be an older version than this bundle).
 *
 * Webview-only on purpose. The extension is packaged with `--no-dependencies`,
 * so anything the host requires at runtime must be dependency-free — the host
 * merges over its own defaults instead.
 *
 * Two conventions here:
 * - Every field carries a `.catch()`, so parsing always yields a usable value
 *   rather than throwing and blanking the editor.
 * - `.meta()` comes *after* `.catch()`. `.catch()` returns a fresh schema that
 *   does not inherit the inner schema's registry entry, so metadata applied
 *   first is silently dropped.
 */

// Zod feature-detects its JIT-compiled parser by calling `new Function('')` in
// a try/catch. The webview's CSP blocks that, so zod already falls back — but
// the attempt still raises a `securitypolicyviolation` the host logs as an
// error. Opting out up front keeps that channel meaningful.
z.config({ jitless: true })

const themeSchema = z
	.enum(['dark', 'light', 'system'])
	.catch(DEFAULT_VIEW_OPTIONS.theme)
	.meta({
		id: 'Theme',
		title: 'Theme',
		description:
			'Colour scheme for the editor surface. "system" follows the OS preference.',
		examples: ['dark', 'light', 'system'],
	})

export const viewOptionsSchema = z
	.object({
		raw: z.boolean().catch(DEFAULT_VIEW_OPTIONS.raw).meta({
			title: 'Raw markdown',
			description:
				'Show the unrendered markdown source instead of the WYSIWYG editor.',
		}),
		fullWidth: z.boolean().catch(DEFAULT_VIEW_OPTIONS.fullWidth).meta({
			title: 'Full width',
			description:
				"Let content fill the viewport, overriding the prose plugin's 65ch cap.",
		}),
		theme: themeSchema,
		textTools: z.boolean().catch(DEFAULT_VIEW_OPTIONS.textTools).meta({
			title: 'Text tools',
			description:
				'Show the writing-checks sidebar next to the document. Turning it on is what loads the retext bundle.',
		}),
		// Unknown ids are filtered out rather than failing the array, which a
		// `z.enum` would do - a single stale id would then reset the whole
		// selection to "everything on" instead of degrading to what still exists.
		textToolRules: z
			.array(z.string())
			.transform((ids) =>
				TEXT_TOOL_RULE_IDS.filter((ruleId) => ids.includes(ruleId))
			)
			.catch(DEFAULT_VIEW_OPTIONS.textToolRules)
			.meta({
				title: 'Text tool rules',
				description:
					'Which checks the sidebar runs. Normalised to the canonical rule order, with ids this build does not know dropped.',
			}),
		spellingLanguage: z
			.enum(SPELLING_LANGUAGES)
			.catch(DEFAULT_VIEW_OPTIONS.spellingLanguage)
			.meta({
				title: 'Spelling language',
				description:
					'Which English dictionary the spelling check loads. Also settable from the "Select spelling language" command.',
			}),
		spellingIgnoreWords: z
			.array(z.string())
			.catch(DEFAULT_VIEW_OPTIONS.spellingIgnoreWords)
			.meta({
				title: 'Spelling ignore words',
				description:
					'Words the spelling check accepts on top of its dictionary. Written by the "Add words to dictionary" command.',
			}),
		noteIndexRespectGitignore: z
			.boolean()
			.catch(DEFAULT_VIEW_OPTIONS.noteIndexRespectGitignore)
			.meta({
				title: 'Note index respects .gitignore',
				description:
					"Leave out of the note index whatever the workspace's .gitignore ignores.",
			}),
		noteIndexShowAiToolFolders: z
			.boolean()
			.catch(DEFAULT_VIEW_OPTIONS.noteIndexShowAiToolFolders)
			.meta({
				title: 'Note index shows AI-tool folders',
				description:
					"Keep AI tools' own directories (.claude, .cursor, …) in the note index even when they are gitignored.",
			}),
	})
	.catch(DEFAULT_VIEW_OPTIONS)
	.meta({
		id: 'ViewOptions',
		title: 'View options',
		description:
			'User-toggleable view state. Persisted in the host\'s globalState and broadcast to every open editor tab, so it survives reloads and stays in sync across tabs. Also settable from the "Toggle raw markdown", "Toggle full width", "Toggle text tools", "Select theme" and "Select spelling language" commands.',
	})

const extensionSettingsSchema = z
	.object({
		centerContent: z.boolean().catch(DEFAULT_SETTINGS.centerContent).meta({
			title: 'Center content',
			description:
				'Center the content horizontally when full width is off. Maps to `punchdown.centerContent`.',
		}),
		hideToolbar: z.boolean().catch(DEFAULT_SETTINGS.hideToolbar).meta({
			title: 'Hide toolbar',
			description:
				'Hide the toolbar. The toggles remain reachable from the command palette. Maps to `punchdown.hideToolbar`.',
		}),
		lineNumbers: z.boolean().catch(DEFAULT_SETTINGS.lineNumbers).meta({
			title: 'Line numbers',
			description:
				'Show line numbers in the raw markdown editor. Maps to `punchdown.lineNumbers`.',
		}),
		textToolsTargetAge: z
			.number()
			.int()
			.min(5)
			.max(30)
			.catch(DEFAULT_SETTINGS.textToolsTargetAge)
			.meta({
				title: 'Text tools target age',
				description:
					'Reading age the readability check scores against. Maps to `punchdown.textToolsTargetAge`.',
			}),
		italicMarker: z.enum(['_', '*']).catch(DEFAULT_SETTINGS.italicMarker).meta({
			title: 'Italic marker',
			description:
				'Marker used when italicizing from the editor itself. Maps to `punchdown.italicMarker`.',
		}),
		claudePromptTemplate: z
			.string()
			.max(CLAUDE_PROMPT_TEMPLATE_MAX_LENGTH)
			.catch(DEFAULT_SETTINGS.claudePromptTemplate)
			.meta({
				title: 'Claude prompt template',
				description:
					'Prompt sent to `claude` by the toolbar\'s "Open in Claude" action, with `%@` replaced by the note as an at-reference. Maps to `punchdown.claudePromptTemplate`.',
			}),
		claudeInlinePromptTemplate: z
			.string()
			.max(CLAUDE_PROMPT_TEMPLATE_MAX_LENGTH)
			.catch(DEFAULT_SETTINGS.claudeInlinePromptTemplate)
			.meta({
				title: 'Claude inline prompt template',
				description:
					'Prompt sent to `claude` by "Open in Claude" on one part of the note, with `%c` replaced by that part\'s source. Maps to `punchdown.claudeInlinePromptTemplate`.',
			}),
		imageCopyDirectory: z
			.string()
			.catch(DEFAULT_SETTINGS.imageCopyDirectory)
			.meta({
				title: 'Image copy directory',
				description:
					'Where the slash command\'s "image" action copies a file picked from outside the workspace, relative to the document\'s folder. Maps to `punchdown.imageCopyDirectory`.',
			}),
	})
	.catch(DEFAULT_SETTINGS)
	.meta({
		id: 'ExtensionSettings',
		title: 'Extension settings',
		description:
			'Read-only in the webview — owned by VS Code Settings under the `punchdown` section and pushed down by the host.',
	})

export const configSchema = z
	.object({
		settings: extensionSettingsSchema,
		viewOptions: viewOptionsSchema,
	})
	.catch({ settings: DEFAULT_SETTINGS, viewOptions: DEFAULT_VIEW_OPTIONS })
	.meta({
		id: 'Config',
		title: 'Initial config',
		description:
			'Injected into the page as `window.initialConfig` before the bundle runs, so the first render already has the right theme and width.',
	})

export const scrollTopSchema = z.number().nonnegative().catch(0).meta({
	id: 'ScrollTop',
	title: 'Scroll offset',
	description:
		'How far down a note was last scrolled. Injected as `window.initialScrollTop` in VS Code, or read back from `sessionStorage` in the standalone app; `0` is the top, and the fallback for anything unusable.',
})

export const searchRevealSchema = z
	.object({
		line: z.number().int().nonnegative().catch(0),
		column: z.number().int().nonnegative().catch(0),
		text: z.string().catch(''),
		lineOffset: z.number().int().nonnegative().catch(0),
	})
	.catch({ line: 0, column: 0, text: '', lineOffset: 0 })
	.meta({
		id: 'SearchReveal',
		title: 'Search reveal',
		description:
			'Injected as `window.searchReveal` when a note opens from a search result, naming the match to scroll to in *body* coordinates - the host has already subtracted the frontmatter, and `lineOffset` says how much, for raw mode to add back. Absent on an ordinary open. `text` is the matched source text, which the live editor looks for in the rendered document to place this match and highlight every other occurrence.',
	})

export const headingRevealSchema = z
	.object({
		hash: z.string().catch(''),
	})
	.catch({ hash: '' })
	.meta({
		id: 'HeadingReveal',
		title: 'Heading reveal',
		description:
			"Injected as `window.headingReveal` when a note opens as a link's target with a `#hash`, naming the heading to scroll to. Absent on an ordinary open.",
	})

/**
 * Sent live to an already-open panel whose document a link just targeted -
 * `window.headingReveal` only reaches a panel at the moment its own page
 * script runs, so an existing one needs this instead. `type` is not wrapped
 * in `.catch()`, unlike its payload: a mismatched literal is what lets
 * `useHostMessage` tell this message apart from any other traffic sharing the
 * page's `message` channel, and defaulting it would make foreign traffic
 * parse as a bogus reveal.
 */
export const revealHeadingMessageSchema = z.object({
	type: z.literal('revealHeading'),
	hash: z.string().catch(''),
})

export const webviewPanelStateSchema = z
	.object({
		scrollTop: z.number().nonnegative().optional().catch(undefined),
		searchRevealConsumed: z.boolean().optional().catch(undefined),
		headingRevealConsumed: z.boolean().optional().catch(undefined),
	})
	.catch({})
	.meta({
		id: 'WebviewPanelState',
		title: 'Webview panel state',
		description:
			'What this panel last recorded through `vscode.setState`, which is the only thing VS Code preserves when it tears the webview down for a backgrounded tab and rebuilds it from the HTML it already holds. Every field is optional because its absence is meaningful and must not degrade to a default: no `scrollTop` says to fall back to the offset the host injected, where a `0` would be a panel restored at the top, and no `searchRevealConsumed`/`headingRevealConsumed` says the injected reveal has not been acted on yet.',
	})

export const updateMessageSchema = z
	.object({
		type: z.literal('update'),
		content: z.string(),
		fileName: z.string(),
	})
	.meta({
		id: 'UpdateMessage',
		title: 'Document update',
		description:
			'Posted by the host whenever the underlying file changes. No `.catch()`, for the same reason as the config broadcast below: anything that fails to parse is not ours.',
	})

export const configMessageSchema = z
	.object({
		type: z.literal('config'),
		settings: extensionSettingsSchema,
		viewOptions: viewOptionsSchema,
	})
	.meta({
		id: 'ConfigMessage',
		title: 'Config broadcast',
		description:
			"Posted by the host to every open panel whenever the settings or the stored view options change. Unlike the schemas above this one has no `.catch()` — a message that fails to parse is another extension's traffic and must be ignored, not defaulted.",
	})

export const imagePickedMessageSchema = z
	.object({
		type: z.literal('imagePicked'),
		path: z.string().nullable(),
	})
	.meta({
		id: 'ImagePickedMessage',
		title: 'Image picked',
		description:
			"Posted by the host in reply to `pickImage`, once. Unlike the schemas above this one has no `.catch()` - a message that fails to parse is another extension's traffic and must be ignored, not defaulted.",
	})

export const askChunkMessageSchema = z
	.object({
		type: z.literal('askChunk'),
		requestId: z.string(),
		text: z.string(),
	})
	.meta({
		id: 'AskChunkMessage',
		title: 'Ask chunk',
		description:
			"Posted by the host as the Claude Agent SDK streams a reply. Unlike the schemas above this one has no `.catch()` - a message that fails to parse is another extension's traffic and must be ignored, not defaulted.",
	})

export const askDoneMessageSchema = z
	.object({
		type: z.literal('askDone'),
		requestId: z.string(),
	})
	.meta({
		id: 'AskDoneMessage',
		title: 'Ask done',
		description:
			'Posted by the host once an `askClaude` request finishes successfully. No `.catch()`, same reason as `askChunk`.',
	})

export const askErrorMessageSchema = z
	.object({
		type: z.literal('askError'),
		requestId: z.string(),
		error: z.string(),
	})
	.meta({
		id: 'AskErrorMessage',
		title: 'Ask error',
		description:
			'Posted by the host when an `askClaude` request fails. No `.catch()`, same reason as `askChunk`.',
	})

export const shikiThemeMessageSchema = z
	.object({
		type: z.literal('shikiTheme'),
		themeId: z.string().catch('unknown'),
		kind: z
			.enum(['light', 'dark', 'high-contrast', 'high-contrast-light'])
			.catch('dark'),
		// Structural, not exact - the host and webview `shiki` versions only need
		// to agree this is "object-shaped enough to hand to Shiki", not a byte-
		// for-byte match of its type.
		raw: z.record(z.string(), z.unknown()).nullable().catch(null),
	})
	.meta({
		id: 'ShikiThemeMessage',
		title: 'Shiki theme broadcast',
		description:
			"Posted by the host on request and whenever the active VS Code color theme changes. Unlike the schemas above this one has no top-level `.catch()` - a message that fails to parse is another extension's traffic and must be ignored, not defaulted.",
	})

export const requestLatestMessageSchema = z
	.object({
		type: z.literal('requestLatest'),
		requestId: z.string(),
	})
	.meta({
		id: 'RequestLatestMessage',
		title: 'Request latest content',
		description:
			"Posted by the host ahead of a VS Code save, asking the active view for its current text. No `.catch()` - a message that fails to parse is another extension's traffic and must be ignored, not defaulted.",
	})

export const documentSavedMessageSchema = z
	.object({
		type: z.literal('documentSaved'),
	})
	.meta({
		id: 'DocumentSavedMessage',
		title: 'Document saved',
		description:
			'Posted by the host once the document is written to disk. No `.catch()`, same reason as `requestLatest`.',
	})

const noteIndexEntrySchema: z.ZodType<NoteIndexEntry> = z.object({
	uri: z.string(),
	fileName: z.string(),
	directory: z.string(),
	title: z.string(),
	content: z.string().nullable(),
	tags: z.array(z.string()),
	modified: z.number().nullable(),
	size: z.number(),
	characters: z.number().nullable(),
	words: z.number().nullable(),
	current: z.boolean(),
})

export const noteIndexMessageSchema = z
	.object({
		type: z.literal('noteIndex'),
		requestId: z.number(),
		entries: z.array(noteIndexEntrySchema),
		total: z.number(),
		directories: z.array(
			z.object({ directory: z.string(), count: z.number() })
		),
		hiddenDirectories: z.array(z.string()),
		gitUnavailable: z.boolean(),
	})
	.meta({
		id: 'NoteIndexMessage',
		title: 'Note index',
		description:
			'Posted by the host in reply to `getNoteIndex`. No `.catch()`, same reason as `requestLatest`.',
	})

export const showNoteIndexMessageSchema = z
	.object({
		type: z.literal('showNoteIndex'),
	})
	.meta({
		id: 'ShowNoteIndexMessage',
		title: 'Show note index',
		description:
			'Posted by the host to the active panel when "Open index" runs from the command palette. No `.catch()`, same reason as `requestLatest`.',
	})

export const noteIndexFailedMessageSchema = z
	.object({
		type: z.literal('noteIndexFailed'),
		requestId: z.number(),
	})
	.meta({
		id: 'NoteIndexFailedMessage',
		title: 'Note index failed',
		description:
			'Posted by the host in reply to `getNoteIndex` when the workspace search fails. No `.catch()`, same reason as `requestLatest`.',
	})

export const directoryListingMessageSchema = z
	.object({
		type: z.literal('directoryListing'),
		requestId: z.number(),
		entries: z.array(
			z.object({
				name: z.string(),
				kind: z.enum(['file', 'directory']),
			})
		),
	})
	.meta({
		id: 'DirectoryListingMessage',
		title: 'Directory listing',
		description:
			'Posted by the host in reply to `listDirectory`. No `.catch()`, same reason as `requestLatest`.',
	})
