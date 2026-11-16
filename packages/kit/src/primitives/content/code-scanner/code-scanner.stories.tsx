import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CodeScanner } from './code-scanner';
import { looking, refused } from './code-scanner-fixtures';

const meta = {
  title: 'Design System/Primitives/Content/CodeScanner',
  component: CodeScanner,
} satisfies Meta<typeof CodeScanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Looking: Story = { args: looking };

// A long notice wraps on the chip instead of running off the frame.
export const Refused: Story = { args: refused };
