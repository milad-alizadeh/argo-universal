import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { ScanCodeView } from './scan-code-view';

const meta = {
  title: 'Tests/Screens/Settings/ScanCodeView',
  component: ScanCodeView,
  parameters: { screenPreview: true },
  args: { access: 'ask', onContinue: fn(), onOpenSettings: fn() },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<typeof ScanCodeView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The camera is asked for from this page and nowhere before it.
export const ContinueAsksForTheCamera: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(args.onContinue).toHaveBeenCalledOnce();
    await expect(args.onOpenSettings).not.toHaveBeenCalled();
  },
};

export const RefusedLeadsToSettings: Story = {
  args: { access: 'refused' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.queryByRole('button', { name: 'Continue' })).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Settings' }),
    );
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
  },
};
