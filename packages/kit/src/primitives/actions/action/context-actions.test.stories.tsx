import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createElement, Fragment, type ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { Action, ContextActions } from './index';

const archived = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Actions/Action/ContextActions',
  component: ContextActions,
} satisfies Meta<typeof ContextActions>;

export default meta;

type Story = StoryObj<typeof meta>;

const archive = (
  <Action
    key="archive"
    icon="archive"
    label="Archive build"
    onPress={archived}
  />
);

const trigger = 'Build actions';

const copyLabel = 'Copy link';

const copy = <Action key="copy" icon="copy" label={copyLabel} onPress={fn()} />;

async function openMenu(canvasElement: HTMLElement): Promise<void> {
  await userEvent.pointer({
    target: within(canvasElement).getByText(trigger),
    keys: '[MouseRight]',
  });
}

// Every Action in the Slot lands in one menu, however the Slot holds them.
function mergedActions(actions: ReactNode): Story {
  return {
    args: { actions, children: <Text>{trigger}</Text> },
    play: async ({ canvasElement }) => {
      await openMenu(canvasElement);
      const menu = within(canvasElement.ownerDocument.body);

      await expect(
        await menu.findByRole('menuitem', { name: 'Copy link' }),
      ).toBeInTheDocument();
      await userEvent.click(
        menu.getByRole('menuitem', { name: 'Archive build' }),
      );
      await expect(archived).toHaveBeenCalledOnce();
    },
  };
}

export const ArrayOfActions = mergedActions([copy, archive]);

// The Plugin renderer hands a Slot holding several nodes over as a Fragment.
export const FragmentOfActions = mergedActions(
  <>
    {copy}
    {archive}
  </>,
);

export const EmptySlotDrawsTriggerAlone: Story = {
  args: {
    actions: createElement(Fragment),
    children: <Text>{trigger}</Text>,
  },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await expect(body.getByText(trigger)).toBeVisible();
    await expect(body.queryByRole('menuitem')).toBeNull();
  },
};

// A context menu is one level, so Actions that are all submenus leave it nothing to list.
export const OnlySubmenusDrawTriggerAlone: Story = {
  args: {
    actions: (
      <Action key="more" icon="copy" label="More">
        <Action.Section key="section">{copy}</Action.Section>
      </Action>
    ),
    children: <Text>{trigger}</Text>,
  },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await expect(body.getByText(trigger)).toBeVisible();
    await expect(body.queryByRole('menu')).toBeNull();
    await expect(body.queryByRole('menuitem')).toBeNull();
  },
};
