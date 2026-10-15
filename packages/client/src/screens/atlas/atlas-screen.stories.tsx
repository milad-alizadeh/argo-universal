import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AtlasScreen } from './atlas-screen';

const meta = {
  title: 'Screens/Atlas/Atlas',
  component: AtlasScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AtlasScreen>;

export default meta;

export const Atlas: StoryObj<typeof meta> = {};
