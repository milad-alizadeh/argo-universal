import { describe, expect, it } from 'vitest';
import {
  roundTrip,
  typedParagraph,
} from '../../../../../../../mocks/rich-textarea-headless';

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
  { name: 'unmatched markers', markdown: '*open and **open' },
  { name: 'a line break', markdown: 'First line\nSecond line' },
  { name: 'two paragraphs', markdown: 'First paragraph\n\nSecond paragraph' },
  { name: 'an empty draft', markdown: '' },
  {
    name: 'stars around a trailing space, which are not bold',
    markdown: '**bold **',
  },
  { name: 'a space before a mark', markdown: ' _it_ now' },
  { name: 'an unmatched backtick', markdown: 'Type ` to start code' },
  { name: 'markers inside bold', markdown: '**snake_case and 2 * 3 ~ 4**' },
  {
    name: 'markers inside strikethrough',
    markdown: '~~snake_case and 2 * 3~~',
  },
  {
    name: 'noncharacters in plain text',
    markdown: 'Keep \uFDD0 and \uFDD4 as they are',
  },
  {
    name: 'every first-choice stand-in in plain text',
    markdown: 'Keep \uFDD0\uFDD1\uFDD2\uFDD3\uFDD4 and *_`~\\ as they are',
  },
  {
    name: 'noncharacters in inline code',
    markdown: 'Keep `\uFDD0_\uFDD4` as it is',
  },
  { name: 'a bulleted list', markdown: '- First\n- Second' },
  { name: 'a numbered list', markdown: '1. First\n2. Second' },
  {
    name: 'a nested bulleted list',
    markdown: '- Plan\n    - Draft\n        - Outline\n- Ship',
  },
  {
    name: 'a nested numbered list',
    markdown: '1. Plan\n    1. Draft\n    2. Review\n2. Ship',
  },
  {
    name: 'a bulleted list inside a numbered list',
    markdown: '1. Plan\n    - Draft\n    - Review\n2. Ship',
  },
  {
    name: 'marks inside a list item',
    markdown: '- Keep **snake_case** _as is_',
  },
  { name: 'a heading', markdown: '# Plan' },
  { name: 'a third-level heading', markdown: '### Steps' },
  { name: 'marks inside a heading', markdown: '## Rename **snake_case**' },
  { name: 'a quote', markdown: '> Keep the phone readable.' },
  { name: 'a quote over two lines', markdown: '> First line\n> Second line' },
  {
    name: 'marks inside a quote',
    markdown: '> Rename snake_case to **camelCase**',
  },
  {
    name: 'a code block',
    markdown: '```\nconst snake_case = 2 * 3; // ~ \\\n```',
  },
  {
    name: 'a code block with a language',
    markdown: '```ts\nconst a = 1;\n```',
  },
  {
    name: 'blocks after one another',
    markdown: 'Steps:\n\n- Build\n- Test\n\n> Then ship\n\n```\npnpm test\n```',
  },
];

// Markers typed as text, where no shortcut fired, are sent as typed: export escapes nothing.
const typedMarkers = [
  '# not a heading',
  '*not italic*',
  '__not bold__',
  '> not a quote',
  '- not a list',
  '+ not a list',
  '* not a list',
  '1. not a list',
  '```not code',
];

describe('RichTextarea markdown', () => {
  it.each(unchanged)('exports $name as it was imported', ({ markdown }) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it.each(typedMarkers)('exports the typed text %s as it is', (text) => {
    expect(typedParagraph(text)).toBe(text);
  });

  it('writes a nested item four spaces in', () => {
    expect(roundTrip('- Plan\n  - Draft')).toBe('- Plan\n    - Draft');
  });

  it('numbers a list in order', () => {
    expect(roundTrip('1. Plan\n3. Ship')).toBe('1. Plan\n2. Ship');
  });

  // Lexical's other spellings of a mark are read, and written as the Feed's own.
  it.each([
    {
      name: 'a single-tilde strikethrough',
      markdown: 'Make it ~gone~ now',
      sent: 'Make it ~~gone~~ now',
    },
    {
      name: 'a star italic',
      markdown: 'Make it *italic* now',
      sent: 'Make it _italic_ now',
    },
    {
      name: 'an underscore bold',
      markdown: 'Make it __bold__ now',
      sent: 'Make it **bold** now',
    },
    {
      name: 'a star bold italic',
      markdown: '***both*** marks',
      sent: '**_both_** marks',
    },
  ])('writes $name in the Feed spelling', ({ markdown, sent }) => {
    expect(roundTrip(markdown)).toBe(sent);
  });
});
