import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { CodeScanner } from './code-scanner';
import { cameraFailed, waiting } from './code-scanner-fixtures';

// App-only, so it has no Contracts schema for a props table to read.
const meta = {
  title: 'Design System/Primitives/Content/CodeScanner',
  component: CodeScanner,
  tags: ['!autodocs'],
} satisfies Meta<typeof CodeScanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Waiting: Story = { args: waiting };

// A long notice wraps on the chip instead of running off the frame.
export const CameraFailed: Story = { args: cameraFailed };
