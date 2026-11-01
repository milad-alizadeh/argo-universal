import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { TypeCodeView } from './type-code-view';

const meta = {
  title: 'Screens/Settings/TypeCodeView',
  component: TypeCodeView,
  parameters: { screenPreview: true },
  args: { onSubmit: fn() },
  argTypes: {
    looking: { control: 'boolean' },
    onSubmit: { control: false },
  },
} satisfies Meta<typeof TypeCodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The page a desktop with no camera reaches from Add a Server: the code under the other computer's picture, typed.
export const AsksForTheCode: Story = {};

// The code has gone out to the Servers on the network, and the field keeps what was typed.
export const Looking: Story = { args: { looking: true } };

// On a phone the way back to the camera sits under Connect.
export const CanScanInstead: Story = { args: { onScan: fn() } };
