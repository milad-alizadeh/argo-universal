import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { SharingMock, StaleMarkMock } from './page-addresses-mock.mocks';

const meta = {
  title: 'Tests/Plugins/PageAddresses',
  component: SharingMock,
} satisfies Meta<typeof SharingMock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SharedPerConnection: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Callers under one Connection share: true'),
    ).toBeVisible();
    await expect(
      canvas.getByText('Another tRPC client shares: false'),
    ).toBeVisible();
    await expect(
      canvas.getByText('Another QueryClient shares: false'),
    ).toBeVisible();
  },
};

export const MarkWaitsForAPagesDraw: Story = {
  render: () => <StaleMarkMock />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        'Mark waited: true; drew again after it landed: true; fresh rows: true',
      ),
    ).toBeVisible();
  },
};
