import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { withStack } from '#story-stack';
import { Page } from './index';
import {
  DetailPage,
  HeaderActionsPage,
  PushPage,
  SettingsPage,
} from './page-stack.mocks';

/*
 * Each story draws a real navigation stack (`withStack`): a phone shows the stack's header with the Page's title,
 * buttons and overflow menu, and a pushed page shows Back. A wide window draws the Page's own heading instead.
 */
const meta = {
  title: 'Design System/Primitives/Scaffolds/Page/Stack',
  component: Page,
  args: { title: 'Title' },
  argTypes: kitArgTypes('Page'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderActionsAndOverflow: Story = {
  decorators: [withStack()],
  render: () => <HeaderActionsPage />,
};

export const PushedPage: Story = {
  decorators: [withStack({ detail: DetailPage })],
  render: () => <PushPage />,
};

export const FieldGroupSettings: Story = {
  decorators: [withStack()],
  render: () => <SettingsPage />,
};
