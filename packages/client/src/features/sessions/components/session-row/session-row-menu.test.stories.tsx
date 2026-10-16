import { sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { SessionRow } from './session-row';

const onRename = fn();

const onArchive = fn();

const meta = {
  title: 'Tests/SessionRow/Menu',
  component: SessionRow,
  args: {
    session: sessionRows.running,
    logo: '',
    onSelect: fn(),
    onRename,
    onArchive,
  },
} satisfies Meta<typeof SessionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = 'phone' | 'wide';

const body = within(document.body);

const rowTitle = sessionRows.running.title;

type UserEvent = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

const rightClick = (user: UserEvent, target: Element): Promise<void> =>
  user.pointer({ keys: '[MouseRight]', target });

function atWidth(layout: Layout): () => Promise<void> {
  return async () => {
    onRename.mockClear();
    onArchive.mockClear();
    await settleViewport(layoutWidths[layout]);
  };
}

// A right-click opens Rename, then Archive; Rename asks to rename this Session.
function rightClickRenamesAt(layout: Layout): Story {
  return {
    beforeEach: atWidth(layout),
    play: async ({ canvas, userEvent }) => {
      await rightClick(userEvent, canvas.getByText(rowTitle));
      const menu = within(await body.findByRole('menu'));
      const [first, second] = menu.getAllByRole('menuitem');
      await expect(first).toHaveAccessibleName('Rename');
      await expect(second).toHaveAccessibleName('Archive');
      await userEvent.click(menu.getByRole('menuitem', { name: 'Rename' }));
      await expect(onRename).toHaveBeenCalledWith(
        sessionRows.running.sessionId,
      );
      await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    },
  };
}

export const RightClickRenamesOnPhone: Story = rightClickRenamesAt('phone');

export const RightClickRenamesWide: Story = rightClickRenamesAt('wide');

export const ArchiveFromTheMenu: Story = {
  beforeEach: atWidth('wide'),
  play: async ({ canvas, userEvent }) => {
    await rightClick(userEvent, canvas.getByText(rowTitle));
    const menu = within(await body.findByRole('menu'));
    await userEvent.click(menu.getByRole('menuitem', { name: 'Archive' }));
    await expect(onArchive).toHaveBeenCalledWith(sessionRows.running.sessionId);
    await expect(onRename).not.toHaveBeenCalled();
  },
};

// Without Archive, the menu holds Rename alone.
export const RenameAloneWithoutArchive: Story = {
  args: { onArchive: undefined },
  beforeEach: atWidth('wide'),
  play: async ({ canvas, userEvent }) => {
    await rightClick(userEvent, canvas.getByText(rowTitle));
    const menu = within(await body.findByRole('menu'));
    await expect(menu.getAllByRole('menuitem')).toHaveLength(1);
    await expect(menu.queryByRole('separator')).toBeNull();
  },
};

// A double-click renames the Session, as a desktop renames a file.
function doubleClickRenamesAt(layout: Layout): Story {
  return {
    beforeEach: atWidth(layout),
    play: async ({ canvas, userEvent }) => {
      await userEvent.dblClick(canvas.getByText(rowTitle));
      await expect(onRename).toHaveBeenCalledWith(
        sessionRows.running.sessionId,
      );
    },
  };
}

export const DoubleClickRenamesOnPhone: Story = doubleClickRenamesAt('phone');

export const DoubleClickRenamesWide: Story = doubleClickRenamesAt('wide');

// An archived Session cannot be renamed, so it opens no menu and a double-click does nothing.
export const ArchivedHasNoMenu: Story = {
  args: { session: sessionRows.archived },
  beforeEach: atWidth('wide'),
  play: async ({ canvas, userEvent }) => {
    const title = canvas.getByText(sessionRows.archived.title);
    await rightClick(userEvent, title);
    await userEvent.dblClick(title);
    await expect(body.queryByRole('menu')).toBeNull();
    await expect(onRename).not.toHaveBeenCalled();
  },
};

// A Compact row opens the same menu.
export const CompactRowRightClick: Story = {
  args: { layout: 'compact' },
  beforeEach: atWidth('wide'),
  play: async ({ canvas, userEvent }) => {
    await rightClick(userEvent, canvas.getByText(rowTitle));
    await expect(
      within(await body.findByRole('menu')).getAllByRole('menuitem'),
    ).toHaveLength(2);
  },
};
