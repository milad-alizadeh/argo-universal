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

export function attachmentLabels(prompt: ContentBlock[]): string {
  return prompt
    .flatMap((block) => (block.type === 'text' ? [] : [attachmentName(block)]))
    .join(', ');
}

function attachmentName(block: ContentBlock): string {
  return 'name' in block ? (block.name ?? 'Attachment') : 'Attachment';
}
