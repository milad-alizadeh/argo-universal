import type { ContentBlock } from '@repo/contracts';

// What a message says: its text blocks joined, other blocks left out.
export const messageText = (content: readonly ContentBlock[]): string =>
  content.map((block) => (block.type === 'text' ? block.text : '')).join('');
