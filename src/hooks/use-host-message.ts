import { useEffect, useEffectEvent } from 'react'

import type { InboundKind, InboundMessage } from '#src/lib/webview-host'
import { host } from '#src/lib/webview-host'

/**
 * Subscribes to one kind of message from the extension host.
 *
 * Validation lives in `host.on`, so every listener gets the same guarantee
 * against the other traffic a webview's `message` channel carries.
 */
export function useHostMessage<K extends InboundKind>(
	kind: K,
	onMessage: (message: InboundMessage<K>) => void,
	enabled: boolean
) {
	// Lets the caller pass an inline handler without re-subscribing every render.
	const handleMessage = useEffectEvent(onMessage)

	useEffect(() => {
		if (!enabled) return
		return host.on(kind, handleMessage)
	}, [kind, enabled])
}
