import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { fewFiles, loadedChanges } from './changes-inspector.mocks';
import {
  fileHeader,
  fewSummary,
  largeFile,
  testMeta,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/Frame/ChangesInspector/Stage' };

export default meta;

type Story = StoryObj<typeof meta>;

const lastAddedLine = 'new value 60';

const expanded = 'aria-expanded';

const duplicate = fewFiles[0];

if (!duplicate) throw new Error('Recorded catalog needs a file to duplicate');

// A file's diff opens under its header, in the list: the toolbar and the other files stay, and nothing offers Back.
export const FilesOpenInPlace: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
    await userEvent.click(fileHeader(largeFile));
    await expect(fileHeader(largeFile)).toHaveAttribute(expanded, 'true');
    await expect(canvas.getByText(lastAddedLine)).toBeVisible();
    await expect(fileHeader('/repo/src/feed.ts')).toBeVisible();
    await expect(canvas.getByText(fewSummary)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
    await userEvent.click(fileHeader(largeFile));
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
  },
};

export const CountsEachPathOnce: Story = {
  args: {
    ...loadedChanges([...fewFiles, duplicate]),
    viewed: [largeFile, largeFile],
  },
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.getByText(fewSummary)).toBeVisible();
    await expect(canvas.getByText('+65')).toBeVisible();
    await expect(canvas.getByText('−64')).toBeVisible();
    await expect(
      canvas.getAllByRole('button', { name: `Diff for ${largeFile}` }),
    ).toHaveLength(1);
  },
};

// A viewed file starts folded like any other and opens on its header.
export const ViewedFileOpensItsDiff: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(fileHeader('/repo/src/feed.ts'));
    await expect(canvas.getAllByTestId('diff-line').length).toBeGreaterThan(0);
  },
};
