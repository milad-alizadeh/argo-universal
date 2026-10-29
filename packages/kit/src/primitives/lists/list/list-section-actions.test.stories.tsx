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

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

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

function renderSectionHeader(isSidebar: boolean): ReactElement {
  return (
    <ListSectionHeader
      title="Builds"
      sidebar={isSidebar}
      leading={<Icon name="folder-open" />}
      isExpanded
      onExpandedChange={fn()}
      actions={<Action label="Add build" icon="add" onPress={added} />}
    />
  );
}

async function prepareWidePointer(): Promise<void> {
  await settleLayout('wide');
  await cdp().send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 0,
    y: 0,
  });
}

async function getHeaderControls(
  canvas: PlayContext['canvas'],
): Promise<{ heading: HTMLElement; action: HTMLElement }> {
  const action = await canvas.findByRole('button', { name: addBuildName });
  const heading = canvas.getByRole('button', { name: 'Builds' });

  return { heading, action };
}

function createHeaderHoverStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: prepareWidePointer,
    play: async ({ canvas }) => {
      const { heading, action } = await getHeaderControls(canvas);

      await expect(action).not.toBeVisible();
      await expect(heading).toBeVisible();

      const before = heading.getBoundingClientRect();

      await browserUser.hover(heading);
      await expect(action).toBeVisible();
      await expect(heading.getBoundingClientRect().width).toBe(before.width);
    },
  };
}

export const SidebarHover = createHeaderHoverStory(true);

export const RegularHover = createHeaderHoverStory(false);

function createHeaderPointerExitStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: prepareWidePointer,
    play: async ({ canvas }) => {
      const { heading, action } = await getHeaderControls(canvas);

      await browserUser.hover(heading);
      await expect(action).toBeVisible();

      await prepareWidePointer();
      await expect(action).not.toBeVisible();
      await expect(heading).toBeVisible();
    },
  };
}

export const SidebarPointerExit = createHeaderPointerExitStory(true);

export const RegularPointerExit = createHeaderPointerExitStory(false);

function createHeaderKeyboardFocusStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: prepareWidePointer,
    play: async ({ canvas, userEvent }) => {
      const { heading, action } = await getHeaderControls(canvas);

      await expect(action).not.toBeVisible();
      await userEvent.tab();
      await expect(heading).toHaveFocus();
      await expect(action).toBeVisible();
    },
  };
}

export const SidebarKeyboardFocus = createHeaderKeyboardFocusStory(true);

export const RegularKeyboardFocus = createHeaderKeyboardFocusStory(false);

function createActionKeyboardFocusStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: prepareWidePointer,
    play: async ({ canvas, userEvent }) => {
      const { heading, action } = await getHeaderControls(canvas);

      await userEvent.tab();
      await expect(heading).toHaveFocus();

      await userEvent.tab();
      await expect(action).toHaveFocus();
      await expect(action).toBeVisible();
    },
  };
}

export const SidebarActionKeyboardFocus = createActionKeyboardFocusStory(true);

export const RegularActionKeyboardFocus = createActionKeyboardFocusStory(false);

function createKeyboardActivationStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: prepareWidePointer,
    play: async ({ canvas, userEvent }) => {
      const { action } = await getHeaderControls(canvas);

      await userEvent.tab();
      await userEvent.tab();
      await expect(action).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      await expect(added).toHaveBeenCalledOnce();
    },
  };
}

export const SidebarKeyboardActivation = createKeyboardActivationStory(true);

export const RegularKeyboardActivation = createKeyboardActivationStory(false);

function renderMenuHeader(): ReactElement {
  return (
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
  );
}

function createMenuStory(play: NonNullable<Story['play']>): Story {
  return { render: renderMenuHeader, beforeEach: prepareWidePointer, play };
}

async function prepareMenuOption({
  canvas,
  canvasElement,
  userEvent,
}: PlayContext): Promise<{ trigger: HTMLElement; item: HTMLElement }> {
  const heading = await canvas.findByRole('heading', { name: 'Builds' });
  const trigger = canvas.getByRole('button', { name: 'Build options' });
  const page = within(canvasElement.ownerDocument.body);

  await expect(trigger).not.toBeVisible();
  await browserUser.hover(heading);
  await userEvent.click(trigger);

  const item = await page.findByRole('menuitem', { name: 'Add build' });

  return { trigger, item };
}

async function prepareFocusedMenuOption(
  context: PlayContext,
): Promise<{ trigger: HTMLElement; item: HTMLElement }> {
  const controls = await prepareMenuOption(context);

  await browserUser.hover(controls.item);
  await waitFor(() => expect(controls.item).toHaveFocus());

  return controls;
}

export const SidebarOpenMenu = createMenuStory(async (context) => {
  const { trigger, item } = await prepareMenuOption(context);

  await browserUser.hover(item);
  await waitFor(() => expect(item).toHaveFocus());
  await expect(trigger).toBeVisible();
});

export const SidebarMenuSelection = createMenuStory(async (context) => {
  const { item } = await prepareFocusedMenuOption(context);

  await context.userEvent.click(item);
  await expect(added).toHaveBeenCalledOnce();
});

export const SidebarMenuFocusRestoration = createMenuStory(async (context) => {
  const { trigger, item } = await prepareFocusedMenuOption(context);

  await context.userEvent.click(item);
  await expect(trigger).toHaveFocus();
  await expect(trigger).toBeVisible();
});

function createTouchActionsStory(isSidebar: boolean): Story {
  return {
    render: () => renderSectionHeader(isSidebar),
    beforeEach: async () => {
      await prepareWidePointer();
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

export const SidebarTouch = createTouchActionsStory(true);

export const RegularTouch = createTouchActionsStory(false);
