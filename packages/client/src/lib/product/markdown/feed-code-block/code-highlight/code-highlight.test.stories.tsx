import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../generic/each-layout';
import { settleViewport } from '../../../../generic/settle-viewport';
import { FeedCodeBlock } from '../feed-code-block';

const source = [
  '// Responses must never be cached',
  'export function noStore(res: Response) {',
  "  res.headers.set(CACHE, 'no-store');",
  '  return res;',
  '}',
].join('\n');

const meta = {
  title: 'Tests/CodeHighlight',
  component: FeedCodeBlock,
  args: { code: source, language: 'ts' },
} satisfies Meta<typeof FeedCodeBlock>;

export default meta;

type Story = StoryObj<typeof FeedCodeBlock>;

async function codeText(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
): Promise<HTMLElement> {
  await settleViewport(layoutWidths.wide);

  return canvas.getByTestId('code-text');
}

// Highlighting splits the code into spans without changing a character of it.
export const HighlightsKnownLanguage: Story = {
  play: async ({ canvas }) => {
    const text = await codeText(canvas);

    await expect(text.children.length).toBeGreaterThan(1);
    await expect(text.textContent).toBe(source);
  },
};

// However the fence tags the language, it reaches the same grammar.
export const ReadsTheLanguageTagLoosely: Story = {
  args: { language: 'TypeScript' },
  play: async ({ canvas }) => {
    await expect((await codeText(canvas)).children.length).toBeGreaterThan(1);
  },
};

// Tool output names the file it read rather than a tag, and the extension decides the grammar.
export const ReadsTheFileExtension: Story = {
  args: { language: 'use-session.Test.TSX' },
  play: async ({ canvas }) => {
    await expect((await codeText(canvas)).children.length).toBeGreaterThan(1);
  },
};

// A heading of Argo's own names the block without claiming its code is written in that.
export const TitleIsNotALanguage: Story = {
  args: { language: undefined, title: 'Shell' },
  play: async ({ canvas }) => {
    const text = await codeText(canvas);

    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(text.children).toHaveLength(0);
  },
};

// A tag with no grammar, and the plain tags Prism registers empty, draw as one undivided run.
function drawsPlain(language?: string): Story {
  return {
    args: { language },
    play: async ({ canvas }) => {
      const text = await codeText(canvas);

      await expect(text.children).toHaveLength(0);
      await expect(text.textContent).toBe(source);
    },
  };
}

export const DrawsUnknownLanguagePlain = drawsPlain('brainfuck');

export const DrawsPlaintextPlain = drawsPlain('plaintext');

export const DrawsUntaggedFencePlain = drawsPlain();

const longSource = `${source}\n`.repeat(600);

// Past the guard the block draws plain rather than building spans nobody scrolls to.
export const DrawsVeryLongCodePlain: Story = {
  args: { code: longSource },
  play: async ({ canvas }) => {
    const text = await codeText(canvas);

    await expect(text.children).toHaveLength(0);
    await expect(text.textContent).toBe(longSource);
  },
};
