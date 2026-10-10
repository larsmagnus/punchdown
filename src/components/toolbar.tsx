import { LayoutGrid } from 'lucide-react'
import type { MouseEvent } from 'react'

import { ButtonCopyPage } from '#src/components/button-copy-page'
import type { DevFileSelectorProps } from '#src/components/dev-file-selector'
import { editModeFromViewOptions } from '#src/components/edit-mode-options'
import { OptionalDevFileSelector } from '#src/components/optional-dev-file-selector'
import ThemeToggle from '#src/components/theme-toggle'
import { Button } from '#src/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '#src/components/ui/toggle-group'
import { ViewToggleIcon } from '#src/components/view-toggle-icon'
import {
	fromToggleValues,
	toToggleValues,
	VIEW_TOGGLES,
} from '#src/components/view-toggle-options'
import { useSettings } from '#src/hooks/use-settings'
import { useToolbarEditMode } from '#src/hooks/use-toolbar-edit-mode'
import { host } from '#src/lib/webview-host'

type ToolbarProps = {
	files: DevFileSelectorProps['values']
	fileName: string
	setFileName: DevFileSelectorProps['setValue']
	content: string
	onOpenIndex: () => void
}

const BRAND_ON_STATE =
	'data-[state=on]:bg-brand/10 data-[state=on]:text-brand aria-pressed:bg-brand/10 aria-pressed:text-brand'

/**
 * Leaves focus in the editor when an edit-mode toggle is clicked, so the mode
 * switched to takes over the caret. A keyboard user reaching the toggle keeps
 * focus on it, which is where they put it.
 */
function keepEditorFocus(event: MouseEvent) {
	event.preventDefault()
}

function Toolbar({
	files,
	fileName,
	setFileName,
	content,
	onOpenIndex,
}: ToolbarProps) {
	const { viewOptions, setViewOptions } = useSettings()
	const { editModeOptions, handleEditModeChange } = useToolbarEditMode()

	return (
		<div
			role="toolbar"
			className="sticky top-0 left-0 bg-background/20 backdrop-blur-md p-3 flex gap-2 items-center z-20 scroll-fade overflow-x-auto"
		>
			<Button
				variant="outline"
				size="icon"
				aria-label="Open index"
				title="Index"
				onClick={onOpenIndex}
			>
				<LayoutGrid />
			</Button>

			<OptionalDevFileSelector
				show={!host.isVSCode}
				files={files}
				fileName={fileName}
				setFileName={setFileName}
			/>

			<ToggleGroup
				value={[editModeFromViewOptions(viewOptions)]}
				onValueChange={handleEditModeChange}
			>
				{editModeOptions.map(({ value, label, icon: Icon }) => (
					<ToggleGroupItem
						key={value}
						value={value}
						aria-label={label}
						title={label}
						className={BRAND_ON_STATE}
						onMouseDown={keepEditorFocus}
					>
						<Icon />
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			<ToggleGroup
				multiple
				value={toToggleValues(viewOptions)}
				onValueChange={(values) => setViewOptions(fromToggleValues(values))}
			>
				{VIEW_TOGGLES.map(({ value, key, label, on, off }) => (
					<ToggleGroupItem
						key={value}
						value={value}
						aria-label={label}
						title={label}
						className={BRAND_ON_STATE}
					>
						<ViewToggleIcon on={viewOptions[key]} OnIcon={on} OffIcon={off} />
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			<ThemeToggle />

			<div className="ml-auto">
				<ButtonCopyPage content={content} />
			</div>
		</div>
	)
}

export default Toolbar
