import type { ToolCallDiff } from '@repo/contracts';
import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { expect } from 'storybook/test';
import { type FileDiff, toFileDiffs } from '../../view/file-diff';
import { DiffView } from './diff-view';

const oldText = 'export function noStore(res: Response) {\n  return res;\n}\n';

const newText =
  "export function noStore(res: Response) {\n  res.headers.set(CACHE, 'no-store');\n  return res;\n}\n";

// The Foundations "Components / Code" master keeps syntax colours on diff hunks, so a hunk's lines colour by the file they belong to.
const change = (path: string): ToolCallDiff => ({
  type: 'diff',
  changes: [{ path, oldPath: path, operation: 'modify', oldText, newText }],
});

function fileAt(path: string): FileDiff {
  const file = toFileDiffs(change(path))[0];

  if (!file) throw new Error(`Fixture needs one diff for ${path}`);

  return file;
}

const meta = {
  title: 'Tests/DiffSyntax',
  component: DiffView,
  globals: { mode: 'light' },
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof DiffView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

/*
 * A hunk's line, found by the code it holds. A coloured line is split into runs, a plain one is
 * drawn whole; what each run is painted is the theme's business, not the test's.
 */
async function lineRuns(canvas: Canvas, code: string): Promise<string[]> {
  await settleViewport(layoutWidths.wide);

  const line = canvas
    .getAllByTestId('diff-line')
    .find((row) => row.textContent === code);

  if (!line) throw new Error(`Fixture needs a line drawing ${code}`);

  return [...line.children].map((run) => run.textContent ?? '');
}

const added = "  res.headers.set(CACHE, 'no-store');";

export const ColoursHunkLinesByTheFile: Story = {
  args: { file: fileAt('/repo/src/no-store.ts') },
  play: async ({ canvas }) => {
    const runs = await lineRuns(canvas, added);

    await expect(runs.length).toBeGreaterThan(1);
    await expect(runs.join('')).toBe(added);
  },
};

// A file Prism has no grammar for keeps the line as one undivided piece of text.
export const DrawsAnUnknownFilePlain: Story = {
  args: { file: fileAt('/repo/notes.txt') },
  play: async ({ canvas }) => {
    await expect(await lineRuns(canvas, added)).toHaveLength(0);
  },
};
