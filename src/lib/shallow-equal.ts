/** Whether both are `null`, or objects holding the same values under the same keys. */
export function shallowEqual<T extends object>(a: T | null, b: T | null) {
	if (a === null || b === null) return a === b

	const keys = Object.keys(a) as (keyof T)[]
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => a[key] === b[key])
	)
}
