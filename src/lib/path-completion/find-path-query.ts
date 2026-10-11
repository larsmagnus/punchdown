/** Where a typed path sits: link and image targets take percent-encoded names, inline code takes them as typed. */
export type PathContext = 'link' | 'code'

export type PathQuery = {
	/** Offset where the segment being completed - `query` - starts. */
	from: number
	/** The typed path through its last `/`, decoded; `''` for the note's own folder. */
	directory: string
	query: string
	context: PathContext
}

const LINK_TARGET = /\]\(([^\s()<>]*)$/
const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i
const BACKTICK_RUN = /\\?`+/g

/**
 * The path the caret is typing, given its line's text up to the caret: inside
 * a single-backtick code span, or a link or image target. `null` anywhere else.
 *
 * A code span is checked first, since link syntax inside one is literal text.
 * One left empty offers nothing, or every backtick typed would open a list of
 * files over the code being written.
 */
export function findPathQuery(textBefore: string): PathQuery | null {
	const code = openCodeSpanText(textBefore)
	if (code !== null) {
		return code === '' || /\s/.test(code)
			? null
			: splitPath(textBefore, code, 'code')
	}

	const target = LINK_TARGET.exec(textBefore)?.[1]
	if (
		target === undefined ||
		URL_SCHEME.test(target) ||
		target.startsWith('//') ||
		target.includes('#')
	) {
		return null
	}

	return splitPath(textBefore, target, 'link')
}

/**
 * The text after an unclosed single-backtick opener, else `null`. CommonMark
 * closes a span only with a run of the opener's own length, and a backslash
 * escapes a backtick outside a span but not inside one.
 */
function openCodeSpanText(text: string): string | null {
	let opener: { length: number; end: number } | null = null

	for (const match of text.matchAll(BACKTICK_RUN)) {
		const escaped = match[0].startsWith('\\')
		const length = match[0].length - (escaped ? 1 : 0)
		const end = match.index + match[0].length

		if (opener === null) {
			if (escaped && length === 1) continue
			opener = { length: escaped ? length - 1 : length, end }
		} else if (length === opener.length) {
			opener = null
		}
	}

	return opener?.length === 1 ? text.slice(opener.end) : null
}

/**
 * Separates the folder a typed path names from the segment the menu filters on.
 */
function splitPath(
	textBefore: string,
	typed: string,
	context: PathContext
): PathQuery {
	const segmentStart = typed.lastIndexOf('/') + 1
	const decode = context === 'link' ? safeDecode : (text: string) => text

	return {
		from: textBefore.length - typed.length + segmentStart,
		directory: decode(typed.slice(0, segmentStart)),
		query: decode(typed.slice(segmentStart)),
		context,
	}
}

/** A half-typed escape like `%2` is not yet decodable, and is matched as typed. */
function safeDecode(text: string): string {
	try {
		return decodeURIComponent(text)
	} catch {
		return text
	}
}

/**
 * Whether two queries list the same folder in the same context, so the
 * entries listed for one still apply to the other.
 */
export function listsSameFolder(a: PathQuery, b: PathQuery): boolean {
	return a.directory === b.directory && a.context === b.context
}
