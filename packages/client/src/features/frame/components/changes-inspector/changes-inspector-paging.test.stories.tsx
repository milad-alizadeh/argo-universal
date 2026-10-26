import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import type { ChangesInspector } from './changes-inspector';
import { PagedChangesInspector } from './changes-inspector-paging.mocks';
import { fewFiles, manyFiles } from './changes-inspector.mocks';
import {
  fileHeader,
  fileHeaders,
  largeFile,
  scrollUntil,
  testMeta,
} from './changes-inspector.test.mocks';

const meta = {
  ...testMeta,
  title: 'Tests/Frame/ChangesInspector/Paging',
  render: (args): React.JSX.Element => (
    <PagedChangesInspector {...args} source={[...fewFiles, ...manyFiles]} />
  ),
} satisfies Meta<typeof ChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const lastFile = '/repo/src/module-60/index.ts';

const lastAddedLine = 'new value 60';

const diffLines = (): HTMLElement[] => screen.queryAllByTestId('diff-line');

// The toolbar counts the whole comparison while the files arrive twenty at a time, until the last.
export const FilesArriveInPages: Story = {
  play: async ({ canvas }) => {
    await settleViewport(layoutWidths.wide);
    await expect(canvas.getByText('1/64 viewed')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: `Diff for ${lastFile}` }),
    ).toBeNull();
    await scrollUntil(
      () => fileHeaders().at(-1),
      () => canvas.queryByLabelText('Loading more files') !== null,
    );
    await scrollUntil(
      () => fileHeaders().at(-1),
      () =>
        canvas.queryByRole('button', { name: `Diff for ${lastFile}` }) !== null,
    );
    await waitFor(() =>
      expect(canvas.queryByLabelText('Loading more files')).toBeNull(),
    );
  },
};

// An opened diff shows its first page of lines, then the next as its end scrolls into view, down to its last line.
export const DiffArrivesInPages: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(fileHeader(largeFile));
    await waitFor(() => expect(diffLines().length).toBeGreaterThan(0));
    await expect(canvas.queryByText(lastAddedLine)).toBeNull();
    await scrollUntil(
      () => diffLines().at(-1),
      () => canvas.queryByText(lastAddedLine) !== null,
    );
    await expect(fileHeader(largeFile)).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
};
