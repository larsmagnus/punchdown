import { ChevronDown, Code, Copy, FileType } from 'lucide-react'

import { BadgeCopied } from '#src/components/badge-copied'
import { CopyActionsMenu } from '#src/components/copy-actions-menu'
import { Button } from '#src/components/ui/button'
import { ButtonGroup } from '#src/components/ui/button-group'
import {
	DropdownMenu,
	DropdownMenuTrigger,
} from '#src/components/ui/dropdown-menu'
import { useCopiedFeedback } from '#src/hooks/use-copied-feedback'
import { useSettings } from '#src/hooks/use-settings'
import { copyToClipboard } from '#src/lib/clipboard'
import { markdownToPlainText } from '#src/lib/markdown-to-text'
import { host } from '#src/lib/webview-host'

type ButtonCopyPageProps = { content: string }

/**
 * Toolbar action for getting the current note out of the editor: copy as
 * markdown or plain text (both include any frontmatter), or hand it to
 * Claude.
 */
export function ButtonCopyPage({ content }: ButtonCopyPageProps) {
	const { isVSCodeContext } = useSettings()
	const [copied, showCopiedFeedback] = useCopiedFeedback()

	function copyMarkdown() {
		copyToClipboard(content)
		showCopiedFeedback()
	}

	function copyPlainText() {
		copyToClipboard(markdownToPlainText(content))
		showCopiedFeedback()
	}

	function openInClaude() {
		if (isVSCodeContext) {
			host.send({ type: 'openClaudeTerminal' })
			return
		}
		// Acknowledged like any other copy: this replaces whatever the reader had
		// on their clipboard, which is not something to do silently.
		copyToClipboard(content)
		showCopiedFeedback()
		window.open('https://claude.ai', '_blank', 'noopener,noreferrer')
	}

	return (
		<div className="relative">
			<ButtonGroup>
				{/* `active:not-aria-[haspopup]:translate-y-px` is Button's default press
				feedback; canceled here (same variant chain, so `cn`'s tailwind-merge
				drops the original rather than leaving both to fight over source
				order) because the adjacent dropdown trigger doesn't get it - it
				carries `aria-haspopup`, which that style excludes - so the two would
				otherwise move inconsistently when this button group is pressed. */}
				<Button
					variant="outline"
					className="active:not-aria-[haspopup]:translate-y-0"
					onClick={copyMarkdown}
				>
					<Copy /> Copy page
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button variant="outline" aria-label="Open">
								<ChevronDown />
							</Button>
						}
					/>
					<CopyActionsMenu
						copyItems={[
							{ icon: <Code />, label: 'Copy markdown', onClick: copyMarkdown },
							{
								icon: <FileType />,
								label: 'Copy plain text',
								onClick: copyPlainText,
							},
						]}
						onOpenInClaude={openInClaude}
					/>
				</DropdownMenu>
			</ButtonGroup>

			<BadgeCopied show={copied} />
		</div>
	)
}
