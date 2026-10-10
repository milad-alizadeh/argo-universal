import type {
  FeedSnapshot,
  SessionSnapshot,
  SessionSetConfigOptionInput,
} from '@repo/contracts';
import { newSessionCatalogs, recordedFeedMocks } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { createFeedMocks } from '../../mocks/feed-mock';
import { emptySessionMocks } from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { createSubscriptionPublisher } from '../../mocks/subscription-publisher';
import type { Fixtures } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { SessionScreen } from './session-screen';

const actualFastId = 'actual-fast';
const actualSessionId = 'actual-session';
const checkoutModelId = 'checkout-model';
const checkoutModelName = 'Checkout model';
const recorder = createNavigationRecorder();
const meta = {
  title: 'Tests/SessionConfiguration',
  component: SessionScreen,
  parameters: { screenPreview: true, navigation: recorder },
  args: { id: actualSessionId },
  render: (args): React.JSX.Element => <SessionScreenPreview {...args} />,
} satisfies Meta<typeof SessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

function configuredEmptySession(
  agentIndex: number,
): NonNullable<(typeof recordedFeedMocks)[number]> {
  const recording = recordedFeedMocks[0];
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!recording || !agent)
    throw new Error('Recorded mocks need two Agents and a Feed.');
  const snapshot: SessionSnapshot = {
    ...recording.snapshot,
    agent: agent.agent,
    title: 'New Session',
    state: 'idle',
    activeTurnId: null,
    liveHeader: null,
    maxRevision: 0,
    configOptions: [
      {
        configId: 'actual-model',
        category: 'model',
        name: 'Model',
        type: 'select',
        currentValue: checkoutModelId,
        options: [{ value: checkoutModelId, name: checkoutModelName }],
      },
      {
        configId: actualFastId,
        category: 'model_config',
        name: 'Fast mode',
        type: 'boolean',
        currentValue: false,
      },
    ],
  };
  return {
    ...recording,
    rows: [],
    snapshot,
    stream: [{ type: 'snapshot', snapshot }],
  };
}
function actualConfiguration(width: number, agentIndex: number): Story {
  const recording = configuredEmptySession(agentIndex);
  const model = recording.snapshot.configOptions.find(
    (option) => option.category === 'model',
  );
  if (!model) throw new Error('Recorded Session needs its actual model.');
  const enabled: SessionSnapshot = {
    ...recording.snapshot,
    configOptions: [
      model,
      {
        configId: actualFastId,
        category: 'model_config',
        name: 'Fast mode',
        type: 'boolean',
        currentValue: true,
      },
    ],
  };
  const updates = createSubscriptionPublisher<FeedSnapshot>();
  const requests: SessionSetConfigOptionInput[] = [];
  const mocks: Fixtures = {
    ...emptySessionMocks,
    ...createFeedMocks(recording),
    'feed.subscribe': async function* (_, signal) {
      yield { type: 'snapshot', snapshot: recording.snapshot };
      yield* updates.subscribe(signal);
    },
    'session.setConfigOption': (input: SessionSetConfigOptionInput) => {
      requests.push(input);
      updates.publish({ type: 'snapshot', snapshot: enabled });
      return { configOptions: enabled.configOptions };
    },
  };
  return {
    parameters: { trpc: mocks },
    beforeEach: () => {
      requests.length = 0;
      updates.reset();
      return () => updates.reset();
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      const overlay = within(document.body);
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose model' }),
        );
      await expect(
        await overlay.findByRole('button', { name: checkoutModelName }),
      ).toHaveAttribute('aria-pressed', 'true');
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Session settings' }),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: 'Fast mode' }),
      );
      await waitFor(() =>
        expect(
          overlay.getByRole('button', { name: 'Fast mode' }),
        ).toHaveAttribute('aria-pressed', 'true'),
      );
      await expect(requests).toEqual([
        {
          sessionId: actualSessionId,
          configId: actualFastId,
          type: 'boolean',
          value: true,
        },
      ]);
    },
  };
}
function cancelCreation(width: number, agentIndex: number): Story {
  const recording = configuredEmptySession(agentIndex);
  const closed: string[] = [];
  return {
    parameters: {
      trpc: {
        ...emptySessionMocks,
        ...createFeedMocks(recording),
        'session.close': ({ sessionId }: { sessionId: string }) => {
          closed.push(sessionId);
          return {};
        },
      },
    },
    beforeEach: () => {
      closed.length = 0;
      recorder.reset();
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Cancel creation' }),
      );
      await waitFor(() =>
        expect(recorder.destinations).toEqual([{ to: 'sessions' }]),
      );
      await expect(closed).toEqual([actualSessionId]);
    },
  };
}
export const ActualConfigurationPhoneFirstAgent = actualConfiguration(
  layoutWidths.phone,
  0,
);
export const ActualConfigurationPhoneSecondAgent = actualConfiguration(
  layoutWidths.phone,
  1,
);
export const ActualConfigurationWideFirstAgent = actualConfiguration(
  layoutWidths.wide,
  0,
);
export const ActualConfigurationWideSecondAgent = actualConfiguration(
  layoutWidths.wide,
  1,
);
export const CancelCreationPhoneFirstAgent = cancelCreation(
  layoutWidths.phone,
  0,
);
export const CancelCreationPhoneSecondAgent = cancelCreation(
  layoutWidths.phone,
  1,
);
export const CancelCreationWideFirstAgent = cancelCreation(
  layoutWidths.wide,
  0,
);
export const CancelCreationWideSecondAgent = cancelCreation(
  layoutWidths.wide,
  1,
);
