import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AuthRequiredCard } from './auth-required-card';

const meta = {
  title: 'Sessions/AuthRequiredCard',
  component: AuthRequiredCard,
  args: {
    description: 'Your ChatGPT session expired. Sign in again to continue.',
    onAuthenticate: (): void => {},
  },
} satisfies Meta<typeof AuthRequiredCard>;

export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'AuthRequiredCard' };
