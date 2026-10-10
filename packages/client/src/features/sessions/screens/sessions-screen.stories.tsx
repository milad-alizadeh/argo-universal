import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { sessionListMocks } from '../../../mocks/session-list-mock';
import { fails } from '../../../mocks/trpc-mock-link';
import { SessionsScreen } from './sessions-screen';
import { SessionsScreenPreview } from './sessions-screen-preview.mocks';

const meta = {
  title: 'Screens/SessionsScreen',
  component: SessionsScreen,
  parameters: { trpc: sessionListMocks, screenPreview: true },
  args: { query: '', archived: false },
  render: (): React.JSX.Element => <SessionsScreenPreview />,
} satisfies Meta<typeof SessionsScreen>;
export default meta;

export const Overview: StoryObj<typeof meta> = { name: 'SessionsScreen' };

let liveSubscriptions = 0;
export const LiveUpdatesStopped: StoryObj<typeof meta> = {
  beforeEach: () => {
    liveSubscriptions = 0;
  },
  parameters: {
    trpc: {
      ...sessionListMocks,
      'session.listUpdates': async function* () {
        liveSubscriptions += 1;
        if (liveSubscriptions === 1) fails('The live stream ended')();
        yield* sessionListMocks['session.listUpdates']();
      },
    },
  },
};
