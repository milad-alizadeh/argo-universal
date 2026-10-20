import {
  runListRoot,
  emptyRunListRoot,
  counterRoot,
  counterTapEvent,
  slottedRow,
  invalidPropsRoot,
  unknownNodesRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import { PluginTree } from './plugin-registry';

const onEvent = fn();

const meta = { title: 'Tests/Plugin registry' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tap: Story = {
  render: () => <PluginTree root={counterRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Counter fixture')).toBeVisible();
    await expect(canvas.getByText('Healthy')).toBeVisible();
    await expect(canvas.getByText('Waiting jobs')).toBeVisible();
    await expect(canvas.getByText('3')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('0/4/0', {
      event: counterTapEvent,
    });
  },
};

export const UnknownNodes: Story = {
  render: () => <PluginTree root={unknownNodesRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Before')).toBeVisible();
    await expect(canvas.getByText('After')).toBeVisible();
    await expect(canvas.getByText(/Update Argo/)).toBeVisible();
    await expect(canvas.queryByText('Inside')).toBeNull();
    await expect(canvas.queryByText('Sparkline')).toBeNull();
  },
};

export const InvalidProps: Story = {
  render: () => <PluginTree root={invalidPropsRoot} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Still here')).toBeVisible();
    await expect(canvas.queryByText('42')).toBeNull();
  },
};

export const Slots: Story = {
  render: () => <PluginTree root={slottedRow} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('First')).toBeVisible();
    await expect(canvas.getByText('Second')).toBeVisible();
    await expect(canvas.getByText('Count 0')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));
    await expect(onEvent).toHaveBeenCalledWith('row#trailing/button', {
      event: 'onPress',
    });
  },
};

export const RefusedPage: Story = {
  render: () => <PluginTree root={pluginPageFallback} onEvent={onEvent} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/could not be displayed/)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const ListAnatomy: Story = {
  parameters: { screenPreview: true },
  render: () => <PluginDetailView root={runListRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('CI runs')).toBeVisible();
    await expect(canvas.getByText('main')).toBeVisible();
    await expect(canvas.getByText('2/5 jobs')).toBeVisible();
    await expect(canvas.getByText('Production')).toBeVisible();
    await expect(canvas.getByText('now')).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Deploy web' }));
    await expect(onEvent).toHaveBeenCalledWith('runs/builds/web', {
      event: 'onPress',
    });
  },
};

export const EmptyList: Story = {
  parameters: { screenPreview: true },
  render: () => <PluginDetailView root={emptyRunListRoot} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No runs yet' }),
    ).toBeVisible();
    await expect(canvas.getByText('New CI runs appear here.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Run workflow' }));
    await expect(onEvent).toHaveBeenCalledWith(
      'empty-runs#empty/empty-state#action/run-workflow',
      { event: 'onPress' },
    );
  },
};
