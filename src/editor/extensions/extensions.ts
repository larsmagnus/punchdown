import { Color } from '@tiptap/extension-color'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { TextStyle } from '@tiptap/extension-text-style'
import type { TextStyleOptions } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import type { MarkdownStorage } from 'tiptap-markdown'
import { Markdown } from 'tiptap-markdown'

import { Admonition } from '#src/editor/extensions/admonition/admonition-extension'
import { createAdmonitionRevealProvider } from '#src/editor/extensions/admonition/admonition-reveal-provider'
import { AskInlineStatus } from '#src/editor/extensions/ask/ask-inline-status-extension'
import { AskSuggestion } from '#src/editor/extensions/ask/ask-suggestion-extension'
import { BlockMarkers } from '#src/editor/extensions/block-marker/block-marker-extension'
import { createMarkerRevealProvider } from '#src/editor/extensions/block-marker/create-marker-reveal-provider'
import { MarkerBackspace } from '#src/editor/extensions/block-marker/marker-backspace-extension'
import { BLOCK_MARKER_SPECS } from '#src/editor/extensions/block-marker/specs'
import { BlockquoteExtension } from '#src/editor/extensions/blockquote/blockquote-extension'
import { CodeBlockExtension } from '#src/editor/extensions/code-block/code-block-extension'
import { CodeExtension } from '#src/editor/extensions/code-block/code-extension'
import { FocusNavigation } from '#src/editor/extensions/focus-navigation/focus-navigation-extension'
import { BoldExtension } from '#src/editor/extensions/formatting/bold-extension'
import { createDelimitedMarkRevealProvider } from '#src/editor/extensions/formatting/create-delimited-mark-reveal-provider'
import { fixedDelimiter } from '#src/editor/extensions/formatting/delimiter-spec'
import { inlineCodeDelimiterSpec } from '#src/editor/extensions/formatting/inline-code/inline-code-delimiter-spec'
import { StrikeExtension } from '#src/editor/extensions/formatting/strike-extension'
import { WrapSelectionOnKeypress } from '#src/editor/extensions/formatting/wrap-selection-on-keypress-extension'
import { HardBreakExtension } from '#src/editor/extensions/hard-break/hard-break-extension'
import { HeadingExtension } from '#src/editor/extensions/heading/heading-extension'
import { HorizontalRuleExtension } from '#src/editor/extensions/horizontal-rule/horizontal-rule-extension'
import { HtmlBlockExtension } from '#src/editor/extensions/html-block/html-block-extension'
import { createImageSourceRevealProvider } from '#src/editor/extensions/image/create-image-source-reveal-provider'
import { ImageSource } from '#src/editor/extensions/image/edit-source'
import { ImageExtension } from '#src/editor/extensions/image/image-extension'
import { italicDelimiterSpec } from '#src/editor/extensions/italic/italic-delimiter-spec'
import { ItalicExtension } from '#src/editor/extensions/italic/italic-extension'
import { hasLinkScheme } from '#src/editor/extensions/link/has-link-scheme'
import { linkDelimiterSpec } from '#src/editor/extensions/link/link-delimiter-spec'
import { LinkExtension } from '#src/editor/extensions/link/link-extension'
import { StrictLinkify } from '#src/editor/extensions/link/strict-linkify-extension'
import { BulletListExtension } from '#src/editor/extensions/list/bullet-list-extension'
import { ListEnter } from '#src/editor/extensions/list/list-enter-extension'
import { ListItemExtension } from '#src/editor/extensions/list/list-item-extension'
import { OrderedListExtension } from '#src/editor/extensions/list/ordered-list-extension'
import { TaskListExtension } from '#src/editor/extensions/list/task-list-extension'
import { LiteralBlockExtension } from '#src/editor/extensions/literal-block/literal-block-extension'
import { BlockSource } from '#src/editor/extensions/markdown/block-source/block-source-extension'
import { MarkdownClipboard } from '#src/editor/extensions/markdown/markdown-clipboard-extension'
import { patchMarkdownEscaping } from '#src/editor/extensions/markdown/markdown-escaping'
import { MdxBlockExtension } from '#src/editor/extensions/mdx-block/mdx-block-extension'
import { ParagraphExtension } from '#src/editor/extensions/paragraph-extension'
import { PathCompletion } from '#src/editor/extensions/path-completion/path-completion-extension'
import { SearchJumpHighlight } from '#src/editor/extensions/search-jump/search-jump-extension'
import { SlashCommand } from '#src/editor/extensions/slash-command/slash-command-extension'
import { SyntaxHighlight } from '#src/editor/extensions/syntax-highlight/syntax-highlight-extension'
import { SyntaxReveal } from '#src/editor/extensions/syntax-reveal/syntax-reveal-extension'
import { TabIndent } from '#src/editor/extensions/tab-indent/tab-indent-extension'
import { TableCommands } from '#src/editor/extensions/table/commands'
import { MarkdownTable } from '#src/editor/extensions/table/table-extension'
import { TaskItemExtension } from '#src/editor/extensions/task-item/task-item-extension'
import { TextTools } from '#src/editor/extensions/text-tools/text-tools-extension'

