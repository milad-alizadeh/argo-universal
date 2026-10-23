import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { action } from 'storybook/actions';
import { expect, fireEvent, within } from 'storybook/test';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { Slider } from '#primitives/inputs/slider';
import { Switch } from '#primitives/inputs/switch';
import { TextInput } from '#primitives/inputs/text-input';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
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
      trailing={
        <Switch
          accessibilityLabel="Fast"
          value={fast}
          onValueChange={setFast}
        />
      }
    />
  );
}

// A search field above a List of menu rows: one disabled, one with a Slider under its title, one a switch.
function MenuPopover(): React.JSX.Element {
  return (
    <Popover>
      <Trigger />
      <PopoverContent accessibilityLabel="Model" className="p-1">
        <TextInput variant="bare" accessibilityLabel="Search models" />
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
  await settleViewport(layoutWidths.wide);
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
    await settleViewport(layoutWidths.wide);
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
