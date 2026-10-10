import type { AnalysisRequest } from '#src/hooks/use-analysis-options'
import type { AnalyzerHandle } from '#src/hooks/use-analyzer'
import { useSharedAnalyzer } from '#src/hooks/use-analyzer'
import { useSettings } from '#src/hooks/use-settings'

/**
 * The writing checks' settings and the worker they run on, read once for
 * whichever view is asking, so the live and raw views cannot drift apart.
 */
export function useTextToolsRequest(
	analyzer?: AnalyzerHandle
): AnalysisRequest & AnalyzerHandle {
	const { viewOptions, settings } = useSettings()
	const { getAnalyzer, disposeAnalyzer } = useSharedAnalyzer(analyzer)

	return {
		enabled: viewOptions.textTools,
		rules: viewOptions.textToolRules,
		targetAge: settings.textToolsTargetAge,
		spellingLanguage: viewOptions.spellingLanguage,
		spellingIgnoreWords: viewOptions.spellingIgnoreWords,
		getAnalyzer,
		disposeAnalyzer,
	}
}
