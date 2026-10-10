import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { useHostMessage } from '#src/hooks/use-host-message'
import { SettingsContext } from '#src/hooks/use-settings'
import { readInitialSettings } from '#src/lib/initial-settings'
import { host } from '#src/lib/webview-host'
import type { ExtensionSettings, ViewOptions } from '#src/shared/messages'

type SettingsProviderProps = PropsWithChildren<{
	initialViewOptions?: Partial<ViewOptions>
	initialSettings?: Partial<ExtensionSettings>
}>

export function SettingsProvider({
	children,
	initialViewOptions,
	initialSettings,
}: SettingsProviderProps) {
	// The host injects `window.vscode` before the bundle runs, so this is known
	// on the very first render - which is why it is the app's single source for
	// the answer.
	const isVSCodeContext = host.isVSCode
	const [state, setState] = useState(() => {
		const initial = readInitialSettings()
		return {
			viewOptions: { ...initial.viewOptions, ...initialViewOptions },
			settings: { ...initial.settings, ...initialSettings },
		}
	})

	// Lets `setViewOptions` read the current options without depending on them,
	// so the callback stays stable and the writes stay outside the reducer.
	const viewOptionsRef = useRef(state.viewOptions)
	useLayoutEffect(() => {
		viewOptionsRef.current = state.viewOptions
	}, [state.viewOptions])

	// The host broadcasts to every open panel, which is what keeps tabs in sync.
	useHostMessage(
		'config',
		(message) =>
			setState({
				viewOptions: message.viewOptions,
				settings: message.settings,
			}),
		isVSCodeContext
	)

	const setViewOptions = useCallback((patch: Partial<ViewOptions>) => {
		const viewOptions = { ...viewOptionsRef.current, ...patch }

		// Persist outside the updater — StrictMode double-invokes updaters, and
		// React requires them to be pure.
		host.send({ type: 'setViewOptions', viewOptions })

		setState((current) => ({ ...current, viewOptions }))
	}, [])

	const value = useMemo(
		() => ({ ...state, setViewOptions, isVSCodeContext }),
		[state, setViewOptions, isVSCodeContext]
	)

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	)
}
