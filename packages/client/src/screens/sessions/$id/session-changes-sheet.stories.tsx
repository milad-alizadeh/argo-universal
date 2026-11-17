import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ChangesSheet, changedFiles } from './session-changes-sheet.mocks';

const meta = {
  title: 'Screens/Sessions/Session/ChangesSheet',
  component: ChangesSheet,
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  globals: { mode: 'light', viewport: { value: 'phone' } },
  args: { catalog: changedFiles },
} satisfies Meta<typeof ChangesSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// A phone's Changes sheet: the Checkout's changed files alone.
export const FilesOnly: Story = {};
