import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu, picked } from './drill-menu.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Drill',
  beforeEach: async (): Promise<void> => {
    picked.mockClear();
    await settleViewport(layoutWidths.wide);
  },
  render: (): ReactElement => <Menu />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const page = within(document.body);

// Radix marks a closing popover at once, before its exit transition ends.
const openState = 'data-state';

async function openChoices(
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
  label: string,
): Promise<{ menu: HTMLElement; choices: HTMLElement }> {
  await userEvent.click(page.getByRole('button', { name: 'Configure' }));
  const menu = await page.findByRole('dialog', { name: 'Configure' });
  await userEvent.click(
    within(menu).getByRole('button', { name: new RegExp(`^${label},`) }),
  );

  return {
    menu,
    choices: await page.findByRole('dialog', { name: `Select ${label}` }),
  };
}

// Several picks in a row: each applies, and the choices and their menu stay open until a click outside.
export const KeepOpenKeepsBothOpenAfterAPick: Story = {
  play: async ({ userEvent }) => {
    const { menu, choices } = await openChoices(userEvent, 'Fruit');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Banana' }),
    );
    await userEvent.click(
      within(choices).getByRole('button', { name: 'Cherry' }),
    );

    await expect(picked.mock.calls).toEqual([['Banana'], ['Cherry']]);
    await expect(
      within(menu).getByRole('button', { name: 'Fruit, Cherry' }),
    ).toBeVisible();
    await expect(choices).toHaveAttribute(openState, 'open');
    await expect(menu).toHaveAttribute(openState, 'open');

    await userEvent.click(document.body);
    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await waitFor(() => expect(menu).not.toBeInTheDocument());
  },
};

// A click on the menu closes the choices beside it and leaves the menu open, though its rows stop the click.
export const MenuClickClosesTheChoices: Story = {
  play: async ({ userEvent }) => {
    const { menu, choices } = await openChoices(userEvent, 'Fruit');

    await userEvent.click(
      within(menu).getByRole('button', { name: /^Vegetable,/ }),
    );

    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await expect(
      await page.findByRole('dialog', { name: 'Select Vegetable' }),
    ).toBeVisible();
    await expect(menu).toHaveAttribute(openState, 'open');
  },
};

// After a kept-open pick, Escape closes the choices and their menu together and focus returns to the menu's trigger.
export const KeepOpenEscapeClosesBoth: Story = {
  play: async ({ userEvent }) => {
    const { menu, choices } = await openChoices(userEvent, 'Fruit');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Banana' }),
    );
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(choices).not.toBeInTheDocument());
    await waitFor(() => expect(menu).not.toBeInTheDocument());
    await waitFor(() =>
      expect(page.getByRole('button', { name: 'Configure' })).toHaveFocus(),
    );
  },
};

// Paper's drilled row: the choices open beside the menu with no title of their own.
export const RowChoicesHaveNoTitle: Story = {
  play: async ({ userEvent }) => {
    const { choices } = await openChoices(userEvent, 'Fruit');
    const apple = within(choices).getByRole('button', { name: 'Apple' });

    // The choices fade in from transparent, so a row shows once their entrance starts.
    await waitFor(() => expect(apple).toBeVisible());
    await expect(
      within(choices).queryByRole('heading'),
    ).not.toBeInTheDocument();
  },
};

// Without keepOpen, a pick closes the choices.
export const PickClosesChoicesByDefault: Story = {
  play: async ({ userEvent }) => {
    const { choices } = await openChoices(userEvent, 'Vegetable');

    await userEvent.click(
      within(choices).getByRole('button', { name: 'Leek' }),
    );

    await expect(picked.mock.calls).toEqual([['Leek']]);
    await expect(choices).toHaveAttribute(openState, 'closed');
    await waitFor(() => expect(choices).not.toBeInTheDocument());
  },
};
