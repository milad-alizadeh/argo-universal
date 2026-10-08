import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ScrollFadePreview } from '../../mocks/scroll-fade-preview';
import { ScrollFadeView } from './scroll-fade';

const meta = {
  title: 'Design System/Components/ScrollFade',
  component: ScrollFadeView,
} satisfies Meta<typeof ScrollFadeView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  name: 'ScrollFade',
  render: () => <ScrollFadePreview />,
};
