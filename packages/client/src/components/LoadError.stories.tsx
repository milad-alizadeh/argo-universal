import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { LoadError } from './LoadError';

const meta = {
  title: 'Shared/LoadError',
  component: LoadError,
  args: {
    title: "Couldn't load Sessions",
    description:
      "The Server didn't respond. Check that it's running, then retry.",
    onRetry: action('retry'),
  },
} satisfies Meta<typeof LoadError>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'LoadError' };
