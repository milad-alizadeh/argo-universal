import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StatusPlan } from './composer-plan';

const meta = {
  title: 'Composer/ComposerPlan',
  component: StatusPlan,
  args: {
    disabled: false,
    entries: [
      {
        content: 'Read the Sheet primitive',
        priority: 'medium',
        status: 'completed',
      },
      {
        content: 'Move each phone sheet into grouped cards',
        priority: 'medium',
        status: 'in_progress',
      },
      {
        content: 'Compare the sheets with Paper on iOS and Android',
        priority: 'medium',
        status: 'pending',
      },
    ],
  },
} satisfies Meta<typeof StatusPlan>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plan: Story = {};
