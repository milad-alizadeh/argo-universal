import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Combobox } from './combobox';

const changed = fn<(value: string) => void>();

const searchLabel = 'Search Project';

const options = [
  { value: 'argo', label: 'Argo', subtitle: '~/Developer/argo' },
  { value: 'paper', label: 'Paper', subtitle: '~/Developer/design-sync' },
  {
    value: 'locked',
    label: 'Locked',
    subtitle: 'design-sync',
    disabled: true,
  },
];

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/Combobox',
  beforeEach: (): void => {
    changed.mockClear();
  },
  render: (): React.JSX.Element => <Example />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Example(): React.JSX.Element {
  const [value, setValue] = useState('argo');

  return (
    <Combobox
      label="Project"
      value={value}
      options={options}
      onValueChange={(next) => {
        setValue(next);
        changed(next);
      }}
    />
  );
}

function searchAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent }) => {
      const page = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Project' }));

      const search = await page.findByRole('searchbox', {
        name: searchLabel,
      });

      await userEvent.type(search, 'design-sync');
      await expect(page.queryByRole('radio', { name: 'Argo' })).toBeNull();
      await expect(page.getByRole('radio', { name: 'Locked' })).toBeDisabled();
      await expect(changed).not.toHaveBeenCalled();
      await userEvent.keyboard('{ArrowDown}{Enter}');
      await expect(changed).toHaveBeenCalledTimes(1);
      await expect(changed).toHaveBeenCalledWith('paper');
      await expect(
        await canvas.findByRole('button', { name: 'Project' }),
      ).toHaveTextContent('Paper');
      await userEvent.click(canvas.getByRole('button', { name: 'Project' }));
      await expect(
        await page.findByRole('radio', { name: 'Paper' }),
      ).toHaveAttribute('aria-checked', 'true');
      await userEvent.type(
        page.getByRole('searchbox', { name: searchLabel }),
        'missing',
      );
      await expect(page.getByRole('status')).toHaveTextContent(
        'No matching options',
      );
      await userEvent.keyboard('{Escape}');
      await expect(changed).toHaveBeenCalledTimes(1);
    },
  };
}

export const SearchInPopover = searchAt(layoutWidths.wide);

export const SearchInSheet = searchAt(layoutWidths.phone);

// From the search, the arrow keys, Home and End move through the choices and pass over a disabled one.
export const ArrowKeysMoveThroughChoices: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Project' }));
    await page.findByRole('searchbox', { name: searchLabel });

    const argo = page.getByRole('radio', { name: 'Argo' });
    const paper = page.getByRole('radio', { name: 'Paper' });

    const down = '{ArrowDown}';

    await userEvent.keyboard(down);
    await expect(argo).toHaveFocus();
    await userEvent.keyboard(down);
    await expect(paper).toHaveFocus();
    await userEvent.keyboard(down);
    await expect(paper).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(argo).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(argo).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(paper).toHaveFocus();
    await userEvent.keyboard('{Escape}');
  },
};

// The popover opens beside its trigger, inside the window, where the pointer can reach it.
export const PopoverOpensAtTrigger: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Project' });
    await userEvent.click(trigger);

    const search = await within(document.body).findByRole('searchbox', {
      name: searchLabel,
    });

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(inWindow(search)).toBe(true));
    await userEvent.keyboard('{Escape}');
  },
};

function inWindow(element: Element): boolean {
  const box = element.getBoundingClientRect();

  return [
    box.top >= 0,
    box.left >= 0,
    box.bottom <= window.innerHeight,
    box.right <= window.innerWidth,
  ].every(Boolean);
}
