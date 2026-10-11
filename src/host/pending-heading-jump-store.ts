import type * as vscode from 'vscode'

import type { HeadingJump } from '#src/shared/messages'

/**
 * A link's `#hash`, queued for whichever not-yet-open document it targets -
 * for the life of this extension host, mirroring `ScrollPositionStore`.
 *
 * In memory rather than in `globalState` for the same reason a scroll offset
 * is: nothing here needs to survive a window reload, and a stale hash left
 * over from a closed session would be pure risk with no upside.
 */
export class PendingHeadingJumpStore {
	private readonly pending = new Map<string, string>()

	/** Records a heading hash to deliver once `uri`'s panel is (re)built. */
	public set(uri: vscode.Uri, hash: string): void {
		this.pending.set(uri.toString(), hash)
	}

	/**
	 * The hash owed to `uri`'s panel, once and once only -
	 * `resolveCustomTextEditor` reads this exactly the way it reads
	 * `readSearchJump`, so a link followed twice into the same not-yet-open
	 * note does not replay the first click's hash into the second's freshly
	 * built panel.
	 */
	public take(uri: vscode.Uri): HeadingJump | undefined {
		const key = uri.toString()
		const hash = this.pending.get(key)
		this.pending.delete(key)
		return hash === undefined ? undefined : { hash }
	}
}
