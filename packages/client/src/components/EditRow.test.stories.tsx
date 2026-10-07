import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { EditRowPreview } from '../../mocks/edit-row-preview';
import { recordedEdit } from '../../mocks/feed-edit-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { EditRow } from './EditRow';

const meta = {
  title: 'Tests/EditRow',
  component: EditRow,
  globals: { themeId: 'default', mode: 'light' },
  parameters: { screenPreview: true },
  render: ({ row }) => <EditRowPreview key={row.id} row={row} />,
  args: { row: recordedEdit('agent-1') },
} satisfies Meta<typeof EditRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function editPlay({
  path,
  verb,
  added,
  removed,
  line,
}: {
  path: string;
  verb: string;
  added: string | null;
  removed: string | null;
  line: string;
}): NonNullable<Story['play']> {
  return async ({ canvas, userEvent }) => {
    if (process.env.NODE_ENV !== 'test') return;
    for (const width of [390, 1440]) {
      await settleViewport(width);
      const feed = within(canvas.getByTestId('edit-feed'));
      const summary = feed.queryByRole('button', { name: /^Edited \d+ files/ });
      if (summary?.getAttribute('aria-expanded') === 'false')
        await userEvent.click(summary);
      if (summary) {
        await expect(within(summary).queryByText(/[+-]\d+/)).toBeNull();
      }
      const button = feed.getByRole('button', { name: `${verb} ${path}` });
      await waitFor(() => {
        const feedBounds = canvas
          .getByTestId('edit-feed')
          .getBoundingClientRect();
        expect(button.getBoundingClientRect().right).toBeLessThan(
          feedBounds.right - 20,
        );
        if (summary)
          expect(summary.getBoundingClientRect().right).toBeLessThan(
            feedBounds.right - 20,
          );
      });
      if (added) await expect(within(button).getByText(added)).toBeVisible();
      if (removed)
        await expect(within(button).getByText(removed)).toBeVisible();
      await expect(
        getComputedStyle(
          within(button).getByText(path.split('/').at(-1) ?? path),
        ).fontWeight,
      ).toBe('400');
      await expect(
        getComputedStyle(
          within(button).getByText(path.split('/').at(-1) ?? path),
        ).textDecorationStyle,
      ).toBe('solid');
      for (const title of [
        within(button).getByText(path.split('/').at(-1) ?? path),
        ...(added ? [within(button).getByText(added)] : []),
        ...(removed ? [within(button).getByText(removed)] : []),
      ])
        await expect(getComputedStyle(title).userSelect).toBe('none');
      if (summary)
        await expect(
          getComputedStyle(within(summary).getByText(/^Edited \d+ files$/))
            .userSelect,
        ).toBe('none');
      await expect(getComputedStyle(button).height).toBe('20px');
      await userEvent.click(button);
      await expect(await canvas.findByText(line)).toBeVisible();
      await expect(feed.getByTestId('diff-view')).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Close Inspector' }),
      ).toBeNull();
      await userEvent.click(button);
      await waitFor(() => expect(feed.queryByTestId('diff-view')).toBeNull());
    }
  };
}

export const SmallEdit: Story = {
  play: editPlay({
    path: '/project/hello.txt',
    verb: 'Edited',
    added: '+1',
    removed: '-1',
    line: 'hello Argo',
  }),
};
export const SmallPatch: Story = {
  args: { row: recordedEdit('agent-2') },
  play: editPlay({
    path: '/repo/app.txt',
    verb: 'Edited',
    added: '+1',
    removed: '-1',
    line: 'gamma',
  }),
};
export const NewFile: Story = {
  args: { row: recordedEdit('agent-1', 'edit-and-command', 'add') },
  play: editPlay({
    path: '/project/notes.md',
    verb: 'Added',
    added: '+4',
    removed: null,
    line: '# Todo',
  }),
};
export const NewFileFromPatch: Story = {
  args: { row: recordedEdit('agent-2', 'edit-and-command', 'add') },
  play: editPlay({
    path: '/repo/notes.md',
    verb: 'Added',
    added: '+1',
    removed: null,
    line: 'hello',
  }),
};
export const DeletedFile: Story = {
  args: { row: recordedEdit('agent-2', 'edit-states', 'delete') },
  play: editPlay({
    path: '/repo/legacy.txt',
    verb: 'Deleted',
    added: null,
    removed: '-3',
    line: 'first legacy line',
  }),
};
export const LargeDiff: Story = {
  args: { row: recordedEdit('agent-2', 'edit-states') },
  play: editPlay({
    path: '/repo/large.txt',
    verb: 'Edited',
    added: '+60',
    removed: '-60',
    line: 'old value 1',
  }),
};

export const FailedEdit: Story = {
  args: { row: recordedEdit('agent-2', 'edit-failure') },
  play: async ({ canvas }) => {
    if (process.env.NODE_ENV !== 'test') return;
    for (const width of [390, 1440]) {
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
