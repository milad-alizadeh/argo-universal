import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FeedSnapshot,
  SessionSnapshot,
  SessionSetConfigOptionInput,
} from '@repo/contracts';
import { newSessionCatalogs, recordedFeedMocks } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { createFeedMocks } from '../../mocks/feed-mock';
import { newSessionMocks } from '../../mocks/new-session-mock';
import { emptySessionMocks } from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { createSubscriptionPublisher } from '../../mocks/subscription-publisher';
import type { Fixtures, FixtureOutput } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { Button } from '../primitives/button';
import { Text } from '../primitives/text';
import { NewSessionScreen } from './new-session-screen';
import { SessionScreen } from './session-screen';

const actualFastId = 'actual-fast';
const actualSessionId = 'actual-session';
const checkoutModelId = 'checkout-model';
const checkoutModelName = 'Checkout model';
const agentModelLabel = 'Agent and model';
const fastModeLabel = 'Fast mode';
const pressedAttribute = 'aria-pressed';
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
        name: fastModeLabel,
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
        name: fastModeLabel,
        type: 'boolean',
        currentValue: true,
      },
    ],
  };
  const updates = createSubscriptionPublisher<FeedSnapshot>();
  const requests: SessionSetConfigOptionInput[] = [];
  let accepted = Promise.withResolvers<void>();
  const mocks: Fixtures = {
    ...emptySessionMocks,
    ...createFeedMocks(recording),
    'feed.subscribe': async function* (_, signal) {
      yield { type: 'snapshot', snapshot: recording.snapshot };
      yield* updates.subscribe(signal);
    },
    'session.setConfigOption': async (input: SessionSetConfigOptionInput) => {
      requests.push(input);
      await accepted.promise;
      const snapshot = input.value ? enabled : recording.snapshot;
      updates.publish({ type: 'snapshot', snapshot });
      return { configOptions: snapshot.configOptions };
    },
  };
  return {
    parameters: { trpc: mocks },
    beforeEach: () => {
      requests.length = 0;
      accepted = Promise.withResolvers<void>();
      updates.reset();
      return () => updates.reset();
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = await canvas.findByRole('button', {
        name: agentModelLabel,
      });
      await userEvent.click(trigger);
      const overlay = within(document.body);
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose model' }),
        );
      await expect(
        await overlay.findByRole('button', { name: checkoutModelName }),
      ).toHaveAttribute(pressedAttribute, 'true');
      if (width === layoutWidths.phone)
        await userEvent.click(
          overlay.getByRole('button', { name: 'Back to Agent and model' }),
        );
      await userEvent.click(
        await overlay.findByRole('switch', { name: fastModeLabel }),
      );
      await waitFor(() => expect(requests).toHaveLength(1));
      await waitFor(() => expect(trigger).toBeDisabled());
      accepted.resolve();
      await waitFor(() => expect(trigger).toBeEnabled());
      await userEvent.click(trigger);
      await waitFor(() =>
        expect(
          overlay.getByRole('switch', { name: fastModeLabel }),
        ).toHaveAttribute('aria-checked', 'true'),
      );
      await expect(requests).toEqual([
        {
          sessionId: actualSessionId,
          configId: actualFastId,
          type: 'boolean',
          value: true,
        },
      ]);
      await userEvent.click(
        overlay.getByRole('switch', { name: fastModeLabel }),
      );
      await waitFor(() =>
        expect(
          overlay.getByRole('switch', { name: fastModeLabel }),
        ).not.toBeChecked(),
      );
      await expect(requests[1]).toEqual({
        sessionId: actualSessionId,
        configId: actualFastId,
        type: 'boolean',
        value: false,
      });
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

function remembersAcceptedChoiceDuringLoad(agentIndex: number): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded catalog needs two Agents.');
  const model =
    agentIndex === 0
      ? { name: 'Opus 4.6', value: 'agent-one-opus-4-6' }
      : { name: 'GPT-6-Luna', value: 'gpt-6-luna' };
  const recording = configuredEmptySession(agentIndex);
  recording.snapshot.configOptions = agent.configOptions;
  const choices = { model: model.value, thought_level: 'high' };
  const accepted = agent.configOptions.map((option) => {
    if (option.type !== 'select') return option;
    const currentValue = Reflect.get(choices, option.category ?? '');
    return {
      ...option,
      currentValue:
        typeof currentValue === 'string' ? currentValue : option.currentValue,
    };
  });
  let response =
    Promise.withResolvers<FixtureOutput<'session.setConfigOption'>>();
  const changes: SessionSetConfigOptionInput[] = [];
  const requests: Parameters<NonNullable<Fixtures['session.new']>>[0][] = [];
  return {
    parameters: {
      trpc: {
        ...newSessionMocks,
        ...emptySessionMocks,
        ...createFeedMocks(recording),
        'agents.list': () => [agent],
        'session.setConfigOption': (input: SessionSetConfigOptionInput) => {
          changes.push(input);
          return response.promise;
        },
        'session.new': (
          input: Parameters<NonNullable<Fixtures['session.new']>>[0],
        ) => {
          requests.push(input);
          return { sessionId: actualSessionId };
        },
      },
    },
    beforeEach: async () => {
      await AsyncStorage.clear();
      changes.length = 0;
      requests.length = 0;
      response =
        Promise.withResolvers<FixtureOutput<'session.setConfigOption'>>();
    },
    render: function SessionToNewSession(): React.JSX.Element {
      const [creating, setCreating] = useState(false);
      return (
        <View className="flex-1">
          <Button onPress={() => setCreating(true)}>
            <Text>New Session</Text>
          </Button>
          {creating ? (
            <NewSessionScreen />
          ) : (
            <SessionScreenPreview id={actualSessionId} />
          )}
        </View>
      );
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const overlay = within(document.body);
      const oldRead = Promise.withResolvers<string | null>();
      const storage = spyOn(AsyncStorage, 'getItem').mockImplementation(
        () => oldRead.promise,
      );
      try {
        await userEvent.click(
          await canvas.findByRole('button', { name: agentModelLabel }),
        );
        await userEvent.click(
          await overlay.findByRole('button', { name: model.name }),
        );
        await waitFor(() =>
          expect(changes).toEqual([
            {
              sessionId: actualSessionId,
              configId: 'model',
              type: 'id',
              value: model.value,
            },
          ]),
        );
        await userEvent.keyboard('{Escape}');
        await userEvent.click(
          canvas.getByRole('button', { name: 'New Session' }),
        );
        await waitFor(() => expect(storage).toHaveBeenCalledTimes(2));
        response.resolve({ configOptions: accepted });
        await waitFor(() =>
          expect(
            localStorage.getItem(`session-configuration:${agent.agent}:model`),
          ).toBe(model.value),
        );
        oldRead.resolve(null);
        await userEvent.click(
          await canvas.findByRole('button', { name: agentModelLabel }),
        );
        await expect(
          await overlay.findByRole('button', { name: model.name }),
        ).toHaveAttribute(pressedAttribute, 'true');
        await expect(
          overlay.getByRole('slider', { name: 'Effort' }),
        ).toHaveAttribute('aria-valuetext', 'High');
        await userEvent.keyboard('{Escape}');
        await userEvent.click(
          canvas.getByRole('button', { name: 'Open Session' }),
        );
        await waitFor(() => expect(requests).toHaveLength(1));
        await expect(requests[0]?.configOptions).toEqual([
          { configId: 'model', value: model.value },
          { configId: 'effort', value: 'high' },
        ]);
      } finally {
        oldRead.resolve(null);
        response.resolve({ configOptions: accepted });
        storage.mockRestore();
      }
    },
  };
}
export const RemembersAcceptedChoiceDuringLoadFirstAgent =
  remembersAcceptedChoiceDuringLoad(0);
