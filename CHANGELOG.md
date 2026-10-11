# Change Log

All notable changes to the "punchdown" extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Added file path suggestions in both editors while typing a link or image target, relative to the note or, after a leading `/`, the workspace folder
- Added file path suggestions while typing a path in inline code
- Added Ctrl+Space to open file path suggestions where the caret is
- Changed Tab to accept the highlighted item in the live editor's `/` menu, as it already did in the raw editor
- Changed the raw editor's `/` menu to open only while typing, no longer when the caret is clicked or moved onto an existing `/command`
- Fixed the note jumping down as the toolbar appears, which could send an early click or drag to the wrong place
- Fixed short notes scrolling by the toolbar's height
- Fixed undo in the raw editor removing one character at a time instead of the whole run typed
- Fixed undo in the raw editor undoing the live editor's typing instead, leaving the two editors showing different text
- Fixed an undo in the raw editor sometimes not reaching the live editor
- Fixed code blocks in the raw editor often showing without syntax highlighting
- Fixed Mermaid diagrams never being syntax highlighted in the raw editor

## [1.2.0] - 2026-10-09

- Added drawing HTML blocks as HTML in the live editor, showing their source once clicked
- Changed opening a note to leave the file untouched, saving unedited blocks exactly as written
- Changed an edit to change only the block it was made in
- Changed markdown the live editor cannot represent faithfully to show as plain text, exactly as written
- Changed changes made to the file outside the editor to be taken in block by block, keeping the caret in place and unsaved edits intact
- Changed lists to keep the bullet or number style they were written with, such as `*`, `+` or `1)`
- Changed typed text to save without backslash escapes unless they are needed
- Fixed edits being reverted, and blank lines disappearing, a moment after typing
- Fixed undo also undoing the file in VS Code
- Fixed notes with Windows (CRLF) line endings losing typing and being rewritten on every save
- Fixed hard-wrapped paragraphs being joined into one line when edited
- Fixed HTML, uneven table rows, long code fences and some escaped brackets being lost from the file on the first edit
- Fixed list items that could not be deleted
- Fixed deleting into a list item leaving its marker behind as text such as `\- item`
- Fixed the raw editor selecting and deleting different text than shown below a long unbroken line such as a URL
- Fixed blank lines typed inside a blockquote or list item not being saved
- Fixed typing in the raw editor slowing down in long notes

## [1.1.0] - 2026-10-06

- Added GitHub-style admonitions: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and `[!CAUTION]` render as colored callouts with an icon, and the tag reveals as text when the caret reaches it
- Added the five admonitions to the `/` menu
- Added the `/` menu to the raw editor, opening on a `/` at the start of a line and offering the same commands as the live editor, except Image and Ask Claude
- Added bullet and numbered lists to the `/` menu in both editors
- Added line numbers to the raw editor, switched off with the `punchdown.lineNumbers` setting or the "Toggle line numbers" command
- Changed selection, focus and active states to use the theme accent color
- Changed switching between the live and raw editors to carry the caret and selection over, keeping the same text at the same place on screen
- Changed the `/` menu to keep the highlighted item in view while arrowing, with the list capped in height
- Fixed the live editor's `/` menu appearing over the raw editor while typing a `/` there
- Fixed raw editor keystrokes being lost when the file changed outside the editor just after clicking away from it

## [1.0.1] - 2026-10-05

- Changed the extension icon to the new punchdown logo
- Changed the extension package to leave out development-only files, making the install smaller

## [1.0.0] - 2026-10-05

- Changed the extension's name to punchdown, which installs as a new extension rather than updating the old one. Uninstall `editor-markdown-notes`, and point any `*.md` editor association at `punchdown.markdownEditor`
- Changed every setting and command prefix to `punchdown.`. Re-apply customized settings, since they and the remembered toggles do not carry over
- Changed the colour of revealed markdown syntax and link addresses to the pink accent
- Changed the document text to one consistent size, no longer shrinking on wide windows
- Changed table headers to semibold and table cells to slightly different padding
- Fixed the gap cursor being invisible in dark mode

## [0.29.0] - 2026-10-05

- Added visual diagram editing, from the diagram toolbar: retype labels, add nodes, connect them by dragging, and grow a node into a new connected one with the `+` beside it
- Changed the index to leave out files the workspace's `.gitignore` ignores, keeping AI-tool folders such as `.claude` and `.cursor` listed
- Changed the index to skip tool output folders such as `test-results` and `playwright-report`
- Added a filter button to the index for turning `.gitignore` and AI-tool folders on or off
- Added hiding individual top-level folders from the index, remembered per workspace
- Changed index cards to a consistent height, with the file name set apart from its folder
- Added the full folder path on hover over a card's folder
- Changed index cards to show a note's first paragraph when it has no frontmatter description
- Fixed the caret appearing inside the first character of a list item when its bullet or number is revealed, and the arrow key that crossed the marker doing nothing visible
- Added more technical terms to the spell checker, such as `frontmatter`, `MCP`, and `SVG`

