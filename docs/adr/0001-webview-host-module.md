# 0001. Webview host module

Status: Accepted, not yet implemented.

## Context

The webview reaches its host through `getVSCodeApi()?.postMessage` at each call site. About twenty files branch on `isVSCodeContext` for behaviour: note sync, note source, scroll and panel state. Standalone (the web build) is the second adapter. A wrapper that only sends and receives would move the `postMessage` calls without removing the branching, so it would not earn its place. The branching is the real coupling and must sit behind one seam.

## Decision

- One `host` module is the only interface to the host. It owns intents and their standalone fallbacks, not just send and receive.
- One synchronous boolean answers "is this VS Code" for UI gating. No named capabilities: no adapter varies per capability, so a capability list is a second place to keep in sync for no behaviour. The boolean keeps the rule that it derives synchronously from `window.vscode`.
- A module-level singleton that reads `window.vscode` synchronously on every call, never capturing it at import. Many callers are not React (scroll position, panel state, the slash-command extension, the ask client), and tests install a fake host after import.
- Inbound messages become a typed `host.on(kind, callback)`. One thin React hook wraps it and keeps the stable inline-handler behaviour of today's `useHostMessage`.
- Inbound zod schemas live in a webview-side file, as a record keyed by message kind. A missing kind fails to compile. They do not go in `src/shared/messages.ts`, because that file is bundled into the CommonJS extension host, where zod is forbidden (the `.vsix` ships with `--no-dependencies`).
- One contract suite runs against both adapters. Existing `getVSCodeApi` stubs are replaced, not layered under the new module.
- Migration goes cluster by cluster. The sync path goes first (`use-note-sync`, `use-host-document`, `use-adopt-incoming-content`, `use-note-source`, `update-notes`), because standalone behaviour diverges there and a bug costs data. One-shot senders follow.

## Consequences

- Call sites that branch on `isVSCodeContext` for behaviour move behind an intent. The boolean stays only for UI gating.
- A new intent must be answered by both adapters. The contract suite fails until both do.
- Old call sites and the module coexist until the migration finishes.

## Rejected

- Send/receive-only wrapper: fails the deletion test, since it only moves `postMessage` call sites.
- Named capabilities: no adapter varies per capability, so the list adds maintenance and no behaviour.
- React context: excludes non-React callers and forces a provider into tests that already inject `window.vscode`.
- Schemas in `src/shared/messages.ts`: that module is bundled into the zod-free CommonJS host.
