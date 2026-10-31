import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ToolOutput } from './tool-output';

const code = "export const cache = 'no-store';";

const meta = {
  title: 'Tests/Feed/ToolOutputSyntax',
  component: ToolOutput,
  args: {
    content: [{ type: 'content', content: { type: 'text', text: code } }],
  },
} satisfies Meta<typeof ToolOutput>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const codeRuns = async (canvas: Canvas): Promise<Element[]> => (
  await settleLayout('wide'),
  [...canvas.getByTestId('code-text').children]
);

/*
 * A read file's name both titles the block and, by its extension, decides the colours; `language`
 * never reaches the header, so the title stays the name as the Tool call gave it.
 */
export const ColoursAReadFileByItsName: Story = {
  args: { fileName: 'use-session.ts' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('use-session.ts')).toBeVisible();
    await expect((await codeRuns(canvas)).length).toBeGreaterThan(1);
  },
};

// Output that names no file is headed "Output", which is a heading and not a language.
export const DrawsUnnamedOutputPlain: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Output')).toBeVisible();
    await expect(await codeRuns(canvas)).toHaveLength(0);
  },
};

// A file Prism has no grammar for is still titled by its name.
export const DrawsAnUnknownFilePlain: Story = {
  args: { fileName: 'notes.txt' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('notes.txt')).toBeVisible();
    await expect(await codeRuns(canvas)).toHaveLength(0);
  },
};

// The Claude Agent writes a command's output as Markdown, in a console fence; the fence is not output.
export const ConsumesTheFenceAroundCommandOutput: Story = {
  args: {
    content: [
      {
        type: 'content',
        content: {
          type: 'text',
          text: '```console\nqa-token-file PLUM-7314\nhello-from-qa\n```',
        },
      },
    ],
  },
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await expect(canvas.getByText(/hello-from-qa/)).toBeVisible();
    await expect(canvas.queryByText(/```/)).toBeNull();
    await expect(canvas.queryByText(/console/)).toBeNull();
  },
};
