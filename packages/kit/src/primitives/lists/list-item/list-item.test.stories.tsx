import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { Pressable } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { pressTarget } from '#mocks/press-target';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { Pill } from '#primitives/status/pill';
import { SkeletonLoadingContext } from '#primitives/status/skeleton';
import { ListItem, ListItemInert, useListItemPress } from './index';

const title = 'Item one';

const openIssueName = 'Open issue';

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
  <Pressable role="link" accessibilityLabel={openIssueName} onPress={openIssue}>
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
      const link = canvas.getByRole('link', { name: openIssueName });

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

const drawnState = {
  meta: <Pill text="Meta" />,
  metaAccessories: issueLink,
};

export const AccessoryRowNameLeavesOutItsLanes: Story = {
  args: drawnState,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: title })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Meta/ })).toBeNull();
    await expect(
      canvas.getByRole('link', { name: openIssueName }),
    ).toBeVisible();
  },
};

export const AccessoryRowLabelNamesItsLanes: Story = {
  args: { ...drawnState, accessibilityLabel: `${title}, Meta` },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: `${title}, Meta` }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: title })).toBeNull();
    await expect(
      canvas.getByRole('link', { name: openIssueName }),
    ).toBeVisible();
  },
};

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

// A state dot leads words that keep their own tone, and the row is still named by its title alone.
export const SubtitleStateDot: Story = {
  args: {
    subtitle: 'Connected',
    subtitleIcon: 'dot',
    subtitleIconTone: 'success',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: title })).toBeVisible();
    await expect(canvas.getByText('Connected')).toBeVisible();
    await expect(canvas.getByTestId('icon-dot')).toBeVisible();
  },
};

/*
 * A listbox's row: a field elsewhere owns the keyboard and names the highlighted row by its id, so the row
 * reads as selected rather than pressed and keeps nothing of a button's own pressed state.
 */
export const Option: Story = {
  args: { role: 'option', selected: true, nativeID: 'option-1' },
  play: async ({ args, canvas, userEvent }) => {
    const row = canvas.getByRole('option', { name: title });
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(row).not.toHaveAttribute('aria-pressed');
    await expect(row.id).toBe('option-1');
    await expect(canvas.queryByRole('button', { name: title })).toBeNull();
    await userEvent.click(row);
    await expect(args.onPress).toHaveBeenCalledOnce();
  },
};

// A row a loading Skeleton holds is a placeholder: its title is a width, so the row's own label must not be read.
export const HiddenWhileSkeletonLoads: Story = {
  render: (args) => (
    <>
      <SkeletonLoadingContext value>
        <ListItem {...args} title="Placeholder title" />
      </SkeletonLoadingContext>
      <SkeletonLoadingContext value={false}>
        <ListItem {...args} title="Ignored row" />
      </SkeletonLoadingContext>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Ignored row' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Placeholder title' }),
    ).toBeNull();
  },
};

// A row with no press of its own swallowed the press of what held it, such as a card's body.
export const ARowThatPressesNothingLeavesThePressToWhatHoldsIt: Story = {
  args: { onPress: undefined },
  decorators: [
    (Story, { parameters }): ReactElement => (
      <Pressable
        role="button"
        accessibilityLabel="Holder"
        onPress={parameters.holderPress}
      >
        <Story />
      </Pressable>
    ),
  ],
  parameters: { holderPress: fn() },
  play: async ({ canvas, userEvent, parameters }) => {
    await userEvent.click(canvas.getByText(title));
    await expect(parameters.holderPress).toHaveBeenCalledOnce();
  },
};

// What else makes a row act: each of these keeps its own press, so the press does not reach the holder.
const holdOnly = (row: ReactElement): ReactElement => (
  <Pressable role="button" accessibilityLabel="Holder" onPress={holderPress}>
    {row}
  </Pressable>
);

const holderPress = fn();

const ariaDisabled = 'aria-disabled';

export const ARowWithOnlyALongPressStillActs: Story = {
  args: { onPress: undefined, onLongPress: fn() },
  decorators: [(Story): ReactElement => holdOnly(<Story />)],
  beforeEach: (): void => {
    holderPress.mockClear();
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText(title));
    await expect(holderPress).not.toHaveBeenCalled();
  },
};

export const ARowWithOnlyALinkStillActs: Story = {
  args: { onPress: undefined, href: '#row' },
  decorators: [(Story): ReactElement => holdOnly(<Story />)],
  beforeEach: (): void => {
    holderPress.mockClear();
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(title).closest('a')).toHaveAttribute(
      'href',
      '#row',
    );
  },
};

export const ADisabledRowKeepsItsDisabledState: Story = {
  args: { onPress: undefined, disabled: true },
  decorators: [(Story): ReactElement => holdOnly(<Story />)],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(title)).toBeVisible();
    await expect(canvas.getByLabelText(title)).toHaveAttribute(
      ariaDisabled,
      'true',
    );
  },
};

export const ARowWithOnlyActionsKeepsItsMenu: Story = {
  args: {
    onPress: undefined,
    actions: <Action label="Archive row" icon="archive" onPress={fn()} />,
  },
  decorators: [(Story): ReactElement => holdOnly(<Story />)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText(title),
    });

    const item = await within(document.body).findByRole('menuitem', {
      name: 'Archive row',
    });

    await waitFor(() => expect(item).toBeVisible());
  },
};

export const ARowWithOnlyAContextMenuKeepsItsTrigger: Story = {
  args: {
    onPress: undefined,
    contextMenu: { title: 'Row menu' },
    actions: <Action label="Archive row" icon="archive" onPress={fn()} />,
  },
  decorators: [(Story): ReactElement => holdOnly(<Story />)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText(title),
    });

    const item = await within(document.body).findByRole('menuitem', {
      name: 'Archive row',
    });

    await waitFor(() => expect(item).toBeVisible());
  },
};
