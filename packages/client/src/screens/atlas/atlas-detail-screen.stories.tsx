import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AtlasDetailScreen } from './atlas-detail-screen';

const meta = {
  title: 'Screens/Atlas/Atlas',
  component: AtlasDetailScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof AtlasDetailScreen>;

export default meta;

export const Atlas: StoryObj<typeof meta> = {};
