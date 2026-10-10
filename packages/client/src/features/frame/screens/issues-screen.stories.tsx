import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { IssuesScreen } from './placeholder-screens';

const meta = {
  title: 'Screens/IssuesScreen',
  component: IssuesScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof IssuesScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'IssuesScreen' };
