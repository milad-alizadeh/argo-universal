import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { IssuesScreen } from './issues-screen';

const meta = {
  title: 'Screens/Issues/Issues',
  component: IssuesScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof IssuesScreen>;

export default meta;

export const Issues: StoryObj<typeof meta> = {};
