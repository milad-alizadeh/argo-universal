import { createHeadlessEditor } from '@lexical/headless';
import { $isLinkNode } from '@lexical/link';
import { $getRoot } from 'lexical';
import { describe, expect, it } from 'vitest';
import {
  $exportMarkdown,
  $importMarkdown,
  richTextareaNodes,
} from './rich-textarea-markdown';

// The editor as the web drawing builds it, without a DOM: import a draft, then export what it shows.
function editorWith(markdown: string): ReturnType<typeof createHeadlessEditor> {
  const editor = createHeadlessEditor({
    namespace: 'rich-textarea-test',
    nodes: richTextareaNodes,
    onError: (error) => {
      throw error;
    },
  });
  editor.update(() => $importMarkdown(markdown), { discrete: true });
  return editor;
}

function roundTrip(markdown: string): string {
  return editorWith(markdown)
    .getEditorState()
    .read(() => $exportMarkdown());
}

interface ShownLink {
  text: string;
  url: string;
}

// The links a draft shows, each with its text and where it goes.
function linksIn(markdown: string): ShownLink[] {
  return editorWith(markdown)
    .getEditorState()
    .read(() => {
      const links = $getRoot()
        .getAllTextNodes()
        .map((text) => text.getParent())
        .filter($isLinkNode);
      return [...new Set(links)].map((link) => ({
        text: link.getTextContent(),
        url: link.getURL(),
      }));
    });
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
  {
    name: 'a link',
    markdown: 'Read the [Composer spec](https://argo.dev/spec)',
  },
  {
    name: 'a link next to marks',
    markdown: '**Read** the [spec](https://argo.dev/spec) _now_',
  },
  { name: 'a bold link', markdown: '[**spec**](https://argo.dev/spec)' },
  {
    name: 'a link whose URL holds underscores and stars',
    markdown: 'See [the run](https://ci.argo.dev/runs/snake_case_name?q=a*b*c)',
  },
  {
    name: 'a link whose text holds markdown characters',
    markdown: 'See [snake_case and 2 * 3 ~ 4 \\ end](https://argo.dev/a)',
  },
  {
    name: 'a link whose URL holds noncharacters the text does not',
    markdown: 'Keep [it](https://argo.dev/\uFDD0\uFDD1) as it is',
  },
  { name: 'a bare URL', markdown: 'Logs: https://ci.argo.dev/runs/8812' },
];

describe('RichTextarea markdown', () => {
  it.each(unchanged)('exports $name as it was imported', ({ markdown }) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it.each<{ name: string; markdown: string; links: ShownLink[] }>([
    {
      name: 'a link',
      markdown: 'Read the [Composer spec](https://argo.dev/spec)',
      links: [{ text: 'Composer spec', url: 'https://argo.dev/spec' }],
    },
    {
      name: 'a link whose URL holds underscores and stars',
      markdown: '[run](https://ci.argo.dev/a_b_c?q=a*b*c)',
      links: [{ text: 'run', url: 'https://ci.argo.dev/a_b_c?q=a*b*c' }],
    },
  ])('shows $name as a link', ({ markdown, links }) => {
    expect(linksIn(markdown)).toEqual(links);
  });

  it('shows a bare URL as text until it is typed', () => {
    expect(linksIn('Logs: https://ci.argo.dev/runs/8812')).toEqual([]);
  });

  it('writes a single-tilde strikethrough with two tildes', () => {
    expect(roundTrip('Make it ~gone~ now')).toBe('Make it ~~gone~~ now');
  });
});
