import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollFadeView } from './scroll-fade';
import {
  ScrollFadePreview,
  ScrollFadeRowPreview,
} from './scroll-fade-preview.mocks';

const meta = {
  title: 'Design System/Patterns/ScrollFade',
  component: ScrollFadeView,
} satisfies Meta<typeof ScrollFadeView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => <ScrollFadePreview />,
};

export const Horizontal: Story = {
  render: () => <ScrollFadeRowPreview />,
};
