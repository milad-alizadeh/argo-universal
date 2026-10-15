import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Combobox } from './combobox';

const changed = fn<(value: string) => void>();

const options = [
  { value: 'argo', label: 'Argo', supporting: '~/Developer/argo' },
  { value: 'paper', label: 'Paper', supporting: '~/Developer/design-sync' },
  {
    value: 'locked',
    label: 'Locked',
    supporting: 'design-sync',
    disabled: true,
  },
];

const meta = {
  title: 'Tests/Combobox',
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
        name: 'Search Project',
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
        page.getByRole('searchbox', { name: 'Search Project' }),
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
