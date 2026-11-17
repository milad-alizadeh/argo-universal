import type { ContentBlock } from '@repo/contracts';

export function promptText(prompt: ContentBlock[]): string {
  return prompt
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n');
}

export function editedPrompt(
  prompt: ContentBlock[],
  text: string,
): ContentBlock[] {
  return [
    { type: 'text', text },
    ...prompt.filter((block) => block.type !== 'text'),
  ];
}

export function attachmentSummary(prompt: ContentBlock[]): string {
  const count = prompt.filter((block) => block.type !== 'text').length;

  if (count === 0) return '';

  return `${count} ${count === 1 ? 'Attachment' : 'Attachments'}`;
}
