import { configSchema } from '#src/lib/schemas'
import { readStoredViewOptions } from '#src/lib/view-options-storage'
import { host } from '#src/lib/webview-host'
import { DEFAULT_SETTINGS } from '#src/shared/messages'
import type { Config } from '#src/shared/messages'

/**
 * The settings the app starts with, from whichever side owns them.
 *
 * In VSCode the host injects `window.initialConfig` ahead of the bundle, so the
 * very first render already has the right theme and width; standalone, only the
 * view options persist and the rest are the manifest defaults.
 */
export function readInitialSettings(): Config {
	if (!host.isVSCode) {
		return {
			viewOptions: readStoredViewOptions(),
			settings: DEFAULT_SETTINGS,
		}
	}

	return configSchema.parse(window.initialConfig)
}