## [0.28.0] - 2026-10-04

- Added copying a draw.io diagram (`.drawio.svg` image) as a mermaid flowchart from its image toolbar
- Added copying a mermaid diagram as draw.io from the diagram actions menu, pasting flowcharts as editable shapes and other diagram types as an image

## [0.27.0] - 2026-09-30

- Added an index of every note in the workspace, opened from the toolbar or the `Open index` command, showing each note's title, file, folder, last edit, word and character counts, and frontmatter tags
- Added filtering the index by title, file, folder or tag, and sorting it by last edit, title or path
- Added the `editorMarkdownNotes.index.exclude` setting to leave folders or files out of the index

## [0.26.0] - 2026-09-17

- Added wrapping selected text in backticks, asterisks, underscores, tildes or quotes when you type them
- Added pasting an http(s) URL over selected text creates a markdown link with the selected text as link text
- Changed mermaid diagrams to scale up to the width available to them instead of staying at a fixed size
- Fixed formatting shortcuts not working correctly on Windows
- Fixed pasting a bare domain or filename turning it into a link
- Fixed deleting a list item leaving two lists apart instead of joined
- Fixed pressing Enter inside a list marker duplicating the marker

## [0.25.0] - 2026-09-13

- Added support for opening `.markdown`, `.mdown`, `.mkd`,`.txt`, `.mdx` and `.pdf` files
- Added basic `.mdx` syntax handling, showing JSX, import/export and expression blocks as plain text
- Added the `Open PDF as markdown` command to extract a PDF's text into a markdown file and open it

## [0.24.0] - 2026-09-12

- Added writing tools highlights to the raw markdown view, matching the live editor
- Added a text tools check that flags the same word typed twice in a row
- Added a text tools check that flags emotionally charged words and shows the document's overall sentiment
- Added a text tools check that flags sentences and runs of sentences overusing em/en dashes, and shows the document's overall dash rate
- Added an overall readability score to the writing tools panel, showing whether the whole document reads as good, ok or poor against the target reading age
- Added common software and web terms to the spelling dictionary, so they are no longer flagged as misspellings
- Added support for opening relative links to other files in the workspace, from both the live and raw markdown views
- Added support for clicking a link to a heading, scrolling to it in the same or another note
- Added syntax highlighting to the raw markdown view
- Added sticky table headers, staying visible while a tall table scrolls
- Added a faint stripe to alternating table rows
- Changed the extension package to be about 16% smaller
- Changed Mermaid diagrams to no longer cap their height
- Changed Mermaid diagrams to zoom out further, for an overview of a large one
- Fixed consecutive blank lines being collapsed to one when the live editor saved
- Fixed typing right after a horizontal rule merging the new text into it instead of starting a new line
- Fixed Cmd/Ctrl+B and +I sometimes triggering a VS Code shortcut instead of formatting the selected text
- Fixed tables sitting flush against the content that follows them
- Fixed URLs being flagged by spelling and other text-tools checks
- Fixed an image's hover border looking different from a Mermaid diagram's

## [0.23.1] - 2026-09-07

- Fixed pressing Enter on an empty bullet, numbered or task list item adding another empty item instead of ending the list
- Fixed Shift+Tab on a list item with no outer list to move into writing its own bullet into the text as `\- item`, rather than leaving the list

## [0.23.0] - 2026-09-06

- Added real, editable markdown syntax to bold, italic, strikethrough, inline code, headings, links, lists, images, code blocks, Mermaid diagrams, frontmatter, horizontal rules and blockquotes in the live editor, shown only while the cursor is on it
- Clearing an image's source now deletes the image, and images also get an Edit source button
- Changed document stats to show word, character, sentence and paragraph counts with thousand separators
- Changed the writing tools' rule explanations to mark the suggested fix and the example to avoid more clearly
- Fixed the toolbar cutting off its buttons instead of scrolling when the panel is narrow
- Fixed the editor column narrowing further than is readable when the writing tools panel is open
- Added a way to move keyboard focus out of the document text with Escape then Tab, previously trapped indenting once the cursor reached a line with nothing after it
- Added "Skip to editor" and "Skip to text tools" links, reachable with the first Tab press, plus a link back to the editor from inside the writing tools panel
- Changed task list checkboxes in the live editor to match the app's other checkboxes
- Changed saving to VS Code's own mechanism, so Save All, autosave and the close prompt all work, and the file is only ever written by VS Code itself
- Fixed typing `- [ ] `not converting into a task item, leaving the brackets as literal text
- Fixed Tab at the start of a list item indenting its text instead of nesting the item
- Fixed Tab from the toolbar landing partway through the document instead of the frontmatter block or the very start
- Fixed undo history being lost when switching to the raw markdown view or backgrounding a note's tab
- Fixed a save made right after an outside edit (another program, git) overwriting that edit with the editor's own reformatting of it
- Fixed images being unclickable, unable to be selected, dragged or moved with Tab

