import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { eachLayout } from '../../../lib/generic/each-layout';
import { SessionsFilterMenu } from './sessions-filter-menu';

const onArchivedChange = fn();

const meta = {
  title: 'Tests/SessionsFilterMenu',
  component: SessionsFilterMenu,
  args: { archived: false, onArchivedChange },
  beforeEach: (): void => {
    onArchivedChange.mockClear();
  },
} satisfies Meta<typeof SessionsFilterMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChoosesArchived: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onArchivedChange.mockClear();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Archived' }),
      );
      await expect(onArchivedChange).toHaveBeenCalledWith(true);
    }),
};

export const ChoosesActive: Story = {
  args: { archived: true },
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      onArchivedChange.mockClear();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Filter Sessions' }),
      );
      await userEvent.click(
        within(document.body).getByRole('menuitemradio', { name: 'Active' }),
      );
      await expect(onArchivedChange).toHaveBeenCalledWith(false);
    }),
};
