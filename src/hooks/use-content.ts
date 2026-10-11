import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { DEMO_NOTE_FILE_NAMES } from '#src/lib/demo-files'

async function fetchNote(fileName: string) {
	const response = await fetch(`/${fileName}`)

	// The dev server answers unknown paths with the SPA shell, so a 200 alone
	// does not mean the note exists.
	if (!response.ok) return `File "${fileName}" not found`

	return response.text()
}

function useContent({
	defaultFileName = DEMO_NOTE_FILE_NAMES[0],
	enabled = true,
}: PropsWithChildren<{ defaultFileName?: string; enabled?: boolean }>) {
	const [files, setFiles] = useState<
		{ value: string; label: string; content: string }[]
	>([])
	const [fileName, setFileName] = useState(defaultFileName)
	const [content, setContent] = useState('')

	useEffect(() => {
		if (!enabled) return

		async function getAllFiles() {
			const rawFiles = await Promise.all(
				DEMO_NOTE_FILE_NAMES.map(async (name) => ({
					value: name,
					label: name,
					content: await fetchNote(name),
				}))
			)

			setFiles(rawFiles)
		}

		getAllFiles()
	}, [enabled])

	useEffect(() => {
		if (!enabled) return

		// Switching files leaves the previous fetch in flight. Without this guard a
		// slow, now-stale response overwrites the note the selector actually shows.
		let current = true

		async function getContent() {
			const next = await fetchNote(fileName)
			if (current) setContent(next)
		}

		getContent()

		return () => {
			current = false
		}
	}, [fileName, enabled])

	return { fileName, setFileName, content, files }
}

export default useContent
