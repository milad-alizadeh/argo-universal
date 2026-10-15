import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { IssueListScreen } from './issue-list-screen';

const meta = {
  title: 'Screens/Issues/Issues',
  component: IssueListScreen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof IssueListScreen>;

export default meta;

export const Issues: StoryObj<typeof meta> = {};
