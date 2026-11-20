/// <reference types="@vitest/browser-playwright" />
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { cdp } from 'vitest/browser';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  rehearsedConnectMilliseconds,
  VoiceCallRehearsal,
} from './session-detail-view-conversation.mocks';
import { voiceCallSession } from './session-detail-view-conversation.mocks';
import { longSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Voice',
  parameters: { screenPreview: true },
  render: (): React.JSX.Element => (
    <FramedSessionPreview
      state="open"
      {...voiceCallSession}
      feed={longSession.feed}
    />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const composerColumnId = 'composer-column';

const bandId = 'voice-edge-band';

// The band runs along the Composer's top edge for the length of the call, and the Feed scrolls above it.
export const BandStaysInTheComposer: Story = {
  play: async ({ canvas }) => {
    await settleLayout(1440);
    const band = await canvas.findByTestId(bandId);
    const column = canvas.getByTestId(composerColumnId);

    await expect(canvas.getByText('Listening')).toBeInTheDocument();
    await expect(canvas.getByText('4:12')).toBeInTheDocument();
    await expect(column).toContainElement(band);
    await expect(canvas.queryByTestId('voice-stage')).not.toBeInTheDocument();
  },
};

// The Composer on the call invites typing as well as talking.
export const FieldInvitesTyping: Story = {
  play: async ({ canvas }) => {
    await settleLayout(1440);
    await expect(
      await canvas.findByText('Type, or keep talking'),
    ).toBeInTheDocument();
  },
};

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const settled = { timeout: rehearsedConnectMilliseconds + 2000 };

// The voice button starts the call: the band opens while it connects, the call connects with its mutes, and End takes all of it away again.
async function startAndEnd(canvas: Canvas): Promise<void> {
  await settleLayout(1440);
  await expect(canvas.queryByTestId(bandId)).not.toBeInTheDocument();
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Start voice call' }),
  );
  const band = within(await canvas.findByTestId(bandId));

  await band.findByText('Connecting…');
  await band.findByText('Listening', undefined, settled);

  const microphone = await canvas.findByRole('button', {
    name: 'Mute microphone',
  });

  await waitFor(() => expect(microphone).toBeVisible());
  await userEvent.click(canvas.getByRole('button', { name: 'End' }));
  await waitFor(() =>
    expect(canvas.queryByTestId(bandId)).not.toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(
      canvas.queryByRole('button', { name: 'Mute microphone' }),
    ).not.toBeInTheDocument(),
  );
  await expect(
    canvas.getByRole('button', { name: 'Start voice call' }),
  ).toBeInTheDocument();
}

export const BandComesAndGoesWithTheCall: Story = {
  render: (): React.JSX.Element => <VoiceCallRehearsal />,
  play: ({ canvas }) => startAndEnd(canvas),
};

// Under reduced motion the band and the mutes only fade, and still arrive and leave.
export const BandComesAndGoesWithReducedMotion: Story = {
  render: (): React.JSX.Element => <VoiceCallRehearsal />,
  beforeEach: async () => {
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });

    return async (): Promise<void> => {
      await cdp().send('Emulation.setEmulatedMedia', { features: [] });
    };
  },
  play: ({ canvas }) => startAndEnd(canvas),
};
