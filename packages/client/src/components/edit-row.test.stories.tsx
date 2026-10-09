import type { ToolCallUpdate } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { EditRowPreview } from '../../mocks/edit-row-preview';
import { recordedEdit } from '../../mocks/feed-edit-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { EditRow } from './edit-row';

const meta = {
  title: 'Tests/EditRow',
  component: EditRow,
  globals: { themeId: 'default', mode: 'light' },
  parameters: { screenPreview: true },
  render: ({ row }): React.JSX.Element => (
    <EditRowPreview key={row.id} row={row} />
  ),
  args: { row: recordedEdit('agent-1') },
} satisfies Meta<typeof EditRow>;
export default meta;
type Story = StoryObj<typeof meta>;

type RecordedEdit = {
  row: ToolCallUpdate;
  path: string;
  verb: string;
  added: string | null;
  removed: string | null;
  line: string;
  summary: boolean;
};

// One story per width, so an expanded summary or diff never carries into the next width.
function editRow(width: number, edit: RecordedEdit): Story {
  const { path, verb, added, removed, line, summary } = edit;
  return {
    args: { row: edit.row },
    play: async ({ canvas, userEvent }) => {
      if (process.env.NODE_ENV !== 'test') return;
      await settleViewport(width);
      const feed = within(canvas.getByTestId('edit-feed'));
      const summaryName = /^Edited \d+ files/;
      if (summary) {
        const summaryButton = feed.getByRole('button', { name: summaryName });
        await expect(summaryButton).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(summaryButton);
        await expect(within(summaryButton).queryByText(/[+-]\d+/)).toBeNull();
        await expect(
          getComputedStyle(
            within(summaryButton).getByText(/^Edited \d+ files$/),
          ).userSelect,
        ).toBe('none');
      } else
        await expect(
          feed.queryByRole('button', { name: summaryName }),
        ).toBeNull();
      const button = feed.getByRole('button', { name: `${verb} ${path}` });
      await waitFor(async () => {
        const feedRight = canvas
          .getByTestId('edit-feed')
          .getBoundingClientRect().right;
        for (const element of [
          button,
          ...feed.queryAllByRole('button', { name: summaryName }),
        ])
          await expect(element.getBoundingClientRect().right).toBeLessThan(
            feedRight - 20,
          );
      });
      const name = within(button).getByText(path.split('/').at(-1) ?? path);
      const counts = [added, removed].flatMap((count) =>
        count === null ? [] : [within(button).getByText(count)],
      );
      for (const count of counts) await expect(count).toBeVisible();
      if (added === null)
        await expect(within(button).queryByText(/^\+\d+$/)).toBeNull();
      if (removed === null)
        await expect(within(button).queryByText(/^-\d+$/)).toBeNull();
      for (const title of [name, ...counts])
        await expect(getComputedStyle(title).userSelect).toBe('none');
      await expect(feed.queryByTestId('diff-view')).toBeNull();
      await userEvent.click(button);
      await expect(await canvas.findByText(line)).toBeVisible();
      await expect(feed.getByTestId('diff-view')).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Close Inspector' }),
      ).toBeNull();
      await userEvent.click(button);
      await waitFor(() => expect(feed.queryByTestId('diff-view')).toBeNull());
    },
  };
}

const smallEdit: RecordedEdit = {
  row: recordedEdit('agent-1'),
  path: '/project/hello.txt',
  verb: 'Edited',
  added: '+1',
  removed: '-1',
  line: 'hello Argo',
  summary: false,
};
export const SmallEditPhone = editRow(layoutWidths.phone, smallEdit);
export const SmallEditWide = editRow(layoutWidths.wide, smallEdit);

const smallPatch: RecordedEdit = {
  row: recordedEdit('agent-2'),
  path: '/repo/app.txt',
  verb: 'Edited',
  added: '+1',
  removed: '-1',
  line: 'gamma',
  summary: true,
};
export const SmallPatchPhone = editRow(layoutWidths.phone, smallPatch);
export const SmallPatchWide = editRow(layoutWidths.wide, smallPatch);

const newFile: RecordedEdit = {
  row: recordedEdit('agent-1', 'edit-and-command', 'add'),
  path: '/project/notes.md',
  verb: 'Added',
  added: '+4',
  removed: null,
  line: '# Todo',
  summary: false,
};
export const NewFilePhone = editRow(layoutWidths.phone, newFile);
export const NewFileWide = editRow(layoutWidths.wide, newFile);

const newFileFromPatch: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-and-command', 'add'),
  path: '/repo/notes.md',
  verb: 'Added',
  added: '+1',
  removed: null,
  line: 'hello',
  summary: true,
};
export const NewFileFromPatchPhone = editRow(
  layoutWidths.phone,
  newFileFromPatch,
);
export const NewFileFromPatchWide = editRow(
  layoutWidths.wide,
  newFileFromPatch,
);

const deletedFile: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-states', 'delete'),
  path: '/repo/legacy.txt',
  verb: 'Deleted',
  added: null,
  removed: '-3',
  line: 'first legacy line',
  summary: true,
};
export const DeletedFilePhone = editRow(layoutWidths.phone, deletedFile);
export const DeletedFileWide = editRow(layoutWidths.wide, deletedFile);

const largeDiff: RecordedEdit = {
  row: recordedEdit('agent-2', 'edit-states'),
  path: '/repo/large.txt',
  verb: 'Edited',
  added: '+60',
  removed: '-60',
  line: 'old value 1',
  summary: true,
};
export const LargeDiffPhone = editRow(layoutWidths.phone, largeDiff);
export const LargeDiffWide = editRow(layoutWidths.wide, largeDiff);

export const FailedEdit: Story = {
  args: { row: recordedEdit('agent-2', 'edit-failure') },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      const feed = within(canvas.getByTestId('edit-feed'));
      await expect(feed.getByText("Couldn't edit")).toBeVisible();
      await expect(feed.getByText('file.txt')).toBeVisible();
      await expect(feed.queryByTestId('diff-view')).toBeNull();
      await expect(feed.queryByText('+1')).toBeNull();
      await expect(feed.queryByText('-1')).toBeNull();
    }
  },
};
