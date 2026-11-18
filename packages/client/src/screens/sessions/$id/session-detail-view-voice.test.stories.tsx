import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor } from 'storybook/test';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { voiceCallSession } from './session-detail-view-voice.mocks';
import { longSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/VoiceCall',
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
    const scroll = await canvas.findByTestId('feed-scroll');
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
