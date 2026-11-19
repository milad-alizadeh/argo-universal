import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { FakeEnvironment } from '../../../../mocks/voice/fake-voice-environment';
import { callIn, statusOf } from '../utils/session-voice.test.mocks';
import { VoiceConnectionHost } from './desktop-voice-provider';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

// Each story gets its own browser stand-in and connection, so nothing leaks from one run into the next.
const app = {
  environment: new FakeEnvironment(),
  connection: createWebRtcVoiceConnection(new FakeEnvironment()),
};

const freshApp = (): void => {
  app.environment = new FakeEnvironment();
  app.connection = createWebRtcVoiceConnection(app.environment);
};

const endLabel = 'End the call on the Server';

// The App at its root with Settings shown and no Session page: the Server's call ends while the person is elsewhere.
function AppOnSettings(): React.JSX.Element {
  const [status, setStatus] = useState(statusOf(callIn('s1')));

  return (
    <VoiceConnectionHost connection={app.connection} status={status}>
      <Text>Settings</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setStatus(statusOf(null))}
      >
        <Text>{endLabel}</Text>
      </Pressable>
    </VoiceConnectionHost>
  );
}

const meta = {
  title: 'Tests/Voice/VoiceConnectionHost',
  component: AppOnSettings,
  beforeEach: freshApp,
} satisfies Meta<typeof AppOnSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

// A call that ends while no Session page is shown still releases the microphone.
export const ReleasesTheMicrophoneOffASessionPage: Story = {
  play: async ({ canvas, userEvent }) => {
    await app.connection.createOffer();
    await expect(app.environment.microphone.stopped).toBe(false);

    await userEvent.click(canvas.getByRole('button', { name: endLabel }));

    await waitFor(() => expect(app.environment.microphone.stopped).toBe(true));
    await expect(app.environment.peer.closed).toBe(true);
  },
};
