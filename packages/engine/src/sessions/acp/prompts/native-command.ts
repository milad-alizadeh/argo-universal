import type { ContentBlock, PromptSender } from '@repo/contracts';

// ACP v1 represents a native slash command as text in the first block. A
// Session, Plugin or Hook cannot grant its own text the person's authority.
export function requireNativeCommandAuthority(
  content: readonly ContentBlock[],
  sender: PromptSender | undefined,
): void {
  if (!sender || sender.type === 'user' || sender.type === 'skill') return;

  const first = content[0];
  if (first?.type === 'text' && /^\s*\/\s*[\w$]/u.test(first.text))
    throw new Error(
      'A native slash command requires a person’s Prompt or confirmation.',
    );
}
