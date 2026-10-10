# 0001. Webview host module

Status: Accepted, in progress. The sync path and every webview sender go through `host`; see the scroll position exception below.

## Context

The webview reached its host through `getVSCodeApi()?.postMessage` at each call site. About twenty files branched on `isVSCodeContext` for behaviour: note sync, note source, scroll and panel state. Standalone (the web build) is the second adapter. A wrapper that only sends and receives would move the `postMessage` calls without removing the branching, so it would not earn its place. The branching is the real coupling and must sit behind one seam.

## Decision

- One `host` module is the only interface to the host. It owns intents and their standalone fallbacks, not just send and receive.
- `host.isVSCode` is the one synchronous boolean. It answers "is this VS Code" for UI gating only. No named capabilities: no adapter varies per capability, so a capability list is a second place to keep in sync for no behaviour.
- The adapter is chosen on every call from `window.vscode`, never captured at import. Many callers are not React (scroll position, panel state, the slash-command extension, the ask client), and tests install a fake host after import.
- `host.send(message)` is the one write path. Standalone, `syncDocument` goes to the notes stub and `setViewOptions` to local storage. Every other message is dropped, since it is a request for something only the host owns.
- `host.getState()` and `host.setState()` wrap the panel's own state.
- `host.on(kind, listener)` is the typed inbound channel. `useHostMessage(kind, handler, enabled)` is a thin React hook over it that keeps the stable inline-handler behaviour.
- Inbound zod schemas live in `src/lib/webview-host.ts` as a record keyed by message kind. A missing kind fails to compile. They do not go in `src/shared/messages.ts`, because that file is bundled into the CommonJS extension host, where zod is forbidden (the `.vsix` ships with `--no-dependencies`).
- `getVSCodeApi` and `isVSCodeWebview` are deleted. The `Window` globals live in `src/window-globals.d.ts`.
- One test file, `webview-host.test.ts`, covers both adapters.

## Consequences

- Behaviour forks move behind `host`. `isVSCodeContext` stays only for UI gating: the ask popover, the filter popover, and VS Code-only slash items.
- Scroll position keeps its own standalone branch. `setScrollTop` carries no file name, so the standalone path must key `sessionStorage` itself, and the panel's state and the host's copy both need writing in VS Code.
- A new intent must be answered by both adapters. The tests fail until both do.

## Rejected

- Send/receive-only wrapper: fails the deletion test, since it only moves `postMessage` call sites.
- Named capabilities: no adapter varies per capability, so the list adds maintenance and no behaviour.
- React context: excludes non-React callers and forces a provider into tests that already inject `window.vscode`.
- Schemas in `src/shared/messages.ts`: that module is bundled into the zod-free CommonJS host.
