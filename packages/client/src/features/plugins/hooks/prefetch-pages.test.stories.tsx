import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { NavDrawMock, RouteDrawMock } from './prefetch-pages.mocks';

const meta = {
  title: 'Tests/Plugins/PrefetchPages',
  component: RouteDrawMock,
} satisfies Meta<typeof RouteDrawMock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeepLinkDrawsBeforeTheListAnswers: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        'Drew before the list answered: tracker /issues/42',
      ),
    ).toBeVisible();
  },
};

export const NavItemsDrawOnceTheListAnswers: Story = {
  render: () => <NavDrawMock />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('Drew before the list answered:'),
    ).toBeVisible();
    await expect(
      await canvas.findByText('Drew after: tracker /issues,tracker /plans'),
    ).toBeVisible();
  },
};
