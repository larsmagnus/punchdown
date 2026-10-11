import { cn } from 'cn'
import { lazy, Suspense, useState } from 'react'

import { AppErrorBoundary } from '#src/components/app-error-boundary'
import { NoteIndexOverlay } from '#src/components/note-index-overlay'
import { SkipLinks } from '#src/components/skip-links'
import { EditorBody } from '#src/editor/editor-body'
import { useHostMessage } from '#src/hooks/use-host-message'
import { useNoteSource } from '#src/hooks/use-note-source'
import { useScrollPosition } from '#src/hooks/use-scroll-position'
import { useSettings } from '#src/hooks/use-settings'
import { contentWidthClassName } from '#src/lib/content-width-class'
import { getFileKind } from '#src/lib/file-kind'
import { toolbarHeightStyle } from '#src/lib/toolbar-height-style'
import { host } from '#src/lib/webview-host'

const Toolbar = lazy(() => import('#src/components/toolbar'))

type LayoutProps = {
	defaultFileName: string
}

function Layout({ defaultFileName }: LayoutProps) {
	const { viewOptions, settings } = useSettings()
	const { content, fileName, setFileName, files, syncContent } =
		useNoteSource(defaultFileName)
	const [indexOpen, setIndexOpen] = useState(false)

	function openIndex() {
		setIndexOpen(true)
	}

	useHostMessage('showNoteIndex', openIndex, host.isVSCode)

	// The one scrolling element on the page, so one offset covers the rich
	// editor and the raw markdown view alike.
	const scrollRef = useScrollPosition(fileName, viewOptions.raw)

	const widthClassName = cn(
		'h-full',
		contentWidthClassName({
			fullWidth: viewOptions.fullWidth,
			centerContent: settings.centerContent,
		})
	)

	return (
		<div
			ref={scrollRef}
			className="h-screen overflow-auto"
			style={toolbarHeightStyle(settings.hideToolbar)}
		>
			<SkipLinks raw={viewOptions.raw} textToolsOpen={viewOptions.textTools} />

			{!settings.hideToolbar && (
				<AppErrorBoundary title="The toolbar stopped working">
					{/* Reserves the toolbar's height while its chunk loads, so a late
					    arrival can't shift the note under a pointer. */}
					<Suspense fallback={<div className="h-(--toolbar-height)" />}>
						<Toolbar
							files={files}
							fileName={fileName}
							setFileName={setFileName}
							content={content}
							onOpenIndex={openIndex}
						/>
					</Suspense>
				</AppErrorBoundary>
			)}

			<AppErrorBoundary title="The index stopped working">
				<NoteIndexOverlay
					open={indexOpen}
					onOpenChange={setIndexOpen}
					files={files}
					fileName={fileName}
					setFileName={setFileName}
				/>
			</AppErrorBoundary>

			<main className="flex flex-col p-3 min-h-[calc(100vh-var(--toolbar-height))]">
				<EditorBody
					content={content}
					syncContent={syncContent}
					raw={viewOptions.raw}
					className={widthClassName}
					fileKind={getFileKind(fileName)}
					scrollContainerRef={scrollRef}
				/>
			</main>
		</div>
	)
}

export default Layout
