import { settleLayout } from '@repo/kit/mocks/story-layout';
import { ResourceCode as FeedCodeBlock } from '@repo/kit/primitives/content/code';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';

const source = [
  '// Responses must never be cached',
  'export function noStore(res: Response) {',
  "  res.headers.set(CACHE, 'no-store');",
  '  return res;',
  '}',
].join('\n');

const meta = {
  title: 'Tests/Design System/Patterns/SyntaxRuns',
  component: FeedCodeBlock,
  args: { code: source, language: 'ts' },
} satisfies Meta<typeof FeedCodeBlock>;

export default meta;

type Story = StoryObj<typeof FeedCodeBlock>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

/*
 * The runs the code is drawn in. Colouring splits a block into one run per colour, so a plain block
 * has none of its own and a highlighted one has several; what each run is painted is the theme's
 * business, not the test's.
 */
async function codeRuns(canvas: Canvas): Promise<string[]> {
  await settleLayout('wide');
  const text = canvas.getByTestId('code-text');

  return [...text.children].map((run) => run.textContent ?? '');
}

// Every character the block draws, however many runs it is split into.
async function wholeCode(canvas: Canvas): Promise<string> {
  await settleLayout('wide');

  return canvas.getByTestId('code-text').textContent ?? '';
}

// Colouring splits the code into runs without changing a character of it.
function highlights(language: string): Story {
  return {
    args: { language },
    play: async ({ canvas }) => {
      const runs = await codeRuns(canvas);

      await expect(runs.length).toBeGreaterThan(1);
      await expect(runs.join('')).toBe(source);
    },
  };
}

export const HighlightsKnownLanguage = highlights('ts');

// A heading of Argo's own names the block without claiming its code is written in that.
export const TitleIsNotALanguage: Story = {
  args: { language: undefined, title: 'Shell' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Shell')).toBeVisible();
    await expect(await codeRuns(canvas)).toHaveLength(0);
  },
};

// A tag with no grammar, and the plain tags Prism registers empty, draw as one undivided run.
function drawsPlain(language?: string): Story {
  return {
    args: { language },
    play: async ({ canvas }) => {
      await expect(await codeRuns(canvas)).toHaveLength(0);
      await expect(await wholeCode(canvas)).toBe(source);
    },
  };
}

export const DrawsUnknownLanguagePlain = drawsPlain('brainfuck');
