import { describe, expect, it } from 'vitest'

import { createTextHistory } from '#src/lib/text-history'

describe('createTextHistory depth', () => {
	it('forgets the oldest steps past a hundred', () => {
		const history = createTextHistory()
		for (let version = 0; version <= 100; version += 1) {
			history.record({
				before: `Draft ${version}`,
				after: `Draft ${version + 1}`,
				selectionBefore: { start: 0, end: 0 },
				selectionAfter: { start: 0, end: 0 },
				inputType: null,
				time: version,
			})
		}

		let oldest = ''
		for (
			let step = history.undo({ start: 0, end: 0 });
			step;
			step = history.undo({ start: 0, end: 0 })
		) {
			oldest = step.text
		}

		expect(oldest).toBe('Draft 1')
	})
})
