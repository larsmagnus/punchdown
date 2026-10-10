import { useMemo } from 'react'

import { useHostNoteIndex } from '#src/hooks/use-host-note-index'
import { buildDemoIndex } from '#src/lib/note-index/build-demo-index'
import type { DemoFile } from '#src/lib/note-index/build-demo-index'
import { host } from '#src/lib/webview-host'
import type { NoteIndex } from '#src/shared/messages'

type UseNoteIndexOptions = {
	open: boolean
	/** The standalone app's demo notes; empty inside VS Code. */
	files: DemoFile[]
	fileName: string
}

/**
 * The notes the index lists, `null` while they are being found, and whether
 * the host failed to find them at all.
 *
 * Inside VS Code the host is asked afresh every time the index opens, so it
 * never shows a note that has since been renamed or deleted. Standalone, the
 * demo notes are all there is.
 */
export function useNoteIndex({ open, files, fileName }: UseNoteIndexOptions): {
	index: NoteIndex | null
	failed: boolean
	/** What is hidden right now, ahead of the host confirming it. */
	hiddenDirectories: string[]
	toggleDirectoryHidden: (directory: string) => void
} {
	const hostIndex = useHostNoteIndex(host.isVSCode && open)
	const demoIndex = useMemo(
		() => buildDemoIndex(files, fileName),
		[files, fileName]
	)

	return host.isVSCode
		? hostIndex
		: { ...hostIndex, index: demoIndex, failed: false, hiddenDirectories: [] }
}
