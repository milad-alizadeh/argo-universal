import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { ChoiceFilter } from './action-list-choice.mocks';

const choose = fn();

const meta = { title: 'Tests/ActionList/Choice' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Menu = ReturnType<typeof within>;

// Each Section under its title, in order, only its chosen option checked.
async function expectChoices(menu: Menu, status: string): Promise<void> {
  // The menu fades in.
  await waitFor(() => expect(menu.getByText('Status')).toBeVisible());
  await expect(menu.getByText('Layout')).toBeVisible();

  const options = [
    ['Active', status === 'Active'],
    ['Archived', status === 'Archived'],
    ['Regular', true],
    ['Compact', false],
  ] as const;

  const rows = options.map(([name]) =>
    menu.getByRole('menuitemradio', { name }),
  );

  await expect(menu.getAllByRole('menuitemradio')).toEqual(rows);

  for (const [index, [, checked]] of options.entries())
    await expect(rows[index]).toHaveAttribute('aria-checked', String(checked));
}

function choiceSubmenu(width: number, status: string): Story {
  return {
    render: () => (
      <ChoiceFilter
        chosen={{ Status: status, Layout: 'Regular' }}
        onChoose={(_section, option) => choose(option)}
      />
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
      choose.mockClear();
      await settleViewport(width);
      const name = status === 'Active' ? 'Filter' : 'Filter, Changed';
      await userEvent.click(canvas.getByRole('button', { name }));
      const page = within(canvasElement.ownerDocument.body);
      const menu = within(await page.findByRole('menu'));
      await expectChoices(menu, status);

      await userEvent.click(
        menu.getByRole('menuitemradio', { name: 'Compact' }),
      );
      await expect(choose).toHaveBeenCalledTimes(1);
      await expect(choose).toHaveBeenLastCalledWith('Compact');
    },
  };
}

export const ChoiceSubmenuWide = choiceSubmenu(layoutWidths.wide, 'Active');

export const ChoiceSubmenuPhone = choiceSubmenu(layoutWidths.phone, 'Active');

export const ChoiceSubmenuChanged = choiceSubmenu(
  layoutWidths.wide,
  'Archived',
);
