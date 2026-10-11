import { cn } from 'cn'
import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

import { RAW_PATH_SOURCE } from '#src/editor/extensions/path-completion/raw-path-source'
import { RAW_SLASH_SOURCE } from '#src/editor/extensions/slash-command/raw-slash-source'
import { RawLineGutter } from '#src/editor/raw-line-gutter'
import { RawMarkdownHighlight } from '#src/editor/raw-markdown-highlight'
import { RawMarkdownTextarea } from '#src/editor/raw-markdown-textarea'
import { RawSuggestionMenu } from '#src/editor/raw-suggestion-menu'
import type { AnalyzerHandle } from '#src/hooks/use-analyzer'
import { useMirrorAlignment } from '#src/hooks/use-mirror-alignment'
import { useRawDraftSync } from '#src/hooks/use-raw-draft-sync'
import { useRawGutterRoom } from '#src/hooks/use-raw-gutter-room'
import { useRawHeadingReveal } from '#src/hooks/use-raw-heading-reveal'
import { useRawLinkClick } from '#src/hooks/use-raw-link-click'
import { useRawLinkHover } from '#src/hooks/use-raw-link-hover'
import { useRawModeElements } from '#src/hooks/use-raw-mode-elements'
import { useRawSearchReveal } from '#src/hooks/use-raw-search-reveal'
import { useRawSyntaxHighlight } from '#src/hooks/use-raw-syntax-highlight'
import { useRawTextTools } from '#src/hooks/use-raw-text-tools'
import { lineIndexAt } from '#src/lib/line-index-at'
import type { RawModeElements } from '#src/lib/mode-switch/raw-mode-view'
import type { SourcePlacedIssue } from '#src/lib/text-tools/place-source-issues'

interface RawMarkdownEditorProps {
	content: string
	syncContent: (content: string) => void
	/** Off while live mode is on screen instead - see `EditorBody`. Stays
	 *  mounted regardless, so an edit made here is still one undoable step on
	 *  the live editor once it is revealed again. */
	active?: boolean
	className?: string
	/** One analyzer shared with the live editor, owned by `EditorBody`. Falls
	 *  back to one owned here when absent, for a standalone mount with no
	 *  `EditorBody` around it. */
	analyzer?: AnalyzerHandle
	/** Reports the current placed issues to `EditorBody`, which hands them to
	 *  the sidebar (`RawTextToolsContext`) so a click can select inside this
	 *  textarea while it is the visible mode. */
	onIssuesChange?: (issues: SourcePlacedIssue[]) => void
	/** Where `EditorBody` reads this view's caret and its on-screen position
	 *  from, to carry both across a mode switch. */
	elementsRef?: RefObject<RawModeElements | null>
}

/**
 * The note as plain markdown source, editable and autosyncing.
 *
 * Writes the file verbatim - frontmatter included - because this view shows the
 * whole file. The rich editor keeps frontmatter as its own node and reads it
 * out through `splitFrontmatter`, which would re-fence a block that is already
 * fenced here.
 */
export function EditorModeRaw({
	content,
	syncContent,
	active = true,
	className,
	analyzer,
	onIssuesChange,
	elementsRef,
}: RawMarkdownEditorProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const overlayRef = useRef<HTMLPreElement>(null)
	const wrapperRef = useRef<HTMLDivElement>(null)

	const { draft, draftRef, handleChange, handleBlur } = useRawDraftSync({
		content,
		syncContent,
		active,
		textareaRef,
	})
	useRawSearchReveal(textareaRef, draftRef)
	useRawHeadingReveal(textareaRef, draftRef, active)
	useRawLinkClick(textareaRef, draftRef)
	const activeLinkRangeIndex = useRawLinkHover(textareaRef, overlayRef)
	const gutterRoom = useRawGutterRoom(lineIndexAt(draft, draft.length) + 1)
	const tokens = useRawSyntaxHighlight(draft, active)
	const issues = useRawTextTools(draft, active, analyzer)

	useEffect(() => {
		onIssuesChange?.(issues)
	}, [issues, onIssuesChange])
	useRawModeElements(elementsRef, textareaRef, overlayRef)
	const aligned = useMirrorAlignment(textareaRef, overlayRef, draft)
	const suggestionMenuProps = {
		textareaRef,
		overlayRef,
		wrapperRef,
		draft,
		active,
	}

	return (
		// The measure/centering classes (`className`) live on this wrapper, not
		// the textarea - `RawMarkdownHighlight` shares this same box via
		// `absolute inset-0`, and the two must wrap at the identical width or a
		// click lands on whatever character the textarea's own, differently
		// wrapped layout puts underneath it, not the one the mirror shows there.
		<div
			ref={wrapperRef}
			className={cn('relative', className, gutterRoom.className)}
			style={gutterRoom.style}
		>
			<RawLineGutter text={draft} textareaRef={textareaRef} />
			<RawMarkdownHighlight
				ref={overlayRef}
				text={draft}
				tokens={tokens}
				activeLinkRangeIndex={activeLinkRangeIndex}
				issues={issues}
				visible={aligned}
			/>
			<RawMarkdownTextarea
				ref={textareaRef}
				value={draft}
				onChange={handleChange}
				onBlur={handleBlur}
				textVisible={!aligned}
				overLink={activeLinkRangeIndex !== null}
			/>
			<RawSuggestionMenu source={RAW_SLASH_SOURCE} {...suggestionMenuProps} />
			<RawSuggestionMenu source={RAW_PATH_SOURCE} {...suggestionMenuProps} />
		</div>
	)
}
