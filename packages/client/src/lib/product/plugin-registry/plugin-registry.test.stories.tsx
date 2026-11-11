import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import {
  runListRoot,
  emptyRunListRoot,
  counterRoot,
  slottedRow,
  invalidPropsRoot,
  unknownNodesRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PluginDetailView } from '../../../screens/plugins/$path/plugin-detail-view';
import { PluginTree } from './plugin-registry';

const onPageCall = fn(async () => {});

const from = (key: string): PageEvent =>
  expect.objectContaining({ key, name: 'onPress' });

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Tap: Story = {
  render: () => <PluginTree root={counterRoot} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Counter fixture')).toBeVisible();
    await expect(canvas.getByText('Healthy')).toBeVisible();
    await expect(canvas.getByText('Waiting jobs')).toBeVisible();
    await expect(canvas.getByText('3')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Tap me' }));
    await expect(onPageCall).toHaveBeenCalledOnce();
    await expect(onPageCall).toHaveBeenCalledWith(
      { pageState: { taps: 1 } },
      from('0/4/0'),
    );
  },
};

export const UnknownNodes: Story = {
  render: () => <PluginTree root={prepareWireTree(unknownNodesRoot)} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Before')).toBeVisible();
    await expect(canvas.getByText('After')).toBeVisible();
    await expect(canvas.getByText(/Update Argo/)).toBeVisible();
    await expect(canvas.queryByText('Inside')).toBeNull();
    await expect(canvas.queryByText('Sparkline')).toBeNull();
  },
};

export const InvalidProps: Story = {
  render: () => <PluginTree root={prepareWireTree(invalidPropsRoot)} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Still here')).toBeVisible();
    await expect(canvas.queryByText('42')).toBeNull();
  },
};

export const Slots: Story = {
  render: () => <PluginTree root={slottedRow} onPageCall={onPageCall} />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('First')).toBeVisible();
    await expect(canvas.getByText('Second')).toBeVisible();
    await expect(canvas.getByText('Count 0')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { pageState: { count: 1 } },
      from('row#trailing/button'),
    );
  },
};

export const RefusedPage: Story = {
  render: () => <PluginTree root={pluginPageFallback} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/could not be displayed/)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

export const ListAnatomy: Story = {
  parameters: { screenPreview: true },
  render: () => (
    <PluginDetailView root={runListRoot} callbacks={{ onPageCall }} />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText('CI runs')).toBeVisible();
    await expect(canvas.getByText('main')).toBeVisible();
    await expect(canvas.getAllByText('2/5 jobs')[0]).toBeVisible();
    await expect(canvas.getAllByText('Production')[0]).toBeVisible();
    await expect(canvas.getAllByText('now')[0]).toBeVisible();
    await expect(canvas.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Deploy web' }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { pageState: { run: 'web' } },
      from('runs/builds/web'),
    );
  },
};

export const EmptyList: Story = {
  parameters: { screenPreview: true },
  render: () => (
    <PluginDetailView root={emptyRunListRoot} callbacks={{ onPageCall }} />
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'No runs yet' }),
    ).toBeVisible();
    await expect(canvas.getByText('New CI runs appear here.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Run workflow' }));
    await expect(onPageCall).toHaveBeenCalledWith(
      { operation: 'runWorkflow', args: {} },
      from('empty-runs#empty/empty-state#action/run-workflow'),
    );
  },
};
