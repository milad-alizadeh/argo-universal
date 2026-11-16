import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { ChangeRow } from './change-row';
import { checksRunningChangeRow, spokenText } from './change-row-fixtures';

const { number } = checksRunningChangeRow.change;

const meta = {
  title: 'Tests/Sessions/ChangeRow',
  component: ChangeRow,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="w-full">
        <View className="w-frame-list">
          <Story />
        </View>
      </View>
    ),
  ],
  args: {
    ...checksRunningChangeRow,
    onOpen: fn(),
    onCopyLink: fn(),
    onDetach: fn(),
  },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

const triggerName = `Actions for Change #${number}`;

const openName = 'Open on GitHub';

const copyName = 'Copy link';

const detachName = 'Detach from Session';

const itemNames = [openName, copyName, detachName];

type Handler = 'onOpen' | 'onCopyLink' | 'onDetach';

type Choice = { name: string; handler: Handler };

const openChoice: Choice = { name: openName, handler: 'onOpen' };

const copyChoice: Choice = { name: copyName, handler: 'onCopyLink' };

const detachChoice: Choice = { name: detachName, handler: 'onDetach' };

const choices: Choice[] = [openChoice, copyChoice, detachChoice];

// Opens the … menu, and waits out its entrance so a pointer lands on a row that has stopped moving.
const openMenu = async (
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
): Promise<void> => {
  await userEvent.click(
    await screen.findByRole('button', { name: triggerName }),
  );
  await screen.findByRole('menu');
  await settleOverlays();
};

// The … opens a menu of the three items, in the order the design draws them.
function listsItems(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      await settleLayout(width);
      await openMenu(userEvent);
      const rows = await screen.findAllByRole('menuitem');

      await expect(rows.map(spokenText)).toEqual(itemNames);
    },
  };
}

export const ListsItemsWide = listsItems(layoutWidths.wide);

export const ListsItemsPhone = listsItems(layoutWidths.phone);

// Each item does its own job, once, and closes the menu.
function itemDoesItsJob(width: number, { name, handler }: Choice): Story {
  return {
    play: async ({ userEvent, args }) => {
      await settleLayout(width);
      await openMenu(userEvent);
      const item = await screen.findByRole('menuitem', { name });

      await settleOverlays(item);
      await userEvent.click(item);
      await waitFor(() => expect(args[handler]).toHaveBeenCalledTimes(1));

      for (const other of choices.filter((each) => each.handler !== handler))
        await expect(args[other.handler]).not.toHaveBeenCalled();

      await waitFor(() =>
        expect(screen.queryByRole('menu')).not.toBeInTheDocument(),
      );
    },
  };
}

export const OpenOnGitHubWide = itemDoesItsJob(layoutWidths.wide, openChoice);

export const OpenOnGitHubPhone = itemDoesItsJob(layoutWidths.phone, openChoice);

export const CopyLinkWide = itemDoesItsJob(layoutWidths.wide, copyChoice);

export const CopyLinkPhone = itemDoesItsJob(layoutWidths.phone, copyChoice);

export const DetachWide = itemDoesItsJob(layoutWidths.wide, detachChoice);

export const DetachPhone = itemDoesItsJob(layoutWidths.phone, detachChoice);

// Pressing the row outside the … still opens the PR, and opens no menu.
export const PressingTheRowOpensThePullRequest: Story = {
  play: async ({ userEvent, args }) => {
    await settleLayout('wide');
    await userEvent.click(
      await screen.findByRole('button', {
        name: `Open Change #${number} on GitHub`,
      }),
    );
    await expect(args.onOpen).toHaveBeenCalledTimes(1);
    await expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  },
};

// Without a handler for an item, the menu leaves it out rather than draw one that does nothing.
export const LeavesOutItemsWithNoHandler: Story = {
  args: { onCopyLink: undefined, onDetach: undefined },
  play: async ({ userEvent }) => {
    await settleLayout('wide');
    await openMenu(userEvent);
    await expect(
      (await screen.findAllByRole('menuitem')).map(spokenText),
    ).toEqual([openName]);
  },
};
