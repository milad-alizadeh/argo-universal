import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AtlasScreen, IssuesScreen } from './placeholder-screens';

const meta = {
  title: 'Screens/PlaceholderScreens',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Issues: Story = { render: () => <IssuesScreen /> };

export const Atlas: Story = { render: () => <AtlasScreen /> };
