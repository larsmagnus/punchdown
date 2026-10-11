import { cn } from 'cn'

interface SuggestionMenuEmptyProps {
	loading: boolean
}

/**
 * What a suggestion menu shows with nothing to list. "Loading" fades in only
 * after a beat, so an answer that comes back at once never flashes it.
 */
export function SuggestionMenuEmpty({ loading }: SuggestionMenuEmptyProps) {
	return (
		<div
			role="status"
			className={cn(
				'w-56 rounded-lg bg-popover p-2 text-sm text-muted-foreground shadow-md ring-1 ring-foreground/10',
				loading &&
					'animate-in duration-150 fade-in fill-mode-backwards delay-150'
			)}
		>
			{loading ? 'Loading…' : 'No results'}
		</div>
	)
}
