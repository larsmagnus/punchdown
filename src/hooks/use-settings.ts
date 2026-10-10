import { createContext, useContext } from 'react'

import { DEFAULT_SETTINGS, DEFAULT_VIEW_OPTIONS } from '#src/shared/messages'
import type { ExtensionSettings, ViewOptions } from '#src/shared/messages'

export type SettingsState = {
	/** User-toggleable view state, persisted and shared across editor tabs. */
	viewOptions: ViewOptions
	setViewOptions: (patch: Partial<ViewOptions>) => void
	/** Read-only in the webview — configured through VS Code Settings. */
	settings: ExtensionSettings
}

export const SettingsContext = createContext<SettingsState>({
	viewOptions: DEFAULT_VIEW_OPTIONS,
	setViewOptions: () => {},
	settings: DEFAULT_SETTINGS,
})

export const useSettings = () => useContext(SettingsContext)
