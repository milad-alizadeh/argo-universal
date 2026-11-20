/// <reference types="@vitest/browser-playwright" />
import { reduceMotion } from '@repo/kit/mocks/reduced-motion';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { voiceStageRoomId } from '#features/voice';
import { feedScrollId } from '../../../features/feed/components/feed/feed-reader.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  rehearsedConnectMilliseconds,
  VoiceCallRehearsal,
} from './session-detail-view-voice-call.mocks';
import { voiceCallSession } from './session-detail-view-voice.mocks';
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

// The orb stays above the Feed for the length of the call, and the Feed scrolls beneath it.
export const OrbStaysPinned: Story = {
  play: async ({ canvas }) => {
    await settleLayout(1440);
    const stage = await canvas.findByTestId('voice-stage');
    const scroll = await canvas.findByTestId(feedScrollId);
    const pinned = stage.getBoundingClientRect().top;
    await expect(canvas.getByText('Listening')).toBeInTheDocument();
    await expect(canvas.getByText('Voice · 4:12')).toBeInTheDocument();
    scroll.scrollTop = scroll.scrollHeight;
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
    await expect(stage.getBoundingClientRect().top).toBe(pinned);
    await expect(stage.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      scroll.getBoundingClientRect().top + 1,
    );
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

// The room above the Feed has opened to the whole stage, and the orb and its label are fully drawn.
async function expectStageIn(canvas: Canvas): Promise<void> {
  const room = await canvas.findByTestId(voiceStageRoomId);
  const stage = canvas.getByTestId('voice-stage');

  await waitFor(async () => {
    const opened = room.getBoundingClientRect().height;

    await expect(opened).toBeGreaterThan(0);
    await expect(opened).toBeCloseTo(stage.getBoundingClientRect().height, 0);
  });
  await waitFor(() =>
    expect(canvas.getByRole('img', { name: /^Voice / })).toBeVisible(),
  );
}

// The voice button starts the call: the stage opens while it connects, the call connects with its mutes, and End takes all of it away again.
async function startAndEnd(canvas: Canvas): Promise<void> {
  await settleLayout(1440);
  await expect(canvas.queryByTestId(voiceStageRoomId)).not.toBeInTheDocument();
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Start voice call' }),
  );
  await canvas.findByRole('img', { name: 'Voice not connected' });
  await expectStageIn(canvas);
  await canvas.findByRole('img', { name: 'Voice listening' }, settled);
  await expectStageIn(canvas);

  const microphone = await canvas.findByRole('button', {
    name: 'Mute microphone',
  });

  await waitFor(() => expect(microphone).toBeVisible());
  await userEvent.click(canvas.getByRole('button', { name: 'End' }));
  await waitFor(() =>
    expect(canvas.queryByTestId(voiceStageRoomId)).not.toBeInTheDocument(),
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

export const StageComesAndGoesWithTheCall: Story = {
  render: (): React.JSX.Element => <VoiceCallRehearsal />,
  play: ({ canvas }) => startAndEnd(canvas),
};

// Under reduced motion the stage and the mutes only fade, and still arrive and leave.
export const StageComesAndGoesWithReducedMotion: Story = {
  render: (): React.JSX.Element => <VoiceCallRehearsal />,
  beforeEach: reduceMotion,
  play: ({ canvas }) => startAndEnd(canvas),
};
