# Context

**Host**: The VS Code extension host that a webview talks to. The module `host` in the webview is the only interface to it.

**Adapter**: The implementation behind `host`. VS Code talks to the extension host. Standalone runs the web build with no host.

**Intent**: A named request from the webview, such as `syncDocument`, `pickImage` or `openLink`. The adapter fulfils it. Standalone fulfils it through a local fallback.

## Editing modes

**Mode**:
One of three ways to edit the same note, ordered by finesse from the plainest to the most rendered. Each serves a different role, and a note keeps its undo history across switches between Live and Raw.
_Avoid_: View, editor type

**Live mode**:
The rendered document, edited in place. Markdown syntax is real text that shows only under the caret.
_Avoid_: Preview, WYSIWYG, rendered view

**Raw mode**:
The note's exact file text, syntax-highlighted, edited as plain text inside punchdown.
_Avoid_: Source mode, markdown mode

**Text editor**:
VS Code's own editor for the file, outside punchdown. The farthest mode from the rendered document, and the one punchdown does not draw its toolbar or tools around.
_Avoid_: Default editor, native editor

**Reveal**:
Showing a construct's markdown syntax as text because the caret is inside that construct. Outside it, the syntax is hidden but still part of the document. Never used for scrolling to a place in a note.
_Avoid_: Expand, unhide, show source

**Jump**:
Scrolling a freshly opened note to a target and marking it: a heading named by a link's `#hash`, or a match picked from a VS Code search result. Delivered once per open.
_Avoid_: Reveal, navigate

## Persistence

**Sync**:
The webview handing its current text to the VS Code document, which makes the document dirty. It does not write to disk.
_Avoid_: Autosave, save

**Save**:
VS Code writing the document to disk. Always VS Code's decision, by whatever route: keystroke, Save All, autosave or the close prompt.
_Avoid_: Persist, flush
