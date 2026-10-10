import { useMemo } from 'react'
import { useDebounceValue } from 'usehooks-ts'

import { useAnalysis } from '#src/hooks/use-analysis'
import type { AnalyzerHandle } from '#src/hooks/use-analyzer'
import { ANALYSIS_DEBOUNCE_MS } from '#src/hooks/use-document-revision'
import { useTextToolsRequest } from '#src/hooks/use-text-tools-request'
import { getMarkdownSourceText } from '#src/lib/text-tools/markdown-source-text'
import type { SourcePlacedIssue } from '#src/lib/text-tools/place-source-issues'
import { placeSourceIssues } from '#src/lib/text-tools/place-source-issues'
import { TEXT_TOOL_RULE_IDS } from '#src/shared/messages'

/**
 * The raw editor's counterpart to `use-text-tools.ts`: runs the same writing
 * checks over the raw markdown source string instead of the ProseMirror
 * document, via the shared `useAnalysis`, and returns placed issues for
 * `EditorModeRaw` to render rather than dispatching into a TipTap command.
 *
 * Reads its own rule/language settings, the same way `use-markdown-editor.ts`
 * does for the live editor, so `EditorModeRaw` only has to hand over `draft`.
 * `analysis-parity.test.ts` is what guarantees this can never disagree with
 * the live editor's own highlights: both run the exact same pipeline against
 * provably identical flattened text.
 */
export function useRawTextTools(
	draft: string,
	active: boolean,
	analyzer?: AnalyzerHandle
): SourcePlacedIssue[] {
	const request = useTextToolsRequest(analyzer)
	const [debouncedDraft] = useDebounceValue(draft, ANALYSIS_DEBOUNCE_MS)

	// Rebuilt by its zod `.transform` on every config broadcast (see
	// `use-analysis-options.ts`), so the memo below keys on the ids themselves
	// rather than the array, which would recompute on an unrelated settings
	// change. Rule ids are plain words, so a comma cannot occur inside one.
	const rulesKey = request.rules.join(',')

	const { analysis, analyzedText } = useAnalysis({
		getFlattenedText: () => getMarkdownSourceText(debouncedDraft),
		revisionKey: debouncedDraft,
		...request,
		enabled: active && request.enabled,
	})

	return useMemo(() => {
		if (!analyzedText) return []
		return placeSourceIssues(
			analysis.issues,
			analyzedText,
			new Set(
				TEXT_TOOL_RULE_IDS.filter((id) => rulesKey.split(',').includes(id))
			)
		)
	}, [analysis, analyzedText, rulesKey])
}
