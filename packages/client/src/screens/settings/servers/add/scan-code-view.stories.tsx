import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { ScanCodeView } from './scan-code-view';
import { cameraFixture } from './scan-code-view-fixtures';

const meta = {
  title: 'Screens/Settings/ScanCodeView',
  component: ScanCodeView,
  parameters: { screenPreview: true },
  args: { access: 'ask', onContinue: fn(), onOpenSettings: fn() },
  argTypes: {
    access: { control: 'select', options: ['ask', 'refused', 'allowed'] },
    camera: { control: false },
    onContinue: { control: false },
    onOpenSettings: { control: false },
  },
} satisfies Meta<typeof ScanCodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The page the owner reaches from Add a Server: why the camera, before the system asks.
export const ExplainsBeforeAsking: Story = {};

export const CameraRefused: Story = { args: { access: 'refused' } };

export const CameraOn: Story = {
  args: { access: 'allowed', camera: cameraFixture },
};

// A phone can type the code instead; the button sits at the foot, as in the approved Scanning design.
export const CanEnterCodeInstead: Story = {
  args: { access: 'allowed', camera: cameraFixture, onEnterCode: fn() },
};