patchMarkdownEscaping()

/**
 * `tiptap-markdown`'s table/task-list/image serializers only activate when a
 * same-named extension is registered somewhere in `SHARED_HEAD_EXTENSIONS`/
 * `SHARED_TAIL_EXTENSIONS` below - without a node for each of them,
 * markdown-it parses that construct into HTML the schema then drops, and the
 * next auto-save writes the loss to disk.
 */

/**
 * The extensions every file kind shares, minus `Document`/`Frontmatter` -
 * `buildExtensions` (`build-extensions.ts`) splices those two in per file
 * kind, since they're the only pair that varies.
 */
export const SHARED_HEAD_EXTENSIONS = [
	Color.configure({ types: [TextStyle.name, ListItemExtension.name] }),
	TextStyle.configure({
		types: [ListItemExtension.name],
	} as Partial<TextStyleOptions>),
	StarterKit.configure({
		// Replaced below so an edited list saves the markers it shows.
		bulletList: false,
		orderedList: false,
		codeBlock: false,
		code: false,
		italic: false,
		heading: false,
		blockquote: false,
		// Disabled here, replaced by their own file in this folder or `formatting/`.
		bold: false,
		strike: false,
		// Bundled as of v3. Link is registered below with autolink disabled;
		// underline stays unsupported (see CLAUDE.md).
		link: false,
		underline: false,
		// Replaced below so the top-level content expression can require
		// frontmatter, if present, to be the document's first node.
		document: false,
		// Replaced below by its own file in `list/` - see why.
		listItem: false,
		// Replaced below: a rule holds its own `---` as text, which a leaf atom
		// cannot do.
		horizontalRule: false,
		// Replaced below so consecutive blank lines survive serialization.
		paragraph: false,
		// Replaced below so a hard-wrapped paragraph keeps its line breaks.
		hardBreak: false,
	}),
]

/**
 * Everything after the `Document`/`Frontmatter` pair `buildExtensions`
 * (`build-extensions.ts`) splices in per file kind.
 */
