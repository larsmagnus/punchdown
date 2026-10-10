import { EDIT_MODE_OPTIONS } from '#src/components/edit-mode-options'
import { useSettings } from '#src/hooks/use-settings'
import { host } from '#src/lib/webview-host'

/** The toolbar's edit-mode toggle group: which options to show (VS Code adds
 *  the "open in text editor" option) and what a selection means. */
export function useToolbarEditMode() {
	const { setViewOptions } = useSettings()

	const editModeOptions = host.isVSCode
		? EDIT_MODE_OPTIONS
		: EDIT_MODE_OPTIONS.filter((option) => option.value !== 'text')

	// Re-clicking the active item empties the array; ignore that so the group
	// always shows raw or live as selected. 'text' never becomes the persisted
	// mode - the webview may be gone by the time the host has acted on it.
	function handleEditModeChange(values: string[]) {
		const [value] = values
		if (!value) return
		if (value === 'text') {
			host.send({ type: 'openInTextEditor' })
			return
		}
		setViewOptions({ raw: value === 'raw' })
	}

	return { editModeOptions, handleEditModeChange }
}
