import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { StatusTodos } from './composer-todos';
import { completedTodos, runningTodos } from './composer-todos-fixtures';

const meta = {
  title: 'Composer/ComposerTodos',
  component: StatusTodos,
  args: runningTodos,
  argTypes: { entries: { control: false }, disabled: { control: 'boolean' } },
} satisfies Meta<typeof StatusTodos>;

export default meta;

type Story = StoryObj<typeof meta>;

// A step under way: the trigger names it, and the marks before it are filled.
export const Running: Story = { args: runningTodos };

// Every step done: all the marks fill and the trigger names no step.
export const Done: Story = { args: completedTodos };