export const SHARED_TAIL_EXTENSIONS = [
	ParagraphExtension,
	HardBreakExtension,
	CodeBlockExtension,
	HorizontalRuleExtension,
	// Only reachable on `.mdx` files - `restoreMdxBlocksInTransaction` is the
	// sole place that ever creates one. Harmless to register unconditionally.
	MdxBlockExtension,
	// Only created on load, for a block that cannot be represented faithfully -
	// see `markdown/block-source/`.
	LiteralBlockExtension,
	HtmlBlockExtension,
	HeadingExtension,
	BlockquoteExtension,
	Admonition,
	// ListItemExtension's merge plugin must run before BlockMarkers' marker-sync
	// so renumbering happens after lists are merged - the two plugins run in the
	// same appendTransaction batch, and this registration order controls their
	// relative execution.
	// Before `ListItemExtension`, whose own toggle commands - the ones that
	// strip a marker on the way out - have to override the stock ones.
	BulletListExtension,
	OrderedListExtension,
	ListItemExtension,
	// The shared strip pass every block marker's toggle-off relies on.
	BlockMarkers,
	// Linkifying is markdown-it's job, kept to URLs with an explicit scheme by
	// `StrictLinkify`. TipTap's own autolink plugin has no such restriction and
	// runs on every transaction, turning a heading reading `notes.md` into
	// `[notes.md](http://notes.md)`. Its paste handling has the same gap, so
	// pasted text links only with a scheme too, and pasting a URL onto a
	// selection belongs to `paste-url-onto-selection-plugin.ts` alone.
	//
	// Registration order is mark rank, which decides nesting: Link before
	// Italic before Code, so `*text `code` text*` nests `*` around the ticks.
	LinkExtension.configure({
		autolink: false,
		linkOnPaste: false,
		shouldAutoLink: hasLinkScheme,
	}),
	ItalicExtension,
	CodeExtension,
	BoldExtension,
	StrikeExtension,
	WrapSelectionOnKeypress,
	// Column resizing needs handle styling and a toolbar to be worth it - tables
	// are edited in place instead, with Tab/Shift-Tab moving between cells.
	MarkdownTable,
	// Reordering and column alignment, neither of which TipTap exposes.
	TableCommands,
	TableRow,
	// Cells hold inline content directly. TipTap's default is `block+`, which
	// wraps every cell in a paragraph.
	TableHeader.extend({ content: 'inline*' }),
	TableCell.extend({ content: 'inline*' }),
	// `tiptap-markdown` only adds its `tight` attribute to bulletList and
	// orderedList, so task lists would otherwise serialize with a blank line
	// between every item.
	TaskListExtension,
	TaskItemExtension,
	// After both item types, so its Enter outranks their own `splitListItem`.
	ListEnter,
	ImageExtension,
	ImageSource,
	Markdown.configure({
		// No p inside li in md
		tightLists: true,
		// Turn bare URLs into links. They serialize back in autolink form
		// (`<https://example.com>`) rather than as bare text.
		linkify: true,
	}),
	StrictLinkify,
	// Saves untouched blocks back exactly as they were read.
	BlockSource,
	// Registered after `Markdown`, whose `onBeforeCreate` builds the parser and
	// serializer this reads off `editor.storage`.
	MarkdownClipboard,
	// Decorations only, inert until the text tools panel feeds it issues. All
	// four below are registered unconditionally: the editor is built once, and a
	// conditional extension list would tear it down on every toggle.
	TextTools,
	// Inert unless the note was opened from a search result.
	SearchJumpHighlight,
	// Inert until `useSyntaxHighlight` feeds it tokens.
	SyntaxHighlight,
	// Inert until the bubble menu's sparkles popover starts a proposal.
	AskSuggestion,
	// Inert until the `/ask` slash command starts one.
	AskInlineStatus,
	// Hides markdown syntax while the caret is elsewhere; every revealable
	// construct contributes a provider here.
	SyntaxReveal.configure({
		providers: [
			createMarkerRevealProvider(BLOCK_MARKER_SPECS),
			createAdmonitionRevealProvider(),
			createDelimitedMarkRevealProvider('link', linkDelimiterSpec()),
			createDelimitedMarkRevealProvider('bold', fixedDelimiter('**')),
			createDelimitedMarkRevealProvider('strike', fixedDelimiter('~~')),
			createDelimitedMarkRevealProvider('italic', italicDelimiterSpec()),
			createDelimitedMarkRevealProvider('code', inlineCodeDelimiterSpec()),
			createImageSourceRevealProvider(),
		],
	}),
	// Unhandled, Tab moves focus rather than indenting. Declines inside a table
	// cell and on a node selection, so it never competes with those meanings.
	TabIndent,
	// Registered after every marker-bearing node extension, so its Backspace
	// handler runs before their own deletion behavior - in particular the stock
	// Blockquote's, which treats offset 0 (before the marker) as the exit point.
	MarkerBackspace,
	// The WCAG "no keyboard trap" escape hatch, outranking every Tab handler
	// registered earlier and yielding to SlashCommand's popup.
	FocusNavigation,
	// A plugin + keyboard handling only, no schema node, so it can sit anywhere.
	SlashCommand,
	// Last, so its popup claims Enter and Tab ahead of every keymap registered
	// before it.
	PathCompletion,
]

// `tiptap-markdown` ships no `Storage` module augmentation of its own, so
// `editor.storage.markdown` is otherwise typed `never`.
declare module '@tiptap/core' {
	interface Storage {
		markdown: MarkdownStorage
	}
}
