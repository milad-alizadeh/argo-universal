import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
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

// However the fence tags the language, it reaches the same grammar.
export const ReadsTheLanguageTagLoosely = highlights('TypeScript');

// Tool output names the file it read rather than a tag, and the last extension decides the grammar.
export const ReadsTheFileExtension = highlights('use-session.Test.TSX');

// Agents write tags Prism has no alias of its own for.
export const ReadsAnExtraAlias = highlights('mts');

// A tag that holds a dot is tried whole before it is read as a file name.
export const PrefersTheWholeTagOverItsExtension = highlights('node.js');

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

export const DrawsPlaintextPlain = drawsPlain('plaintext');

export const DrawsTxtPlain = drawsPlain('notes.txt');

export const DrawsUntaggedFencePlain = drawsPlain();

/*
 * `Prism.languages` answers to its own helpers and to every name on Object's prototype, none of
 * which is a grammar.
 */
export const DrawsPrismsOwnMemberNamePlain = drawsPlain('constructor');

const atLimit = 'a'.repeat(20_000);

// The guard is on the code's length, so a block of exactly the limit is still coloured.
export const HighlightsCodeAtTheLimit: Story = {
  args: { code: atLimit, language: 'ts' },
  play: async ({ canvas }) => {
    await expect((await codeRuns(canvas)).length).toBeGreaterThan(0);
  },
};

// One character past it the block draws plain rather than building runs nobody scrolls to.
export const DrawsCodePastTheLimitPlain: Story = {
  args: { code: `${atLimit}a`, language: 'ts' },
  play: async ({ canvas }) => {
    await expect(await codeRuns(canvas)).toHaveLength(0);
  },
};

// A block with nothing in it draws nothing, rather than an empty run.
export const DrawsEmptyCode: Story = {
  args: { code: '', language: 'ts' },
  play: async ({ canvas }) => {
    await expect(await wholeCode(canvas)).toBe('');
  },
};
