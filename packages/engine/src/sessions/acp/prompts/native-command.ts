import type { ContentBlock, PromptSender } from '@repo/contracts';

function nativeLine(content: readonly ContentBlock[]): string | undefined {
  return content.flatMap((block) =>
    block.type === 'text'
      ? block.text
          .split(/\r?\n/u)
          .filter((line) =>
            /^\s*(?:\/\s*[\w$.:-]+|\$[a-z][\w-]*)(?:\s|$)/u.test(line),
          )
      : [],
  )[0];
}

export function requireNativeCommandAuthority(
  content: readonly ContentBlock[],
  sender: PromptSender | undefined,
): void {
  if (!sender || sender.type === 'user' || sender.type === 'skill') return;

  if (nativeLine(content) !== undefined)
    throw new Error(
      'A native command requires a person’s Prompt or confirmation.',
    );
}

// A Hook can rewrite a Prompt. Native commands require the person's exact input.
export function requireUnchangedNativeCommand(
  original: readonly ContentBlock[],
  rewritten: readonly ContentBlock[],
): void {
  if (nativeLine(rewritten) === undefined) return;

  if (JSON.stringify(original) !== JSON.stringify(rewritten))
    throw new Error(
      'A Hook changed a native command. Submit the exact command in the App.',
    );
}