export const RemembersAcceptedChoiceDuringLoadSecondAgent =
  remembersAcceptedChoiceDuringLoad(1);

function fastBeforeOpening(width: number, agentIndex: number): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded catalog needs two Agents.');
  const fast = configuredEmptySession(agentIndex).snapshot.configOptions.find(
    (option) => option.configId === actualFastId,
  );
  if (!fast) throw new Error('Recorded Session needs Fast mode.');
  const requests: Parameters<NonNullable<Fixtures['session.new']>>[0][] = [];
  return {
    render: () => <NewSessionScreen />,
    parameters: {
      trpc: {
        ...newSessionMocks,
        'agents.list': () => [
          { ...agent, configOptions: [...agent.configOptions, fast] },
        ],
        'session.new': (
          input: Parameters<NonNullable<Fixtures['session.new']>>[0],
        ) => {
          requests.push(input);
          return { sessionId: actualSessionId };
        },
      },
    },
    beforeEach: async () => {
      await AsyncStorage.clear();
      requests.length = 0;
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      const overlay = within(document.body);
      const toggle = await overlay.findByRole('switch', {
        name: fastModeLabel,
      });
      await expect(toggle).not.toBeChecked();
      await userEvent.click(toggle);
      await waitFor(() => expect(toggle).toBeChecked());
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Open Session' }),
      );
      await waitFor(() => expect(requests).toHaveLength(1));
      await expect(requests[0]).toMatchObject({
        agent: agent.agent,
        prompt: [],
        configOptions: expect.arrayContaining([
          { configId: actualFastId, value: true },
        ]),
      });
    },
  };
}
export const FastBeforeOpeningPhoneFirstAgent = fastBeforeOpening(
  layoutWidths.phone,
  0,
);
export const FastBeforeOpeningPhoneSecondAgent = fastBeforeOpening(
  layoutWidths.phone,
  1,
);
export const FastBeforeOpeningWideFirstAgent = fastBeforeOpening(
  layoutWidths.wide,
  0,
);
export const FastBeforeOpeningWideSecondAgent = fastBeforeOpening(
  layoutWidths.wide,
  1,
);
