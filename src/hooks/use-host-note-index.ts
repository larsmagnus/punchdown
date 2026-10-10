import { useEffect, useRef, useState } from 'react'

import { useHiddenNoteDirectories } from '#src/hooks/use-hidden-note-directories'
import { useHostMessage } from '#src/hooks/use-host-message'
import { useSettings } from '#src/hooks/use-settings'
import { host } from '#src/lib/webview-host'
import type { NoteIndex } from '#src/shared/messages'

/**
 * The index as the host answers it, asked afresh each time `isAsking` turns on
 * and again whenever what the author wants left out changes.
 *
 * Replies come back in whatever order the scans finish, so only the answer to
 * the latest ask may land.
 */
export function useHostNoteIndex(isAsking: boolean) {
	const { viewOptions } = useSettings()
	const {
		noteIndexRespectGitignore: respectGitignore,
		noteIndexShowAiToolFolders: showAiToolFolders,
	} = viewOptions
	const [index, setIndex] = useState<NoteIndex | null>(null)
	const [failed, setFailed] = useState(false)
	const {
		hiddenDirectories,
		hiddenOverride,
		toggleDirectoryHidden,
		resetHiddenOverride,
	} = useHiddenNoteDirectories(index?.hiddenDirectories)
	const latestRequestId = useRef(0)

	useHostMessage(
		'noteIndex',
		({
			requestId,
			entries,
			total,
			directories,
			hiddenDirectories,
			gitUnavailable,
		}) => {
			if (requestId !== latestRequestId.current) return

			setIndex({
				entries,
				total,
				directories,
				hiddenDirectories,
				gitUnavailable,
			})
		},
		isAsking
	)
	useHostMessage(
		'noteIndexFailed',
		({ requestId }) => {
			if (requestId === latestRequestId.current) setFailed(true)
		},
		isAsking
	)

	// Every open starts from nothing, so the previous answer is forgotten during
	// render rather than shown for a frame while the new one is on its way.
	const [wasAsking, setWasAsking] = useState(isAsking)
	if (wasAsking !== isAsking) {
		setWasAsking(isAsking)
		if (isAsking) {
			setIndex(null)
			setFailed(false)
			resetHiddenOverride()
		}
	}

	useEffect(() => {
		if (!isAsking) return

		latestRequestId.current += 1
		host.send({
			type: 'getNoteIndex',
			requestId: latestRequestId.current,
			respectGitignore,
			showAiToolFolders,
			hiddenDirectories: hiddenOverride,
		})
	}, [isAsking, respectGitignore, showAiToolFolders, hiddenOverride])

	return { index, failed, hiddenDirectories, toggleDirectoryHidden }
}
