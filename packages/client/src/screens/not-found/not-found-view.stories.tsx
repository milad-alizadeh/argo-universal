import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { NotFoundView } from './not-found-view';

const meta = {
  title: 'Screens/NotFound/Not found',
  component: NotFoundView,
  argTypes: { onLeave: { control: false } },
  parameters: { screenPreview: true },
  args: { onLeave: action('leave') },
} satisfies Meta<typeof NotFoundView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
