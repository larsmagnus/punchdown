import { useEffect, useState } from 'react'

/**
 * The items `load` answers for `query`, which may arrive after the query does.
 * Until they do, the previous query's items stay up where `keepsItems` says
 * they still apply - the same folder, narrowed by one more keystroke - rather
 * than the menu blinking out; anywhere else nothing shows, since a stale item
 * picked there would write the wrong thing. An answer for a query already
 * replaced is dropped, and a failed one lists nothing.
 */
export function useSuggestionItems<Q, T>(
	query: Q | null,
	load: (query: Q) => T[] | Promise<T[]>,
	keepsItems: (previous: Q, next: Q) => boolean = () => true
): { items: T[]; loading: boolean } {
	const [loaded, setLoaded] = useState<{ query: Q; items: T[] } | null>(null)

	// A closed menu forgets its items, or the next one opens on a stale list.
	if (query === null && loaded !== null) setLoaded(null)

	useEffect(() => {
		if (query === null) return
		let current = true
		void Promise.resolve()
			.then(() => load(query))
			.catch(() => [])
			.then((items) => {
				if (current) setLoaded({ query, items })
			})
		return () => {
			current = false
		}
	}, [query, load])

	if (query === null) return { items: [], loading: false }
	const loading = loaded?.query !== query
	const applies =
		loaded !== null &&
		(loaded.query === query || keepsItems(loaded.query, query))
	return { items: applies ? loaded.items : [], loading }
}
