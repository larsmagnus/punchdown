/**
 * The first `selector` match under `root` drawn beneath `point`. The DOM's
 * hit-testing ignores `pointer-events-none` elements, so this reads rects. Rects are read per line, since a
 * wrapped span's bounding rect would also cover the gap between its lines.
 */
export function spanAtPoint(
	root: ParentNode,
	selector: string,
	point: { x: number; y: number }
): HTMLElement | undefined {
	return [...root.querySelectorAll<HTMLElement>(selector)].find((span) =>
		[...span.getClientRects()].some(
			(rect) =>
				point.x >= rect.left &&
				point.x <= rect.right &&
				point.y >= rect.top &&
				point.y <= rect.bottom
		)
	)
}
