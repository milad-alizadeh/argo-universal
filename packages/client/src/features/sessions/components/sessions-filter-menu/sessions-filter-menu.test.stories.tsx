import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { eachLayout } from '../../../../lib/generic/each-layout';
import { SessionsFilterMenu } from './sessions-filter-menu';

const onArchivedChange = fn();

const onLayoutChange = fn();

const meta = {
  title: 'Tests/SessionsFilterMenu',
  component: SessionsFilterMenu,
  args: {
    archived: false,
    onArchivedChange,
    layout: 'regular',
    onLayoutChange,
  },
  beforeEach: (): void => {
    onArchivedChange.mockClear();
    onLayoutChange.mockClear();
  },
} satisfies Meta<typeof SessionsFilterMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const menu = (): ReturnType<typeof within> => within(document.body);

const trigger = { name: 'Filter Sessions' };

export const ChoosesArchived: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onArchivedChange.mockClear();
      await userEvent.click(canvas.getByRole('button', trigger));
      await userEvent.click(
        menu().getByRole('menuitemradio', { name: 'Archived' }),
      );
      await expect(onArchivedChange).toHaveBeenCalledWith(true);
      await expect(onLayoutChange).not.toHaveBeenCalled();
    }),
};

export const ChoosesActive: Story = {
  args: { archived: true },
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onArchivedChange.mockClear();
      await userEvent.click(canvas.getByRole('button', trigger));
      await userEvent.click(
        menu().getByRole('menuitemradio', { name: 'Active' }),
      );
      await expect(onArchivedChange).toHaveBeenCalledWith(false);
    }),
};

// The Layout group sits under its heading, Regular checked, and choosing Compact leaves the filter alone.
export const ChoosesCompact: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onLayoutChange.mockClear();
      await userEvent.click(canvas.getByRole('button', trigger));
      await expect(menu().getByText('Layout')).toBeVisible();
      await expect(
        menu().getByRole('menuitemradio', { name: 'Regular' }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(
        menu().getByRole('menuitemradio', { name: 'Active' }),
      ).toHaveAttribute('aria-checked', 'true');
      await userEvent.click(
        menu().getByRole('menuitemradio', { name: 'Compact' }),
      );
      await expect(onLayoutChange).toHaveBeenCalledWith('compact');
      await expect(onArchivedChange).not.toHaveBeenCalled();
    }),
};
