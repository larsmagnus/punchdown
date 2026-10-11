# 0002. Leave persistence to VS Code

Status: Accepted.

## Context

The webview holds the only copy of the note being edited, so it must hand its text to the `TextDocument`. For a while the extension also decided when that text reached disk: a hybrid that forced a save after each sync and handled autosave itself. It was error prone. The document was never dirty, so the dirty marker, `files.autoSave`, hot exit and the close prompt were all inert, and each had to be reimplemented or worked around.

## Decision

The webview only syncs. A sync dirties the `TextDocument` and nothing more; VS Code decides when that reaches disk.

The aim is an experience as native and familiar as possible, with as little extension code as possible, and the user in control of when their file is written.

Two things are forced by being a webview rather than a genuine editor, and nothing else should be:

- The sync itself, since the webview is the only holder of the edited text.
- `retainContextWhenHidden`, since VS Code would otherwise tear down a backgrounded tab's webview and take the undo history with it.

Two consequences keep VS Code's own save exact without the extension choosing when to write:

- The first edit since a clean state syncs immediately, because VS Code does not save a clean document.
- A will-save participant asks the active view for its current text before any save proceeds, so a save is never up to one debounce stale.

## Consequences

- Anything that reads the file from disk, such as pointing Claude at a note, must save the document first.
- `retainContextWhenHidden` keeps every open note's editor, highlighter and writing-check worker resident for the life of the window.
- The webview must never intercept the save keystroke or save on its own.

## Rejected

- Owning the document model with a custom editor provider and our own save and backup: the hybrid that approximated it was error prone, and it would reimplement what `TextDocument` already gives for free.
- Forcing a save after every sync: kept the document clean, which silently disabled VS Code's dirty tracking, autosave, hot exit and close prompt.
