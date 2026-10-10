import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollFadeView } from './scroll-fade';
import { ScrollFadePreview } from './scroll-fade-preview.mocks';

const meta = {
  title: 'Shared/ScrollFade',
  component: ScrollFadeView,
} satisfies Meta<typeof ScrollFadeView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ScrollFade',
  render: () => <ScrollFadePreview />,
};
