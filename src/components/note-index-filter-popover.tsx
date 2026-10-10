import { ListFilterIcon } from 'lucide-react'

import { NoteIndexDirectoryChecklist } from '#src/components/note-index-directory-checklist'
import { NoteIndexSwitchRow } from '#src/components/note-index-switch-row'
import { Button } from '#src/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#src/components/ui/popover'
import { useSettings } from '#src/hooks/use-settings'
import { host } from '#src/lib/webview-host'
import type { NoteIndex } from '#src/shared/messages'

type NoteIndexFilterPopoverProps = {
	/** `null` while the index is still being built. */
	index: NoteIndex | null
	hiddenDirectories: string[]
	onToggleDirectoryHidden: (directory: string) => void
}

/**
 * What the index leaves out, adjustable while it is open: whether `.gitignore`
 * applies, whether AI tools' folders are kept in view regardless, and which
 * top-level folders to hide. Only meaningful for a real workspace, so the demo
 * notes outside VS Code get no button.
 */
export function NoteIndexFilterPopover({
	index,
	hiddenDirectories,
	onToggleDirectoryHidden,
}: NoteIndexFilterPopoverProps) {
	const { viewOptions, setViewOptions } = useSettings()
	const { noteIndexRespectGitignore, noteIndexShowAiToolFolders } = viewOptions

	if (!host.isVSCode) return null

	const isFiltered =
		!noteIndexRespectGitignore ||
		!noteIndexShowAiToolFolders ||
		hiddenDirectories.length > 0

	function handleRespectGitignoreChange(checked: boolean) {
		setViewOptions({ noteIndexRespectGitignore: checked })
	}

	function handleShowAiToolFoldersChange(checked: boolean) {
		setViewOptions({ noteIndexShowAiToolFolders: checked })
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="icon"
						aria-label="Filter folders"
						data-filtered={isFiltered || undefined}
						className="data-filtered:border-primary data-filtered:text-primary"
					/>
				}
			>
				<ListFilterIcon />
			</PopoverTrigger>

			<PopoverContent align="start" className="w-80 gap-3">
				<NoteIndexSwitchRow
					label="Respect .gitignore"
					checked={noteIndexRespectGitignore}
					onCheckedChange={handleRespectGitignoreChange}
				/>
				<NoteIndexSwitchRow
					label="Show AI-tool folders"
					checked={noteIndexShowAiToolFolders}
					onCheckedChange={handleShowAiToolFoldersChange}
				/>

				{index?.gitUnavailable && noteIndexRespectGitignore && (
					<p className="text-xs text-muted-foreground">
						Git could not be read for part of this workspace, so .gitignore was
						not applied there.
					</p>
				)}

				<NoteIndexDirectoryChecklist
					directories={index?.directories ?? []}
					hiddenDirectories={hiddenDirectories}
					onToggleDirectoryHidden={onToggleDirectoryHidden}
				/>
			</PopoverContent>
		</Popover>
	)
}