## [0.22.0] - 2026-08-21

- Added a document stats section to the writing tools panel, showing word, character, sentence and paragraph counts alongside estimated reading time
- Fixed the raw markdown view showing only the first line or two of a note until scrolled

## [0.21.0] - 2026-08-20

- Added scrolling to the matched text when a note is opened from a search result, with every occurrence of that text highlighted
- Added an info button to each writing tools check, explaining what it looks for and showing an example of the fix marked the way the editor marks it
- Added a spelling check to the writing tools, underlining unrecognised words in red and listing them with suggested corrections. Switch it on in the panel; it is off by default
- Added a choice of American, British or Australian English for the spelling check, beside the check itself or from the "Select spelling language" command
- Changed the writing tools to skip inline code spans and the keys in YAML frontmatter, which were never prose worth checking
- Added a zero-config MCP server, so AI agents in the editor can run the same writing checks as the text tools against your target reading age, language and custom words list.
- Added an "Add words to dictionary" command for teaching the spelling check project vocabulary it should stop flagging
- Fixed a note reverting to older content after its tab had been in the background, while the file on disk kept the newer text
- Fixed an open note overwriting its own file after another tab, git or a formatter changed it. The note saved a reformatted copy over the change, which could break footnotes and merged table cells

## [0.20.0] - 2026-08-17

- Added remembering where each note is scrolled to, restoring it when the note is reopened in the same VS Code session
- Fixed a note opening scrolled into the middle of itself instead of at the top
- Changed a note to open with no cursor placed in it, so click into the note before typing
- Added an "Ask Claude" slash command: type `/ask` followed by a prompt to have Claude rewrite that part of the note in place, with a spinner while it works and an error card with retry and dismiss if it fails
- Added a sparkles button to the bubble menu that asks Claude to simplify, shorten, improve, or otherwise rewrite the selected text, showing the proposed rewrite alongside the original as editable text with accept, decline, retry, and an option to keep both
- Changed the "Ask Claude" slash command and bubble menu button to hide in the standalone web app, where there is no extension host to ask
- Added a slash command menu: type `/` on an empty line to insert a mermaid diagram, code block, task list, table, or image
- Added `editorMarkdownNotes.imageCopyDirectory` for where the slash command's image action copies a file picked from outside the workspace
- Added a copy button to the toolbar for copying the note as markdown or plain text, and for opening it in Claude
- Added `editorMarkdownNotes.claudePromptTemplate` to customize the prompt sent when opening a note in Claude
- Added zoom and pan controls to mermaid diagrams in the live editor: Ctrl/Cmd+scroll or the toolbar to zoom, drag to pan
- Added a diagram toolbar for copying a diagram's source or its rendered SVG, opening it in Claude, and editing its source
- Added `editorMarkdownNotes.claudeInlinePromptTemplate` for the prompt sent when opening a single diagram in Claude
- Changed the Claude prompt templates to take `%@` for the note as an at-reference, alongside the existing `%s`
- Fixed the toolbar's copy actions handing back the note as it was when the tab was opened, rather than as edited
- Fixed "Open in Claude" replacing the clipboard without saying so, outside VS Code

## [0.19.0] - 2026-08-12

- Added editing images in the live editor: drag to move, edit the source and alt text, add or remove a link, delete, and navigate them by keyboard
- Added a copy button, a delete button, and syntax highlighting to the frontmatter block in the live editor
- Added a button to add a frontmatter block to a note that doesn't already have one
- Added writing a frontmatter block by hand: type `---`, your content, then `---` at the top of a note
- Changed undo/redo for the frontmatter block to share the same history as the rest of the note
- Fixed Tab moving focus out of the editor instead of indenting
- Fixed Ctrl/Cmd+Z sometimes clearing a freshly opened note that has frontmatter

## [0.18.1] - 2026-08-11

- Changed the extension package to install around 60% smaller

## [0.18.0] - 2026-08-11

