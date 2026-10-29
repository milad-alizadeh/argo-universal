import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Pressable } from 'react-native';
import { expect, fn, within } from 'storybook/test';
import { pressTarget } from '#mocks/press-target';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { ListItem, ListItemInert, useListItemPress } from './index';

const title = 'Item one';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/ListItem',
  component: ListItem,
  args: { title, onPress: fn() },
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Select: Story = {
  args: { subtitle: 'main', selected: true, trailing: <Text>now</Text> },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText('main')).toBeVisible();
    await expect(canvas.getByText('now')).toBeVisible();
    const row = canvas.getByRole('button', { name: title });
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(row);
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    const row = canvas.getByRole('button', { name: title });
    await expect(row).toHaveAttribute('aria-disabled', 'true');
    row.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};

export const SlottedAnatomy: Story = {
  args: {
    title: 'Item three',
    subtitle: 'Subtitle',
    meta: <Pill text="Meta" />,
    progress: { value: 0.4, tone: 'success', active: true },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Item three')).toBeVisible();
    await expect(canvas.getByText('Meta')).toBeVisible();
  },
};

export const StatusBadge: Story = {
  args: { badge: { kind: 'status', tone: 'warning', label: 'Warning' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Warning')).toBeVisible();
  },
};

export const CountBadge: Story = {
  args: { title: 'Disabled item', disabled: true, badge: 3 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('3')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Disabled item' }),
    ).toHaveAttribute('aria-disabled', 'true');
  },
};

export const Value: Story = {
  args: { title: 'Version', value: '1.2', onPress: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Version, 1.2')).toBeVisible();
  },
};

const openIssue = fn();

const issueLink = (
  <Pressable role="link" accessibilityLabel="Open issue" onPress={openIssue}>
    <Text>Issue</Text>
  </Pressable>
);

// An accessory is its own press beside the row's, never inside it: pressing it leaves the row alone.
function accessoryPress(args: Story['args']): Story {
  return {
    args: { subtitle: 'main', ...args },
    play: async ({ args: { onPress }, canvas, userEvent }) => {
      openIssue.mockClear();
      const row = canvas.getByRole('button', { name: title });
      const link = canvas.getByRole('link', { name: 'Open issue' });

      await expect(within(row).queryByRole('link')).toBeNull();
      await userEvent.click(link);
      await expect(openIssue).toHaveBeenCalledOnce();
      await expect(onPress).not.toHaveBeenCalled();
      await userEvent.click(row);
      await expect(onPress).toHaveBeenCalledOnce();
    },
  };
}

export const MetaAccessory = accessoryPress({
  meta: <Pill text="Meta" />,
  metaAccessories: issueLink,
});

export const TrailingAccessory = accessoryPress({
  trailing: <Text>now</Text>,
  trailingAccessories: issueLink,
});

function AccessoryArrivesDuringPress({
  onPress,
}: {
  onPress?: () => void;
}): ReactElement {
  const [showAccessory, setShowAccessory] = useState(false);

  return (
    <ListItem
      title={title}
      onPress={onPress}
      onPointerDown={() => setShowAccessory(true)}
      metaAccessories={
        showAccessory ? (
          <Pressable role="link" accessibilityLabel="New accessory">
            <Text>New accessory</Text>
          </Pressable>
        ) : undefined
      }
    />
  );
}

export const AccessoryDuringPress: Story = {
  render: ({ onPress }) => <AccessoryArrivesDuringPress onPress={onPress} />,
  play: async ({ args, canvas, userEvent }) => {
    const row = canvas.getByRole('button', { name: title });
    await userEvent.pointer({ target: row, keys: '[MouseLeft>]' });
    await expect(
      canvas.getByRole('link', { name: 'New accessory' }),
    ).toBeVisible();
    await userEvent.pointer({
      target: canvas.getByRole('button', { name: title }),
      keys: '[/MouseLeft]',
    });
    await expect(args.onPress).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('button', { name: title })).toBe(row);

    row.focus();
    await expect(row).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onPress).toHaveBeenCalledTimes(2);
  },
};

// A hover target takes the pointer for its own reasons, but pressing it presses the row.
function HoverTarget(): ReactElement {
  return (
    <Pressable focusable={false} onPress={useListItemPress()}>
      <Text>Hover target</Text>
    </Pressable>
  );
}

// Plain text among the accessories and a hover target with nothing of its own to do both press the row.
export const AccessoriesThatPressTheRow: Story = {
  args: {
    metaAccessories: (
      <>
        <ListItemInert>
          <Text>Plain</Text>
        </ListItemInert>
        <HoverTarget />
      </>
    ),
  },
  play: async ({ args: { onPress }, canvas, userEvent }) => {
    await userEvent.click(pressTarget(canvas.getByText('Plain')));
    await expect(onPress).toHaveBeenCalledOnce();
    await userEvent.click(pressTarget(canvas.getByText('Hover target')));
    await expect(onPress).toHaveBeenCalledTimes(2);
  },
};

// A glyph leads the subtitle, in its tone, without changing what the row is called.
export const SubtitleIcon: Story = {
  args: {
    subtitle: 'Awaiting review',
    subtitleIcon: { sf: 'ticket', material: 'confirmation_number' },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: title })).toBeVisible();
    await expect(canvas.getByTestId('icon-confirmation_number')).toBeVisible();
  },
};

export const Loading: Story = {
  args: { isLoading: true, subtitle: 'main' },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(title));
    await expect(args.onPress).not.toHaveBeenCalled();
  },
};
