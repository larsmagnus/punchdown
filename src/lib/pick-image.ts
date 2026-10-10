import { host } from '#src/lib/webview-host'

/**
 * Opens VS Code's native file dialog and resolves once with whatever `path`
 * comes back (`null` if the dialog was cancelled).
 *
 * VS Code only - there is nowhere to pick a file from outside it (the
 * standalone build's save path is already a stub, per CLAUDE.md), so the
 * slash command's "image" action calls this only when `host.isVSCode` is
 * true. `showOpenDialog` is modal, so only one picker, and one pending
 * listener, can be open at a time.
 */
export function pickImage(): Promise<string | null> {
	return new Promise((resolve) => {
		const stopListening = host.on('imagePicked', ({ path }) => {
			stopListening()
			resolve(path)
		})
		host.send({ type: 'pickImage' })
	})
}
