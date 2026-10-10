import useContent from '#src/hooks/use-content'
import { useHostDocument } from '#src/hooks/use-host-document'
import { host } from '#src/lib/webview-host'

/**
 * The note on screen, from whichever side owns it.
 *
 * In VSCode that is the extension host; standalone it is one of the demo notes
 * in `public/`, which the file selector switches between. Both hooks run either
 * way — hooks cannot be called conditionally — but the demo fetches are skipped
 * inside VSCode.
 *
 * The save keystroke is not handled in the webview. `workbench.action.files.save`
 * reaches the document directly, and `onWillSaveTextDocument`
 * (`save-participant.ts`) makes that save exact rather than up to a debounce stale.
 */
export function useNoteSource(defaultFileName: string) {
	const hostDocument = useHostDocument()
	const demo = useContent({ defaultFileName, enabled: !host.isVSCode })

	if (host.isVSCode) {
		return {
			content: hostDocument.content,
			fileName: hostDocument.fileName,
			// VSCode switches files by opening another editor, not through the app.
			setFileName: () => {},
			files: [],
			syncContent: hostDocument.syncContent,
		}
	}

	return {
		content: demo.content,
		fileName: demo.fileName,
		setFileName: demo.setFileName,
		files: demo.files,
		syncContent: hostDocument.syncContent,
	}
}
