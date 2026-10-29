import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import { Action, ActionShortcutScope } from '#primitives/actions/action';
import { Icon } from '#primitives/content/icon';
import { List, ListSectionHeader } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';

const added = fn();

const addBuildName = 'Add build, Builds';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/SectionActions',
  render: (): ReactElement => (
    <ActionShortcutScope>
      <List>
        <List.Section
          title="Builds"
          actions={
            <Action
              key="add"
              label="Add build"
              icon="add"
              shortcut={{ modifiers: ['alt'], key: 'b' }}
              onPress={added}
            />
          }
        >
          <ListItem title="Nightly" />
        </List.Section>
      </List>
    </ActionShortcutScope>
  ),
  beforeEach: (): void => {
    added.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// A wide header draws its Actions as buttons, each spoken with the section's title, and runs their shortcuts while it is shown.
export const WideButtons: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', { name: addBuildName }),
    );
    await expect(added).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Alt>}b{/Alt}');
    await expect(added).toHaveBeenCalledTimes(2);
  },
};

// Below a wide window the header draws no buttons: its context menu holds the Actions.
export const CompactContextMenu: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('phone');
    const title = await canvas.findByRole('heading', { name: 'Builds' });

    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: /^Add build/ })).toBeNull(),
    );
    await userEvent.pointer({ keys: '[MouseRight]', target: title });
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Add build' }),
    );
    await waitFor(() => expect(added).toHaveBeenCalledOnce());
  },
};

function sectionHeader(sidebar: boolean): ReactElement {
  return (
    <ListSectionHeader
      title="Builds"
      sidebar={sidebar}
      leading={<Icon name="folder-open" />}
      isExpanded
      onExpandedChange={fn()}
      actions={<Action label="Add build" icon="add" onPress={added} />}
    />
  );
}

async function widePointer(): Promise<void> {
  await settleLayout('wide');
  await cdp().send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 0,
    y: 0,
  });
}

function headerHover(sidebar: boolean): Story {
  return {
    render: () => sectionHeader(sidebar),
    beforeEach: widePointer,
    play: async ({ canvas }) => {
      const action = await canvas.findByRole('button', {
        name: addBuildName,
      });

      const heading = canvas.getByRole('button', { name: 'Builds' });

      await expect(action).not.toBeVisible();
      await expect(heading).toBeVisible();

      const before = heading.getBoundingClientRect();

      await browserUser.hover(heading);
      await expect(action).toBeVisible();
      await expect(heading.getBoundingClientRect().width).toBe(before.width);
      await widePointer();
      await expect(action).not.toBeVisible();
      await expect(heading).toBeVisible();
    },
  };
}

export const SidebarHover = headerHover(true);

export const RegularHover = headerHover(false);

function keyboardFocus(sidebar: boolean): Story {
  return {
    render: () => sectionHeader(sidebar),
    beforeEach: widePointer,
    play: async ({ canvas, userEvent }) => {
      const heading = await canvas.findByRole('button', { name: 'Builds' });
      const action = canvas.getByRole('button', { name: addBuildName });

      await expect(action).not.toBeVisible();
      await userEvent.tab();
      await expect(heading).toHaveFocus();
      await expect(action).toBeVisible();
      await userEvent.tab();
      await expect(action).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(added).toHaveBeenCalledOnce();
    },
  };
}

export const SidebarKeyboardFocus = keyboardFocus(true);

export const RegularKeyboardFocus = keyboardFocus(false);

export const SidebarOpenMenu: Story = {
  render: () => (
    <ListSectionHeader
      title="Builds"
      sidebar
      actions={
        <Action label="Build options" icon="settings">
          <Action.Section>
            <Action label="Add build" icon="add" onPress={added} />
          </Action.Section>
        </Action>
      }
    />
  ),
  beforeEach: widePointer,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const heading = await canvas.findByRole('heading', { name: 'Builds' });

    const trigger = canvas.getByRole('button', {
      name: 'Build options',
    });

    const page = within(canvasElement.ownerDocument.body);

    await expect(trigger).not.toBeVisible();
    await browserUser.hover(heading);
    await userEvent.click(trigger);

    const item = await page.findByRole('menuitem', { name: 'Add build' });

    await browserUser.hover(item);
    await waitFor(() => expect(item).toHaveFocus());
    await expect(trigger).toBeVisible();
    await userEvent.click(item);
    await expect(added).toHaveBeenCalledOnce();
    await expect(trigger).toHaveFocus();
    await expect(trigger).toBeVisible();
  },
};

function touchActions(sidebar: boolean): Story {
  return {
    render: () => sectionHeader(sidebar),
    beforeEach: async () => {
      await widePointer();
      await cdp().send('Emulation.setTouchEmulationEnabled', {
        enabled: true,
        maxTouchPoints: 1,
      });

      return async () => {
        await cdp().send('Emulation.setTouchEmulationEnabled', {
          enabled: false,
        });
      };
    },
    play: async ({ canvas }) => {
      await expect(matchMedia('(hover: none)').matches).toBe(true);
      await expect(matchMedia('(pointer: coarse)').matches).toBe(true);

      const action = await canvas.findByRole('button', {
        name: addBuildName,
      });

      await expect(action).toBeVisible();

      const { x, y, width, height } = action.getBoundingClientRect();

      await cdp().send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: x + width / 2, y: y + height / 2 }],
      });
      await cdp().send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await waitFor(() => expect(added).toHaveBeenCalledOnce());
    },
  };
}

export const SidebarTouch = touchActions(true);

export const RegularTouch = touchActions(false);
