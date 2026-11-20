import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type * as React from 'react';
import { expect } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import {
  type SessionRowCall,
  SessionRowCallProvider,
} from './session-row-call';
import { mutedVoiceCall, voiceCall } from './session-row-call-fixtures';
import { idleSession } from './session-row-fixtures';

const meta = {
  ...sessionRowTestMeta,
  title: 'Tests/Sessions/SessionRow/Call',
  args: { ...sessionRowTestMeta.args, ...idleSession },
};

export default meta;

const onCall =
  (call: SessionRowCall) =>
  (Row: React.ComponentType): React.JSX.Element => (
    <SessionRowCallProvider value={call}>
      <Row />
    </SessionRowCallProvider>
  );

// A live call ends the row on its running time, and the row's name ends on the call.
export const LiveCall: Story = {
  decorators: [onCall(voiceCall)],
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('2:43')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: /, on a Voice call$/ }),
    ).toBeVisible();
  },
};

// Muted, the time gives way to "Muted", and the name says the mic is muted.
export const MutedCall: Story = {
  decorators: [onCall(mutedVoiceCall)],
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByText('Muted')).toBeVisible();
    await expect(canvas.queryByText('2:43')).toBeNull();
    await expect(
      canvas.getByRole('button', { name: /, on a Voice call, mic muted$/ }),
    ).toBeVisible();
  },
};

// A call still connecting is marked without a time, never a clock stuck at 0:00.
export const ConnectingCall: Story = {
  decorators: [onCall({ ...voiceCall, startedAt: null })],
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.getByTestId('session-call')).toBeVisible();
    await expect(canvas.queryByText('0:00')).toBeNull();
  },
};

// A call attached to another Session leaves this row as it was.
export const CallElsewhere: Story = {
  decorators: [onCall({ ...voiceCall, sessionId: 'another-session' })],
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    await expect(canvas.queryByTestId('session-call')).toBeNull();
    await expect(
      canvas.queryByRole('button', { name: /Voice call/ }),
    ).toBeNull();
  },
};
