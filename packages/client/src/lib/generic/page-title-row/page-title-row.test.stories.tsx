import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PageTitleRow } from './page-title-row';

const meta = { title: 'Tests/PageTitleRow' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onBack = fn();

export const PageHeading: Story = {
  render: () => <PageTitleRow title="Projects" />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Projects' }),
    ).toBeVisible();
  },
};

export const TopLevelPageHasNoBack: Story = {
  render: () => <PageTitleRow title="Projects" />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
  },
};

export const BackReturns: Story = {
  render: () => <PageTitleRow title="argo-universal" onBack={onBack} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(onBack).toHaveBeenCalledOnce();
  },
};

export const OffersSearch: Story = {
  render: () => (
    <PageTitleRow
      title="Agents"
      search={{ label: 'Search Agents', value: '', onChangeText: () => {} }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'Search Agents' }),
    ).toBeVisible();
  },
};
