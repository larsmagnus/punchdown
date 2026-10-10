import type { OpenNoteIndexEntry } from '#src/components/note-index-card'
import { NoteIndexDialog } from '#src/components/note-index-dialog'
import { NoteIndexFilterPopover } from '#src/components/note-index-filter-popover'
import { useNoteIndex } from '#src/hooks/use-note-index'
import { host } from '#src/lib/webview-host'

type NoteIndexOverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	files: { value: string; content: string }[]
	fileName: string
	setFileName: (fileName: string) => void
}

/**
 * The index dialog, connected to wherever notes come from. Inside VS Code a
 * chosen note opens as an editor tab; standalone it replaces the demo note on
 * screen, the way the file selector does.
 */
export function NoteIndexOverlay({
	open,
	onOpenChange,
	files,
	fileName,
	setFileName,
}: NoteIndexOverlayProps) {
	const { index, failed, hiddenDirectories, toggleDirectoryHidden } =
		useNoteIndex({ open, files, fileName })

	const handleOpenEntry: OpenNoteIndexEntry = (entry, { beside }) => {
		onOpenChange(false)

		if (host.isVSCode) {
			host.send({
				type: 'openNoteIndexEntry',
				uri: entry.uri,
				beside,
			})
			return
		}

		setFileName(entry.uri)
	}

	return (
		<NoteIndexDialog
			open={open}
			onOpenChange={onOpenChange}
			index={index}
			failed={failed}
			onOpenEntry={handleOpenEntry}
			filterControl={
				<NoteIndexFilterPopover
					index={index}
					hiddenDirectories={hiddenDirectories}
					onToggleDirectoryHidden={toggleDirectoryHidden}
				/>
			}
		/>
	)
}
