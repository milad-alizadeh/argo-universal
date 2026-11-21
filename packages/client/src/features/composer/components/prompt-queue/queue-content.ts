import {
  hasVoiceInstruction,
  withoutVoiceInstruction,
  withVoiceInstruction,
  type ContentBlock,
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
