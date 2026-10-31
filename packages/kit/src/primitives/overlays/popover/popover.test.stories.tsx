import { Switch } from '@expo/ui';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { expect, fireEvent, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { Slider } from '#primitives/controls/slider';
import { FieldGroup } from '#primitives/fields/field-group';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Popover',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const down = '{ArrowDown}';

function Trigger(): React.JSX.Element {
  return (
    <PopoverTrigger>
      <Pressable
        role="button"
        className={contentActionClass({ variant: 'outline' })}
      >
        <Text>{'Open'}</Text>
      </Pressable>
    </PopoverTrigger>
  );
}

function EffortSlider(): React.JSX.Element {
  const [effort, setEffort] = useState(2);

  return (
    <Slider
      accessibilityLabel="Effort"
      minimumValue={0}
      maximumValue={3}
      step={1}
      valueLabel={String(effort)}
      value={effort}
      onValueChange={setEffort}
    />
  );
}

function FastToggle(): React.JSX.Element {
  const [fast, setFast] = useState(false);

  return (
    <ListItem
      title="Fast"
      trailing={<Switch label="Fast" value={fast} onValueChange={setFast} />}
    />
  );
}

function SearchModels(): React.JSX.Element {
  const [query, setQuery] = useState('');

  return (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.TextField
          title="Search models"
          hideTitle
          value={query}
          onChangeText={setQuery}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

// A search field above a List of menu rows: one disabled, one with a Slider under its title, one a switch.
function MenuPopover(): React.JSX.Element {
  return (
    <Popover>
      <Trigger />
      <PopoverContent accessibilityLabel="Model" className="p-1">
        <SearchModels />
        <List>
          <ListItem title="Small" onPress={action('small')} />
          <ListItem title="Medium" disabled onPress={action('medium')} />
          <ListItem title="Large" onPress={action('large')} />
          <ListItem title="Effort" control={<EffortSlider />} />
          <FastToggle />
        </List>
      </PopoverContent>
    </Popover>
  );
}

const openMenu = async ({
  canvas,
  userEvent,
}: Parameters<NonNullable<Story['play']>>[0]): Promise<HTMLElement> => {
  await settleLayout('wide');
  await userEvent.click(canvas.getByRole('button', { name: 'Open' }));

  return within(document.body).findByRole('dialog', { name: 'Model' });
};

export const ArrowKeysSkipDisabledRowsWide: Story = {
  render: () => <MenuPopover />,
  play: async (context) => {
    const menu = within(await openMenu(context));
    const small = menu.getByRole('button', { name: 'Small' });
    small.focus();

    await context.userEvent.keyboard(down);
    await expect(menu.getByRole('button', { name: 'Large' })).toHaveFocus();
    await context.userEvent.keyboard('{ArrowUp}');
    await expect(small).toHaveFocus();
  },
};

// A switch row's own drawn switch is not a row of its own.
export const ArrowUpLeavesASwitchRowWide: Story = {
  render: () => <MenuPopover />,
  play: async (context) => {
    const menu = within(await openMenu(context));

    menu.getByRole('button', { name: 'Small' }).focus();

    await context.userEvent.keyboard('{End}');
    await expect(menu.getByRole('switch', { name: 'Fast' })).toHaveFocus();
    await context.userEvent.keyboard('{ArrowUp}');
    await expect(menu.getByRole('button', { name: 'Large' })).toHaveFocus();
  },
};

// The menu leaves the key to the range input, whose default action moves its thumb.
export const SliderKeepsItsArrowKeysWide: Story = {
  render: () => <MenuPopover />,
  play: async (context) => {
    const slider = within(await openMenu(context)).getByRole('slider', {
      name: 'Effort',
    });

    slider.focus();

    await expect(fireEvent.keyDown(slider, { key: 'ArrowDown' })).toBe(true);
    await expect(slider).toHaveFocus();
  },
};

export const KeysOutsideTheRowsStayWide: Story = {
  render: () => <MenuPopover />,
  play: async (context) => {
    const search = within(await openMenu(context)).getByRole('textbox', {
      name: 'Search models',
    });

    search.focus();

    await context.userEvent.keyboard(down);
    await expect(search).toHaveFocus();
  },
};

// Buttons that are not a List's rows keep the browser's keys.
export const ButtonsOutsideAListKeepTheirKeysWide: Story = {
  render: () => (
    <Popover>
      <Trigger />
      <PopoverContent accessibilityLabel="Actions">
        <Pressable role="button" onPress={action('copy')}>
          <Text>{'Copy'}</Text>
        </Pressable>
        <Pressable role="button" onPress={action('paste')}>
          <Text>{'Paste'}</Text>
        </Pressable>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));

    const actions = within(
      await within(document.body).findByRole('dialog', { name: 'Actions' }),
    );

    const copy = actions.getByRole('button', { name: 'Copy' });
    copy.focus();

    await userEvent.keyboard(down);
    await expect(copy).toHaveFocus();
  },
};

// The window frame's 8px inset, written out so the test does not read the value it checks.
const edgeMargin = 8;

// A popover whose trigger sits against the window's right edge shifts left and stops short of that edge.
export const StaysInsideTheWindowEdgeWide: Story = {
  render: () => (
    <View className="fixed top-6 right-0">
      <Popover>
        <Trigger />
        <PopoverContent
          accessibilityLabel="Edge"
          align="start"
          style={{ width: 320 }}
          className="p-0 overflow-hidden"
        >
          <Text>{'Edge'}</Text>
        </PopoverContent>
      </Popover>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));

    const popover = await within(document.body).findByRole('dialog', {
      name: 'Edge',
    });

    // Radix places its popper wrapper, the dialog's parent; the dialog fills it in the app.
    const placed = popover.parentElement;

    if (!placed) throw new Error('Popover has no popper wrapper');

    await expect(placed.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth - edgeMargin,
    );
  },
};
