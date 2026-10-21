import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StatusPlan } from './composer-plan';
import { completedPlan, runningPlan } from './composer-plan-fixtures';

const meta = {
  title: 'Composer/ComposerPlan',
  component: StatusPlan,
  args: runningPlan,
  argTypes: { entries: { control: false }, disabled: { control: 'boolean' } },
} satisfies Meta<typeof StatusPlan>;

export default meta;

type Story = StoryObj<typeof meta>;

// A step under way: the trigger names it, and the marks before it are filled.
export const Running: Story = { args: runningPlan };

// Every step done: all the marks fill and the trigger names no step.
export const Done: Story = { args: completedPlan };
