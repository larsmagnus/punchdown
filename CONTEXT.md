# Context

**Host**: The VS Code extension host that a webview talks to. The module `host` in the webview is the only interface to it.

**Adapter**: The implementation behind `host`. VS Code talks to the extension host. Standalone runs the web build with no host.

**Intent**: A named request from the webview, such as `syncDocument`, `pickImage` or `openLink`. The adapter fulfils it. Standalone fulfils it through a local fallback.
