import { Transaction } from '@tiptap/pm/state'

/**
 * Whether any of an `appendTransaction` batch actually changed the document -
 * the guard every repair plugin opens with, so a bare selection change does
 * not send it walking the whole document.
 */
export function anyDocChanged(transactions: readonly Transaction[]): boolean {
	return transactions.some((transaction) => transaction.docChanged)
}

/**
 * What a batch carries under `key`, the way a command names its intent to the
 * plugin that answers it - `undefined` when no transaction set one.
 */
export function metaString(
	transactions: readonly Transaction[],
	key: string
): string | undefined {
	for (const transaction of transactions) {
		const value: unknown = transaction.getMeta(key)
		if (typeof value === 'string') return value
	}
	return undefined
}

/**
 * Marks a transaction as a sync rather than an edit: it installs a note's
 * text, already complete, so nothing in it is the author's and no repair pass
 * has anything to answer.
 *
 * `setContent` emits `update` like any other change, so without this the
 * autosync cannot tell the host's own text from something the author typed,
 * and writes an external edit back as the editor's re-serialization of it.
 */
export const CONTENT_SYNC_META = 'contentSync'

/**
 * Marks the detached pass that completes a freshly parsed note with the
 * syntax its marks carry as real text (`completeParsedDocument`). Only that
 * synthesis runs; repairs answering an author's edit do not.
 */
export const COMPLETING_PARSE_META = 'completingParse'

/**
 * The transaction that started `transaction`'s round of `appendTransaction`s.
 * A plugin sees the transactions other plugins appended as a batch of their
 * own, carrying none of the metadata the original was dispatched with.
 */
export function rootOf(transaction: Transaction): Transaction {
	const root: unknown = transaction.getMeta('appendedTransaction')
	return root instanceof Transaction ? root : transaction
}

/** Whether a batch carries a note's text rather than an author's edit. */
export function isContentSync(transactions: readonly Transaction[]): boolean {
	return transactions.some((transaction) =>
		rootOf(transaction).getMeta(CONTENT_SYNC_META)
	)
}

/**
 * Whether a batch is something the author did - the only thing a repair pass
 * may answer. Loading a note, absorbing an outside change, or completing a
 * parse never are: repairing those rewrites text nobody touched.
 */
export function isAuthorEdit(transactions: readonly Transaction[]): boolean {
	return !transactions.some((transaction) => {
		const root = rootOf(transaction)
		return (
			root.getMeta(CONTENT_SYNC_META) || root.getMeta(COMPLETING_PARSE_META)
		)
	})
}
