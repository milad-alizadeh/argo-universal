import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ProjectHeading } from './project-heading';
import { expandedProject } from './project-heading-fixtures';

const onAdd = fn();

const onProjectSettings = fn();

const newSession = { name: 'New Session' };

const projectSettings = { name: 'Project settings' };

// A wide heading's buttons speak the Project after the Action, so every Project's buttons keep their own names.
function button({ name }: typeof newSession): typeof newSession {
  return { name: `${name}, ${expandedProject.name}` };
}

const heading = { name: expandedProject.name };

const meta = {
  title: 'Tests/Sessions/ProjectHeading',
  component: ProjectHeading,
  args: { ...expandedProject, onToggle: fn(), onAdd, onProjectSettings },
  beforeEach: (): void => {
    onAdd.mockClear();
    onProjectSettings.mockClear();
  },
} satisfies Meta<typeof ProjectHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

// A right-click opens the context menu that a phone opens on a long press.
async function openMenu(target: HTMLElement): Promise<void> {
  await userEvent.pointer({ keys: '[MouseRight]', target });
}

// A wide window draws both Actions as buttons beside the name, each running its own.
export const Buttons: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole('button', button(newSession)),
    );
    await expect(onAdd).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', button(projectSettings)));
    await expect(onProjectSettings).toHaveBeenCalledOnce();
  },
};

// Below a wide window there are no buttons: the heading's context menu holds the same Actions, in order.
export const ContextMenu: Story = {
  beforeEach: () => settleLayout('phone'),
  play: async ({ canvas }) => {
    const target = await canvas.findByRole('button', heading);

    await waitFor(() =>
      expect(canvas.queryByRole('button', button(newSession))).toBeNull(),
    );
    await openMenu(target);

    const items = within(await body.findByRole('menu')).getAllByRole(
      'menuitem',
    );

    await expect(items[0]).toHaveAccessibleName(newSession.name);
    await expect(items[1]).toHaveAccessibleName(projectSettings.name);
    await userEvent.click(body.getByRole('menuitem', newSession));
    await expect(onAdd).toHaveBeenCalledOnce();
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await openMenu(target);
    await userEvent.click(await body.findByRole('menuitem', projectSettings));
    await expect(onProjectSettings).toHaveBeenCalledOnce();
  },
};

// An Action is offered only when its handler is given: without either, the heading has no buttons and no menu.
export const WithoutHandlers: Story = {
  args: { onAdd: undefined, onProjectSettings: undefined },
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    const target = await canvas.findByRole('button', heading);

    await expect(
      canvas.queryByRole('button', button(projectSettings)),
    ).toBeNull();
    await settleLayout('phone');
    await openMenu(target);
    await expect(body.queryByRole('menu')).toBeNull();
  },
};
