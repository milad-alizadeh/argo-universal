import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AtlasScreen } from './placeholder-screens';

const meta = {
  title: 'Screens/AtlasScreen',
  component: AtlasScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AtlasScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'AtlasScreen' };
