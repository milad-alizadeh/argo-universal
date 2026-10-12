import { createHeadlessEditor } from '@lexical/headless';
import { describe, expect, it } from 'vitest';
import {
  $exportMarkdown,
  $importMarkdown,
  richTextareaNodes,
} from './rich-textarea-markdown';

// The editor as the web drawing builds it, without a DOM: import a draft, then export what it shows.
function roundTrip(markdown: string): string {
  const editor = createHeadlessEditor({
    namespace: 'rich-textarea-test',
    nodes: richTextareaNodes,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(() => $importMarkdown(markdown), { discrete: true });
  return editor.getEditorState().read(() => $exportMarkdown());
}

const unchanged: { name: string; markdown: string }[] = [
  { name: 'bold', markdown: 'Make it **bold** now' },
  { name: 'italic', markdown: 'Make it _italic_ now' },
  { name: 'strikethrough', markdown: 'Make it ~~gone~~ now' },
  { name: 'inline code', markdown: 'Run `pnpm test` now' },
  { name: 'bold italic', markdown: '**_both_** marks' },
  { name: 'markers inside inline code', markdown: 'See `a_b*c~d\\e`' },
  {
    name: 'underscores in plain text',
    markdown: 'Rename snake_case_name in file_name.ts',
  },
  { name: 'stars in plain text', markdown: '2 * 3 * 4' },
  { name: 'tildes in plain text', markdown: 'about ~ 5 or ~/projects' },
  { name: 'backslashes in plain text', markdown: 'C:\\Users\\argo and a\\b' },
  { name: 'unmatched markers', markdown: '*not italic* and **open' },
  { name: 'a line break', markdown: 'First line\nSecond line' },
  { name: 'two paragraphs', markdown: 'First paragraph\n\nSecond paragraph' },
  { name: 'an empty draft', markdown: '' },
];

describe('RichTextarea markdown', () => {
  it.each(unchanged)('exports $name as it was imported', ({ markdown }) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it('writes a single-tilde strikethrough with two tildes', () => {
    expect(roundTrip('Make it ~gone~ now')).toBe('Make it ~~gone~~ now');
  });
});
