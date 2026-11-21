import {
  hasVoiceInstruction,
  withoutVoiceInstruction,
  withVoiceInstruction,
  type ContentBlock,
  type QueuedPrompt,
} from '@repo/contracts';

const textOf = (prompt: ContentBlock[]): string =>
  prompt
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n');

// What the Prompt asks, without the instruction a Conversation's first Prompt carries for its Agent (ADR-0064).
export function promptText(prompt: ContentBlock[]): string {
  return withoutVoiceInstruction(textOf(prompt));
}

// The edited Prompt keeps the Conversation's instruction, which the person never saw.
export function editedPrompt(
  prompt: ContentBlock[],
  text: string,
): ContentBlock[] {
  const instructed = hasVoiceInstruction(textOf(prompt));

  return [
    { type: 'text', text: instructed ? withVoiceInstruction(text) : text },
    ...prompt.filter((block) => block.type !== 'text'),
  ];
}

export function attachmentSummary(prompt: ContentBlock[]): string {
  const count = prompt.filter((block) => block.type !== 'text').length;

  if (count === 0) return '';

  return `${count} ${count === 1 ? 'Attachment' : 'Attachments'}`;
}

// A tray row draws `from` as a short muted lead before `text`, so `from` stays a name and `text` takes the sentence.
export type QueueLabel = { text: string; from?: string };

const snippetLimit = 200;

// A delegated result's Prompt opens with the same lines for the Agent, so its row names the source Session and what it said.
export function queueLabel({ prompt, sender }: QueuedPrompt): QueueLabel {
  if (sender?.type !== 'session' || !sender.delegatedResult)
    return { text: promptText(prompt) };

  const { title, excerpt } = sender.resultPreview ?? {
    title: sender.title,
    excerpt: legacyExcerpt(prompt),
  };

  const snippet = excerpt
    ?.replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, snippetLimit);

  const more = sender.delegatedResult.length - 1;
  const suffix = more > 0 ? ` (+${more} more)` : '';

  return snippet
    ? { text: snippet + suffix, from: title }
    : { text: title + suffix };
}

// Results queued before preview metadata stored each outcome as one line of JSON.
function legacyExcerpt(prompt: ContentBlock[]): string | undefined {
  return textOf(prompt).split('\n').map(readLegacyExcerpt).find(Boolean);
}

function readLegacyExcerpt(line: string): string | undefined {
  if (!line.startsWith('{')) return;

  try {
    const record: unknown = JSON.parse(line);

    const excerpt =
      typeof record === 'object' && record !== null && 'excerpt' in record
        ? record.excerpt
        : undefined;

    return typeof excerpt === 'string' ? excerpt.trim() : undefined;
  } catch {
    return undefined;
  }
}
