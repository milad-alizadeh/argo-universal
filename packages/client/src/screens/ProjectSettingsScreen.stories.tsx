import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProjectSettingsScreen } from './PlaceholderScreens';

const meta = {
  title: 'Screens/ProjectSettingsScreen',
  component: ProjectSettingsScreen,
  parameters: { screenPreview: true },
  args: { name: 'Example Project' },
} satisfies Meta<typeof ProjectSettingsScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'ProjectSettingsScreen',
};
