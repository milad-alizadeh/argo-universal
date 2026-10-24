import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { kitArgTypes } from '#kit/kit-arg-types';
import { withStack } from '#story-stack';
import { Screen } from './index';
import {
  DetailScreen,
  HeaderActionsScreen,
  PushScreen,
  SettingsScreen,
} from './screen-stack.mocks';

/*
 * Each story draws a real navigation stack (`withStack`): a phone shows the stack's header with the Screen's title,
 * buttons and overflow menu, and a pushed page shows Back. A wide window draws the Screen's own heading instead.
 */
const meta = {
  title: 'Design System/Primitives/Scaffolds/Screen/Stack',
  component: Screen,
  args: { title: 'Title' },
  argTypes: kitArgTypes('Screen'),
  parameters: { screenPreview: true },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HeaderActionsAndOverflow: Story = {
  decorators: [withStack()],
  render: () => <HeaderActionsScreen />,
};

export const PushedScreen: Story = {
  decorators: [withStack({ detail: DetailScreen })],
  render: () => <PushScreen />,
};

export const FieldGroupSettings: Story = {
  decorators: [withStack()],
  render: () => <SettingsScreen />,
};