- Added syntax highlighting to code blocks in the live editor, matching your active VS Code color theme
- Added a copy button to code blocks in the live editor
- Added a Text Editor button that reopens the file in VSCode's built-in text editor
- Added row and column handles to tables in the live editor, with a menu for adding, deleting, moving and aligning
- Added dragging a table handle to reorder its row or column
- Added column alignment to tables, which now survives a save instead of being dropped when the note loads
- Added copying table cells as a markdown table
- Added pasting a table from another editor or a spreadsheet
- Added arrow key movement between table cells and out of the table
- Added Shift+arrow keys to select whole table cells
- Changed Backspace over selected table cells to empty them, or remove the row or column when all of one is selected
- Changed the raw markdown toggle into three buttons: Text Editor, Raw Editor, Live Editor
- Fixed a `|` typed into a table cell splitting it into two cells on save
- Fixed a table cell holding only an image being emptied on save

## [0.17.0] - 2026-08-09

- Added editing to the raw markdown view, which autosaves and saves on Cmd/Ctrl+S like the rich editor
- Changed a failure in the toolbar, the document, the writing tools or a diagram to show an error with a Try again button instead of blanking the panel
- Fixed the editor going blank when switching to a note with fewer diagrams
- Fixed an emptied note never being saved
- Fixed switching demo notes quickly leaving the previous note on screen
- Fixed the heading buttons not announcing their level to screen readers

## [0.16.2] - 2026-08-08

- Added VS Code's native find widget (Cmd/Ctrl+F) inside the editor panel

## [0.16.1] - 2026-08-08

- Fixed unnecessary backslashes appearing before headings, brackets, tildes, asterisks and backticks on save
- Fixed a `[label]: url`-shaped line disappearing on reload
- Changed italics to keep the marker (`_` or `*`) a file was already using instead of always rewriting it to `*` on save
- Added an `editorMarkdownNotes.italicMarker` setting for which marker new italics use

## [0.16.0] - 2026-08-08

- Added an `editor-markdown-notes.toggleHideToolbar` command
- Changed the `editorMarkdownNotes.hideNav` setting to `editorMarkdownNotes.hideToolbar`. Update this setting's name if you've customized it

## [0.15.0] - 2026-08-07

- Changed the frontmatter panel to a multi-line text area so multi-line values are usable

## [0.14.0] - 2026-08-07

- Added a writing tools sidebar that flags passive voice, weak words, words that could be simpler, and hard-to-read sentences against a configurable target reading age

## [0.13.1] - 2026-08-07

- Fixed bubble menu colors

## [0.13.0] - 2026-08-07

- Added a frontmatter panel for editing YAML frontmatter as raw text, fixing a leading `---` block being parsed and mangled as an `<hr>` on save

## [0.12.0] - 2026-08-07

- Added rendering for Mermaid diagrams in fenced ` ```mermaid ` code blocks

## [0.11.1] - 2026-08-07

- Fixed the nav bar rendering underneath the editor content

## [0.11.0] - 2026-08-07

- Added an Editor Markdown Notes: Show logs output channel that reports webview failures instead of only showing a blank panel

## [0.10.5] - 2026-08-07

- Fixed the panel loading blank in some cases
- Fixed a spurious CSP violation logged on every load

## [0.10.4] - 2026-08-07

- Fixed spacing on task list items

## [0.10.3] - 2026-08-07

- Changed the webview bundle to load faster with code-split, cacheable chunks

## [0.10.2] - 2026-08-07

- Added support for images referenced from markdown, resolving relative and root-absolute paths the same way VS Code's own markdown preview does

## [0.10.1] - 2026-08-07

- Fixed table cell content wrapping in an unwanted paragraph

## [0.10.0] - 2026-08-06

- Added support for markdown tables, task lists and images, previously rendered as plain text or silently dropped on the next auto-save

## [0.9.0] - 2026-08-06

- Added syncing of view options and VS Code settings across open editor tabs

## [0.8.0] - 2026-08-06

- Fixed malformed stored or received view options blanking the editor

## [0.7.1] - 2026-08-06

- Fixed a markdown file containing `</script>` loading blank

## [0.7.0] - 2026-08-06

- Added persisting the raw, full-width and theme toggles across editor tabs and sessions
- Added the `editorMarkdownNotes.centerContent` and `editorMarkdownNotes.hideNav` settings

## [0.6.0] - 2026-08-06

- Added messaging between the extension and the webview

## [0.5.0] - 2025-08-04

- Added support for installing the extension locally from a `.vsix` package

## [0.4.0] - 2025-08-04

- Added the first working custom editor, replacing the extension scaffold

## [0.3.0] - 2025-08-04

- Fixed the editor not matching VS Code's color theme

## [0.2.0] - 2025-08-04

- Fixed the bubble menu being sized wrong for its content

## [0.1.0] - 2025-08-04

- Added the initial project scaffold
