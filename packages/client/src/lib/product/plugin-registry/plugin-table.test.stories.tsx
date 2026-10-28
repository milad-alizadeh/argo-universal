import { runTableRoot } from '@repo/contracts/plugins/wire-fixtures';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const onEvent = fn(async () => {});

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Table',
  beforeEach: (): void => {
    onEvent.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawsAPluginTable: Story = {
  render: () => <PluginTree root={runTableRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const table = await canvas.findByRole('table', { name: 'CI runs' });

    await expect(within(table).getByText('Deploy web')).toBeVisible();
    await expect(within(table).getByText('Failed')).toBeVisible();

    await userEvent.click(
      within(table).getByRole('button', { name: 'Started, sorted descending' }),
    );

    await expect(onEvent).toHaveBeenCalledWith('runs', {
      event: 'onSortChange',
      payload: { column: 'time', direction: 'ascending' },
    });
  },
};

export const SendsTheSelection: Story = {
  render: () => <PluginTree root={runTableRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const row = await canvas.findByRole('row', { name: /^Test API/ });

    await userEvent.click(row);

    await expect(onEvent).toHaveBeenCalledWith('runs', {
      event: 'onSelectionChange',
      payload: ['api'],
    });
    await expect(row).toHaveAttribute('aria-selected', 'true');
  },
};

// A phone draws the same Plugin tree as a list, with no Plugin change.
export const PhoneDrawsAList: Story = {
  render: () => <PluginTree root={runTableRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await settleLayout('phone');

    await expect(await canvas.findByText('Deploy web')).toBeVisible();
    await expect(canvas.queryByRole('table')).toBeNull();
    await expect(
      canvas.getByRole('button', { name: /^Test API/ }),
    ).toBeVisible();
  },
};
