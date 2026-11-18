import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { PairSheetView } from './pair-sheet-view';

const meta = {
  title: 'Tests/Screens/Settings/PairSheetView',
  component: PairSheetView,
  parameters: { screenPreview: true },
  args: {
    kind: 'denied',
    serverName: 'Studio',
    onOpenSettings: fn(),
    onBack: fn(),
    onTryAgain: fn(),
    onCancel: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta<typeof PairSheetView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OffOpensSettingsOrGoesBack: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText(/Studio/)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Settings' }),
    );
    await expect(args.onOpenSettings).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Servers' }),
    );
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

// A build that cannot browse has no setting to open: back is its only way on.
export const MisconfiguredOffersOnlyBack: Story = {
  args: { kind: 'misconfigured' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByText('_argo._tcp')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Back to Servers' }),
    );
    await expect(args.onBack).toHaveBeenCalledOnce();
  },
};

export const UndeterminedCanTryAgain: Story = {
  args: { kind: 'undetermined' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Try Again' }));
    await expect(args.onTryAgain).toHaveBeenCalledWith('');
  },
};

// The look can be stopped, and shows it is working.
export const FindingOffersCancel: Story = {
  args: { kind: 'finding' },
  play: async ({ canvas, args, userEvent }) => {
    await expect(await canvas.findByRole('progressbar')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
  },
};

export const TryAgainSendsTheTypedAddress: Story = {
  args: { kind: 'not-found' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Address' }),
      'studio-mac.local:4000',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Try Again' }));
    await expect(args.onTryAgain).toHaveBeenCalledWith('studio-mac.local:4000');
  },
};

export const ScanAgainLeavesTheAddress: Story = {
  args: { kind: 'not-found' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Scan Again' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onTryAgain).not.toHaveBeenCalled();
  },
};
