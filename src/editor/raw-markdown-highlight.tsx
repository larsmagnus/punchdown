import { cn } from 'cn'
import type { Ref } from 'react'
import { useMemo } from 'react'

import { findRawLinkRanges } from '#src/editor/extensions/link/find-raw-link-ranges'
import { RAW_TEXT_LAYOUT } from '#src/editor/raw-text-layout'
import { buildHighlightSegments } from '#src/lib/raw-markdown-highlight-segments'
import type { RelativeToken } from '#src/lib/syntax-highlight-tokens'
import type { SourcePlacedIssue } from '#src/lib/text-tools/place-source-issues'

interface RawMarkdownHighlightProps {
	text: string
	tokens: RelativeToken[]
	/** The link whose parens content the mouse currently sits over with
	 *  Cmd/Ctrl held (`use-raw-link-hover.ts`), or `null` for none - the one
	 *  segment this underlines. */
	activeLinkRangeIndex: number | null
	/** Text-tools findings, already placed at their raw-source ranges
	 *  (`use-raw-text-tools.ts`) - the same underline/tooltip the live editor
	 *  draws as ProseMirror decorations. */
	issues: SourcePlacedIssue[]
	/** Off when it no longer lines up with the textarea (`useMirrorAlignment`). */
	visible?: boolean
	ref?: Ref<HTMLPreElement>
}

/**
 * The colored mirror stacked behind raw mode's textarea - Shiki's tokens
 * drawn as a `<pre>` of colored spans, matching the textarea's own box
 * exactly so the two stay pixel-aligned. `EditorModeRaw` makes the textarea's
 * own text transparent so this shows through it.
 *
 * Every link's parens content also gets a `data-link-range` span, whether or
 * not it falls inside a Shiki token - `use-raw-link-hover.ts` (which owns
 * `activeLinkRangeIndex`) queries these by that attribute to hover-test the
 * mouse against their rendered rects, since this layer's own
 * `pointer-events-none` makes it invisible to the DOM's own hit-testing.
 */
export function RawMarkdownHighlight({
	text,
	tokens,
	activeLinkRangeIndex,
	issues,
	visible = true,
	ref,
}: RawMarkdownHighlightProps) {
	const linkRanges = useMemo(() => findRawLinkRanges(text), [text])
	const segments = useMemo(
		() => buildHighlightSegments(text, tokens, linkRanges, issues),
		[text, tokens, linkRanges, issues]
	)

	return (
		<pre
			ref={ref}
			aria-hidden="true"
			className={cn(
				RAW_TEXT_LAYOUT,
				'pointer-events-none absolute inset-0 w-full resize-none overflow-hidden bg-transparent',
				!visible && 'invisible'
			)}
		>
			{segments.map((segment, index) => (
				<span
					// eslint-disable-next-line react/no-array-index-key -- segments are
					// recomputed wholesale each pass, so index is a stable-enough key.
					key={index}
					data-link-range={segment.linkRangeIndex}
					className={segment.className}
					data-issue-title={segment.title}
					style={
						segment.linkRangeIndex === activeLinkRangeIndex
							? { ...segment.style, textDecoration: 'underline' }
							: segment.style
					}
				>
					{segment.text}
				</span>
			))}
			{/* Marks where the text ends, for `useMirrorAlignment` to count
			    lines to - and draws the line a final newline opens, which a
			    textarea shows and a `<pre>` otherwise would not. */}
			<span data-mirror-end="">{'\u200b'}</span>
		</pre>
	)
}
