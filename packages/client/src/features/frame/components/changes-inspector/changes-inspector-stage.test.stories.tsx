import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { fewFiles } from './changes-inspector.mocks';
import {
  fileHeader,
  fewSummary,
  largeFile,
  testMeta,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/ChangesInspectorStage' };

export default meta;

type Story = StoryObj<typeof meta>;

const lastAddedLine = 'new value 60';

const duplicate = fewFiles[0];

if (!duplicate) throw new Error('Recorded catalog needs a file to duplicate');

export const BranchFilesDrillIntoOneDiff: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
    await expect(canvas.getByText(fewSummary)).toBeVisible();
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
    await userEvent.click(fileHeader(largeFile));
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(canvas.getByText(lastAddedLine)).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Diff for /repo/src/feed.ts' }),
    ).toBeNull();
    await expect(canvas.queryByText(fewSummary)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(canvas.getByText(fewSummary)).toBeVisible();
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
  },
};

export const CountsEachPathOnce: Story = {
  args: { files: [...fewFiles, duplicate], viewed: [largeFile, largeFile] },
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

export const ViewedFileOpensItsDiff: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(fileHeader('/repo/src/feed.ts'));
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(canvas.getAllByTestId('diff-line').length).toBeGreaterThan(0);
  },
};
