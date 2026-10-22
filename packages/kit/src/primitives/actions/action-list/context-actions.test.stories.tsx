import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createElement, Fragment, type ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { Action, ActionList, ContextActions } from './index';

const archived = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Actions/ActionList/ContextActions',
  component: ContextActions,
} satisfies Meta<typeof ContextActions>;

export default meta;

type Story = StoryObj<typeof meta>;

const archive = (
  <ActionList key="archive">
    <Action icon="archive" label="Archive build" onPress={archived} />
  </ActionList>
);

const copy = (
  <ActionList key="copy">
    <Action icon="copy" label="Copy link" onPress={fn()} />
  </ActionList>
);

async function openMenu(canvasElement: HTMLElement): Promise<void> {
  await userEvent.pointer({
    target: within(canvasElement).getByText('Build actions'),
    keys: '[MouseRight]',
  });
}

// Every ActionList in the Slot lands in one menu, however the Slot holds them.
function mergedActions(actions: ReactNode): Story {
  return {
    args: { actions, children: <Text>Build actions</Text> },
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

export const ArrayOfActionLists = mergedActions([copy, archive]);

// The Plugin renderer hands a Slot holding several nodes over as a Fragment.
export const FragmentOfActionLists = mergedActions(
  <>
    {copy}
    {archive}
  </>,
);

export const EmptySlotDrawsTriggerAlone: Story = {
  args: {
    actions: createElement(Fragment),
    children: <Text>Build actions</Text>,
  },
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await expect(body.getByText('Build actions')).toBeVisible();
    await expect(body.queryByRole('menuitem')).toBeNull();
  },
};
