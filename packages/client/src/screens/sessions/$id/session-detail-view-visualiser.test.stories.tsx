import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect } from 'storybook/test';
import { VisualiserChoosingPreview } from './session-detail-view-visualiser.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Visualiser',
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// Choosing Band empties the stage but for the toggle and draws the call along the Composer; choosing back restores it.
export const BandAlongTheComposer: Story = {
  render: (): React.JSX.Element => <VisualiserChoosingPreview first="orb" />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1440);
    await userEvent.click(await canvas.findByRole('button', { name: 'Band' }));
    await expect(await canvas.findByTestId('voice-edge-band')).toBeVisible();
    await expect(
      canvas.queryByTestId('voice-visualiser'),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Matrix' }));
    await expect(
      await canvas.findByTestId('voice-visualiser-matrix'),
    ).toBeVisible();
    await expect(
      canvas.queryByTestId('voice-edge-band'),
    ).not.toBeInTheDocument();
  },
};
