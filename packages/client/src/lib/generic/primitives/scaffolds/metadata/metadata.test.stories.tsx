import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { Metadata } from './metadata';
import { fields } from './metadata.mocks';

const meta = {
  title: 'Tests/Metadata',
  component: Metadata,
  args: {
    rows: [
      { title: 'Path', value: { kind: 'text', text: '~/Developer/argo' } },
    ],
  },
} satisfies Meta<typeof Metadata>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ReadsText: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Path, ~/Developer/argo' }),
    ).toBeVisible();
    await expect(canvas.getByText('Path')).toBeVisible();
    await expect(canvas.getByText('~/Developer/argo')).toBeVisible();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const ReadsMixedValues: Story = {
  args: { rows: fields },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Device, Milad’s MacBook Pro' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', {
        name: 'Labels, bug, area/sync, good first issue, desktop, needs-review, p2',
      }),
    ).toBeVisible();
    await expect(canvas.getByText('good first issue')).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Status, In progress' }),
    ).toBeVisible();
    await expect(canvas.getByText('In progress')).toBeVisible();
    await expect(canvas.getByText('Passed')).toBeVisible();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
};

export const EmptyHasNoFields: Story = {
  args: { title: 'Unused heading', rows: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Unused heading')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('group')).not.toBeInTheDocument();
  },
};

export const EmptyValuesKeepTheirLabels: Story = {
  args: {
    title: 'Details',
    rows: [
      { title: 'Milestone', value: { kind: 'text', text: '' } },
      { title: 'Labels', value: { kind: 'pills', pills: [] } },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Details')).toBeVisible();
    await expect(canvas.getByText('Milestone')).toBeVisible();
    await expect(canvas.getByText('Labels')).toBeVisible();
  },
};

export const PreservesSpokenPath: Story = {
  args: {
    rows: [
      {
        title: 'Path',
        value: { kind: 'text', text: '~/Developer/argo' },
        accessibilityLabel: '~/Developer/argo',
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: '~/Developer/argo' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('group', { name: 'Path, ~/Developer/argo' }),
    ).not.toBeInTheDocument();
  },
};
