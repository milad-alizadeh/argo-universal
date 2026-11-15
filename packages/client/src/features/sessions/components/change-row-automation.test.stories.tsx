import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { ChangeRow } from './change-row';
import {
  autoMergeOffChangeRow,
  autoMergeOnChangeRow,
  autoMergeUnavailableChangeRow,
} from './change-row-automation-fixtures';
import { checksRunningChangeRow } from './change-row-fixtures';

const { number } = autoMergeOffChangeRow.change;

const meta = {
  title: 'Tests/Sessions/ChangeRow/Automation',
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
    ...autoMergeOffChangeRow,
    onOpen: fn(),
    onCopyLink: fn(),
    onDetach: fn(),
    onSetAutomation: fn(),
  },
} satisfies Meta<typeof ChangeRow>;

export default meta;

type Story = StoryObj<typeof meta>;

type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

const openMenu = async (userEvent: User): Promise<void> => {
  await userEvent.click(
    await screen.findByRole('button', {
      name: `Actions for Change #${number}`,
    }),
  );
  await screen.findByRole('menu');
  await settleOverlays();
};

const labels = async (): Promise<(string | null)[]> =>
  (await screen.findAllByRole('menuitem')).map((row) => row.textContent);

// The automation group sits between the links and Detach, as ticked or unticked items.
function sitsBetweenLinksAndDetach(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      await settleLayout(width);
      await openMenu(userEvent);
      const names = Array.from(
        screen.getByRole('menu').querySelectorAll('[role^="menuitem"]'),
      ).map((row) => row.textContent);

      await expect(names).toEqual([
        'Open on GitHub',
        'Copy link',
        'Auto-merge',
        'Detach from Session',
      ]);
    },
  };
}

export const AutoMergeBetweenLinksAndDetachWide = sitsBetweenLinksAndDetach(
  layoutWidths.wide,
);

export const AutoMergeBetweenLinksAndDetachPhone = sitsBetweenLinksAndDetach(
  layoutWidths.phone,
);

// Unticked is drawn unchecked, and a tick asks for it on, once.
function ticking(width: number): Story {
  return {
    play: async ({ userEvent, args }) => {
      await settleLayout(width);
      await openMenu(userEvent);
      const item = await screen.findByRole('menuitemradio', {
        name: 'Auto-merge',
      });

      await expect(item).toHaveAttribute('aria-checked', 'false');
      await settleOverlays(item);
      await userEvent.click(item);
      await waitFor(() =>
        expect(args.onSetAutomation).toHaveBeenCalledWith('merge', true),
      );
      await expect(args.onSetAutomation).toHaveBeenCalledTimes(1);
    },
  };
}

export const TickingAutoMergeAsksForItOnWide = ticking(layoutWidths.wide);

export const TickingAutoMergeAsksForItOnPhone = ticking(layoutWidths.phone);

// What GitHub reports on is ticked, and unticking it asks for it off.
export const UntickingAutoMergeAsksForItOff: Story = {
  args: autoMergeOnChangeRow,
  play: async ({ userEvent, args }) => {
    await settleLayout('wide');
    await openMenu(userEvent);
    const item = await screen.findByRole('menuitemradio', {
      name: 'Auto-merge',
    });

    await expect(item).toHaveAttribute('aria-checked', 'true');
    await settleOverlays(item);
    await userEvent.click(item);
    await waitFor(() =>
      expect(args.onSetAutomation).toHaveBeenCalledWith('merge', false),
    );
  },
};

// Unavailable is disabled, says why under the label, and does nothing when pressed.
export const UnavailableAutoMergeSaysWhyAndIsDisabled: Story = {
  args: autoMergeUnavailableChangeRow,
  play: async ({ userEvent, args }) => {
    await settleLayout('wide');
    await openMenu(userEvent);
    const item = await screen.findByRole('menuitemradio', {
      name: 'Auto-merge',
    });

    await expect(item).toHaveAttribute('aria-disabled', 'true');
    await expect(item).toHaveTextContent(
      "Draft pull requests can't auto-merge",
    );
    item.click();
    await expect(args.onSetAutomation).not.toHaveBeenCalled();
  },
};

// A Change that carries no automation, or offers none that works, draws none of the three.
export const DrawsNoAutomationWhenNoneIsOffered: Story = {
  args: checksRunningChangeRow,
  play: async ({ userEvent }) => {
    await settleLayout('wide');
    await openMenu(userEvent);
    await expect(await labels()).toEqual([
      'Open on GitHub',
      'Copy link',
      'Detach from Session',
    ]);
    await expect(screen.queryByText('Auto-merge')).not.toBeInTheDocument();
    await expect(screen.queryByText('Auto-fix')).not.toBeInTheDocument();
    await expect(screen.queryByText('Auto-archive')).not.toBeInTheDocument();
  },
};
