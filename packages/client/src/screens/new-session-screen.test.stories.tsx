import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionNewInput } from '@repo/contracts';
import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { chooseEffort } from '../../mocks/choose-effort';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import {
  agentProbeRequests,
  failedStartMessage,
  failedStartNewSessionMocks,
  newSessionMocks,
  notInstalledNewSessionMocks,
  notSignedInNewSessionMocks,
  restrictedEffortNewSessionMocks,
  sendingNewSessionMocks,
  unavailableNewSessionMocks,
} from '../../mocks/new-session-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import type {
  FixtureArguments,
  FixtureOutput,
} from '../../mocks/trpc-mock-link';
import { pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { TrpcMocks } from '../../mocks/with-trpc-mocks';
import { ContentLayout } from '../components/content-layout';
import { Button } from '../primitives/button';
import { Text } from '../primitives/text';
import { NewSessionScreen } from './new-session-screen';

const openSessionLabel = 'Open Session';
const createdSessionId = 'new-session';
const chooseAgentLabel = 'Choose Agent';
const agentModelLabel = 'Agent and model';
const effortLabel = 'Effort';
const defaultEffortLabel = 'Medium';
const effortValueAttribute = 'aria-valuetext';
const chooseModelLabel = 'Choose model';

const recorder = createNavigationRecorder();
const started: SessionNewInput[] = [];
const [exampleProject, landingProject] = newSessionProjects;
const firstAgent = newSessionCatalogs.bothAvailable[0];
if (!exampleProject || !landingProject || !firstAgent)
  throw new Error('New Session needs two Projects and an Agent.');

const effortModelCases = newSessionCatalogs.bothAvailable.map((agent) => {
  const model = agent.configOptions.find(
    (option) => option.category === 'model' && option.type === 'select',
  );
  const effort = agent.configOptions.find(
    (option) => option.category === 'thought_level' && option.type === 'select',
  );
  const models =
    model?.type === 'select'
      ? model.options.flatMap((entry) =>
          'groupId' in entry ? entry.options : [entry],
        )
      : [];
  const efforts =
    effort?.type === 'select'
      ? effort.options.flatMap((entry) =>
          'groupId' in entry ? entry.options : [entry],
        )
      : [];
  const currentModel = models.find(
    (choice) => choice.value === model?.currentValue,
  );
  const levels = currentModel?._meta?.argo?.supportedEffortLevels ?? [];
  const nextModel = models.find((choice) => {
    const supported = choice._meta?.argo?.supportedEffortLevels;
    return (
      supported?.length && levels.some((level) => !supported.includes(level))
    );
  });
  const unsupported = efforts.find(
    (choice) =>
      levels.includes(choice.value) &&
      !nextModel?._meta?.argo?.supportedEffortLevels?.includes(choice.value),
  );
  const defaultEffort = efforts.find(
    (choice) => choice.value === effort?.currentValue,
  );
  if (
    model?.type !== 'select' ||
    effort?.type !== 'select' ||
    !nextModel ||
    !unsupported ||
    !defaultEffort ||
    !nextModel._meta?.argo?.supportedEffortLevels?.includes(defaultEffort.value)
  )
    throw new Error(
      `Recorded catalog needs a default effort and models with differing effort levels for ${agent.label}.`,
    );
  const visible = (supported: string[] | undefined): string[] =>
    efforts
      .filter((choice) => !supported || supported.includes(choice.value))
      .map((choice) => choice.name);
  const offered = visible(levels);
  const nextOffered = visible(nextModel._meta?.argo?.supportedEffortLevels);
  return {
    agent,
    model,
    effort,
    nextModel,
    unsupported,
    defaultEffort,
    offered,
    nextOffered,
  };
});

const meta = {
  title: 'Tests/NewSessionScreen',
  component: NewSessionScreen,
  parameters: {
    screenPreview: true,
    navigation: recorder,
    trpc: {
      ...newSessionMocks,
      'session.new': (
        input: FixtureArguments<'session.new'>[0],
      ): FixtureOutput<'session.new'> => {
        started.push(SessionNewInput.parse(input));
        return { sessionId: createdSessionId };
      },
    },
  },
  beforeEach: async (): Promise<void> => {
    await AsyncStorage.clear();
    recorder.reset();
    started.length = 0;
  },
} satisfies Meta<typeof NewSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
type Mode = 'light' | 'dark';

const overlay = within(document.body);

function unavailableAgentRetry(width: number, agentIndex: number): Story {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  if (!agent?.installStep)
    throw new Error('Recorded catalog needs an unavailable Agent reason');
  return {
    parameters: { trpc: unavailableNewSessionMocks },
    beforeEach: () => {
      agentProbeRequests.length = 0;
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        await canvas.findByRole('button', { name: openSessionLabel }),
      ).toBeDisabled();
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      const row = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(row).toBeVisible());
      await expect(row).toBeDisabled();
      await expect(
        within(row).getByText('Unavailable', { exact: true }),
      ).toBeVisible();
      await expect(within(row).getByText(agent.installStep)).toBeVisible();
      const retry = overlay.getByRole('button', {
        name: `Retry ${agent.label}`,
      });
      await expect(retry).toHaveTextContent('Retry');
      if (width === layoutWidths.wide)
        await waitFor(async () => {
          const menu = overlay
            .getByTestId('composer-agents-scroll')
            .getBoundingClientRect();
          for (const unavailable of newSessionCatalogs.bothUnavailable) {
            const choice = overlay
              .getByRole('button', { name: `Select ${unavailable.label}` })
              .getBoundingClientRect();
            const action = overlay
              .getByRole('button', { name: `Retry ${unavailable.label}` })
              .getBoundingClientRect();
            await expect(choice.top).toBeGreaterThanOrEqual(menu.top);
            await expect(action.bottom).toBeLessThanOrEqual(menu.bottom);
          }
        });
      await expect(
        overlay.queryByText('Install', { exact: true }),
      ).not.toBeInTheDocument();
      await userEvent.click(retry);
      await waitFor(() =>
        expect(
          overlay.getByRole('button', { name: `Select ${agent.label}` }),
        ).toBeEnabled(),
      );
      await expect(
        overlay.queryByText('Unavailable', { exact: true }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByText(agent.installStep),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('button', { name: `Retry ${agent.label}` }),
      ).not.toBeInTheDocument();
      await expect(
        agentProbeRequests.filter((input) => input?.refresh),
      ).toEqual([{ refresh: true }]);
      await expect(recorder.destinations).toHaveLength(0);
    },
  };
}
export const UnavailableAgentRetryPhoneFirstAgent = unavailableAgentRetry(
  layoutWidths.phone,
  0,
);
export const UnavailableAgentRetryPhoneSecondAgent = unavailableAgentRetry(
  layoutWidths.phone,
  1,
);
export const UnavailableAgentRetryWideFirstAgent = unavailableAgentRetry(
  layoutWidths.wide,
  0,
);
export const UnavailableAgentRetryWideSecondAgent = unavailableAgentRetry(
  layoutWidths.wide,
  1,
);

export const NarrowMainColumn: Story = {
  render: () => (
    <View className="h-full w-[600px]">
      <ContentLayout>
        <NewSessionScreen />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    await page.viewport(1440, 844);
    const checkout = await canvas.findByRole('button', { name: 'Checkout' });
    await expect(checkout).toBeVisible();
    await expect(checkout).toHaveTextContent('New worktree');
    await expect(checkout).not.toHaveTextContent('main');
    await expect(
      canvas.getAllByRole('button', { name: 'Checkout' }),
    ).toHaveLength(1);
    await userEvent.click(checkout);
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Local' }),
    );
    await expect(checkout).toHaveTextContent('Local');
    await expect(window.innerWidth).toBe(1440);
  },
};

export const Ready: Story = {
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(await canvas.findByText(serverInfo.name)).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: `Project: ${exampleProject.name}` }),
      ).toBeVisible();
      await expect(canvas.getByText('Start the Session in')).toBeVisible();
      const heading = canvas.queryByRole('heading', {
        name: 'What should we work on?',
      });
      if (wide) await expect(heading).toBeVisible();
      else await expect(heading).toBeNull();
      // A phone shows the checkout among the rows; a wide window keeps it in the envelope.
      await expect(
        canvas.getAllByRole('button', { name: 'Checkout' }),
      ).toHaveLength(1);
      if (!wide) {
        const checkout = canvas.getByRole('button', { name: 'Checkout' });
        await expect(checkout).toHaveTextContent('New worktree');
        await expect(checkout).not.toHaveTextContent('main');
      }
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await expect(
        canvas.getByRole('img', { name: 'Connected' }),
      ).toBeVisible();
      await expect(canvas.queryByText('Reconnecting…')).toBeNull();
    }),
};

function reconnecting(width: number, mode: Mode): Story {
  return {
    parameters: { connection: 'reconnecting' },
    globals: { mode },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeDisabled();
    },
  };
}
export const ReconnectingPhoneLight = reconnecting(layoutWidths.phone, 'light');
export const ReconnectingPhoneDark = reconnecting(layoutWidths.phone, 'dark');
export const ReconnectingWideLight = reconnecting(layoutWidths.wide, 'light');
export const ReconnectingWideDark = reconnecting(layoutWidths.wide, 'dark');

export const OpeningReplacesThePage: Story = {
  args: { projectId: exampleProject.id },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openSessionLabel }),
    );
    await waitFor(() =>
      expect(recorder.replacements).toEqual([
        { to: 'session', id: createdSessionId },
      ]),
    );
    await expect(started).toEqual([
      {
        projectId: exampleProject.id,
        agent: firstAgent.agent,
        checkout: { type: 'worktree', baseBranch: 'main' },
        configOptions: [
          { configId: 'model', value: 'default' },
          { configId: 'effort', value: 'medium' },
        ],
        prompt: [],
      },
    ]);
  },
};

function openSessionBeforePrompt(width: number, agentIndex: number): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded catalog needs two Agents.');
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        canvas.queryByRole('textbox', { name: 'Message' }),
      ).toBeNull();
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      await userEvent.click(
        await overlay.findByRole('button', { name: `Select ${agent.label}` }),
      );
      if (width === layoutWidths.wide && agentIndex !== 0) {
        const trigger = await canvas.findByRole('button', {
          name: agentModelLabel,
        });
        await waitFor(() => expect(trigger).toBeEnabled());
        await userEvent.click(trigger);
      }
      await expect(
        await overlay.findByRole('slider', { name: effortLabel }),
      ).toHaveAttribute(effortValueAttribute, defaultEffortLabel);
      if (width === layoutWidths.phone)
        await userEvent.click(
          overlay.getByRole('button', { name: chooseModelLabel }),
        );
      await expect(
        await overlay.findByRole('button', {
          name: agentIndex === 0 ? 'Opus 5.5 (recommended)' : 'GPT-6-Astra',
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        await canvas.findByRole('button', { name: openSessionLabel }),
      );
      await waitFor(() => expect(started).toHaveLength(1));
      await expect(started[0]).toMatchObject({
        agent: agent.agent,
        prompt: [],
        configOptions: [
          {
            configId: 'model',
            value: agentIndex === 0 ? 'default' : 'gpt-6-astra',
          },
          { configId: 'effort', value: 'medium' },
        ],
      });
      await expect(recorder.replacements).toEqual([
        { to: 'session', id: createdSessionId },
      ]);
    },
  };
}
export const OpenActualSessionPhoneFirstAgent = openSessionBeforePrompt(
  layoutWidths.phone,
  0,
);
export const OpenActualSessionPhoneSecondAgent = openSessionBeforePrompt(
  layoutWidths.phone,
  1,
);
export const OpenActualSessionWideFirstAgent = openSessionBeforePrompt(
  layoutWidths.wide,
  0,
);
export const OpenActualSessionWideSecondAgent = openSessionBeforePrompt(
  layoutWidths.wide,
  1,
);

function rememberedSelection(agentIndex: number): Story {
  const agent = newSessionCatalogs.bothAvailable[agentIndex];
  if (!agent) throw new Error('Recorded catalog needs two Agents.');
  const model =
    agentIndex === 0
      ? { name: 'Opus 4.6', value: 'agent-one-opus-4-6' }
      : { name: 'GPT-6-Luna', value: 'gpt-6-luna' };
  return {
    render: function RestartableApp(): React.JSX.Element {
      const [restart, setRestart] = useState(0);
      return (
        <View className="flex-1">
          <Button onPress={() => setRestart((value) => value + 1)}>
            <Text>Restart App</Text>
          </Button>
          <TrpcMocks
            key={restart}
            fixtures={meta.parameters.trpc}
            connectionState="open"
          >
            <NewSessionScreen />
          </TrpcMocks>
        </View>
      );
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const configure = async (): Promise<void> => {
        await userEvent.click(
          await canvas.findByRole('button', { name: agentModelLabel }),
        );
        await userEvent.click(
          await overlay.findByRole('button', { name: `Select ${agent.label}` }),
        );
        if (agentIndex !== 0)
          await userEvent.click(
            await canvas.findByRole('button', { name: agentModelLabel }),
          );
      };
      await configure();
      await userEvent.click(
        await overlay.findByRole('button', { name: model.name }),
      );
      await chooseEffort(
        overlay.getByRole('slider', { name: effortLabel }),
        ['Low', 'Medium', 'High', 'Ultra'],
        'High',
      );
      await expect(
        overlay.getByRole('slider', { name: effortLabel }),
      ).toHaveAttribute(effortValueAttribute, 'High');
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        canvas.getByRole('button', { name: openSessionLabel }),
      );
      await waitFor(() => expect(started).toHaveLength(1));
      await expect(started[0]?.configOptions).toEqual([
        { configId: 'model', value: model.value },
        { configId: 'effort', value: 'high' },
      ]);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Restart App' }),
      );
      await configure();
      await expect(
        await overlay.findByRole('button', { name: model.name }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        overlay.getByRole('slider', { name: effortLabel }),
      ).toHaveAttribute(effortValueAttribute, 'High');
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const RemembersSelectionFirstAgent = rememberedSelection(0);
export const RemembersSelectionSecondAgent = rememberedSelection(1);

export const ModelWithoutEffort: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: agentModelLabel }),
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Haiku 4.5' }),
    );
    await expect(
      overlay.queryByRole('slider', { name: effortLabel }),
    ).toBeNull();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      canvas.getByRole('button', { name: openSessionLabel }),
    );
    await waitFor(() => expect(started).toHaveLength(1));
    await expect(started[0]?.configOptions).toEqual([
      { configId: 'model', value: 'haiku' },
    ]);
  },
};

export const FallsBackToDefaultEffortForModel: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: agentModelLabel }),
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Select Second Agent' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    await chooseEffort(
      await overlay.findByRole('slider', { name: effortLabel }),
      ['Low', 'Medium', 'High', 'Extra high', 'Max', 'Ultra'],
      'Ultra',
    );
    await userEvent.click(overlay.getByRole('button', { name: 'GPT-5.5' }));
    await expect(
      overlay.getByRole('slider', { name: effortLabel }),
    ).toHaveAttribute(effortValueAttribute, defaultEffortLabel);
    await expect(
      overlay.getByRole('slider', { name: effortLabel }),
    ).toHaveAttribute('max', '3');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      canvas.getByRole('button', { name: openSessionLabel }),
    );
    await waitFor(() => expect(started).toHaveLength(1));
    await expect(started[0]?.configOptions).toEqual([
      { configId: 'model', value: 'gpt-5.5' },
      { configId: 'effort', value: 'medium' },
    ]);
  },
};

export const FallsBackToSupportedEffort: Story = {
  parameters: {
    trpc: {
      ...meta.parameters.trpc,
      'agents.list': restrictedEffortNewSessionMocks['agents.list'],
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: agentModelLabel }),
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Opus 4.6' }),
    );
    await expect(
      overlay.getByRole('slider', { name: effortLabel }),
    ).toHaveAttribute(effortValueAttribute, 'High');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      canvas.getByRole('button', { name: openSessionLabel }),
    );
    await waitFor(() => expect(started).toHaveLength(1));
    await expect(started[0]?.configOptions).toEqual([
      { configId: 'model', value: 'agent-one-opus-4-6' },
      { configId: 'effort', value: 'high' },
    ]);
  },
};

const switchProject = (width: number, mode: Mode): Story => ({
  globals: { mode },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);
    await userEvent.click(
      await canvas.findByRole('button', {
        name: `Project: ${exampleProject.name}`,
      }),
    );
    await userEvent.type(
      await overlay.findByRole('textbox', { name: 'Find a Project' }),
      'landing',
    );
    await expect(
      overlay.queryByRole('button', { name: exampleProject.name }),
    ).toBeNull();
    await userEvent.click(
      overlay.getByRole('button', { name: landingProject.name }),
    );
    await expect(
      await canvas.findByRole('button', {
        name: `Project: ${landingProject.name}`,
      }),
    ).toBeVisible();
    // Switching Project loads its stored checkout: this one runs Local.
    await expect(canvas.getByText('Local')).toBeVisible();
  },
});
export const SwitchProjectPhoneLight = switchProject(
  layoutWidths.phone,
  'light',
);
export const SwitchProjectPhoneDark = switchProject(layoutWidths.phone, 'dark');
export const SwitchProjectWideLight = switchProject(layoutWidths.wide, 'light');
export const SwitchProjectWideDark = switchProject(layoutWidths.wide, 'dark');

export const StartsOnTheChosenProject: Story = {
  args: { projectId: landingProject.id },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openSessionLabel }),
    );
    await waitFor(() => expect(started).toHaveLength(1));
    await expect(started[0]?.projectId).toBe(landingProject.id);
    await expect(started[0]?.checkout).toEqual({ type: 'main' });
  },
};

function agentSetup(
  availability: 'not_installed' | 'not_signed_in',
  width: number,
  mode: Mode,
): Story {
  const catalog =
    availability === 'not_installed'
      ? newSessionCatalogs.oneNotInstalled
      : newSessionCatalogs.oneNotSignedIn;
  const agent = catalog.find((entry) => entry.availability === availability);
  if (!agent) throw new Error('Missing Agent mock.');
  const status =
    availability === 'not_installed' ? 'Not installed' : 'Not signed in';
  return {
    parameters: {
      trpc:
        availability === 'not_installed'
          ? notInstalledNewSessionMocks
          : notSignedInNewSessionMocks,
    },
    globals: { mode },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(overlay.queryByText(status)).toBeNull();
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      // The overlay fades in, so its status turns visible a few frames after it mounts.
      await waitFor(() => expect(overlay.getByText(status)).toBeVisible());
      await expect(
        overlay.getByRole('button', { name: `Select ${agent.label}` }),
      ).toBeDisabled();
      await expect(recorder.destinations).toEqual([]);
      await userEvent.click(
        overlay.getByRole('button', { name: `Set up ${agent.label}` }),
      );
      await expect(recorder.destinations).toEqual([
        { to: 'settings-agent', agent: agent.agent },
      ]);
    },
  };
}
export const AgentNotInstalledPhoneLight = agentSetup(
  'not_installed',
  layoutWidths.phone,
  'light',
);
export const AgentNotInstalledPhoneDark = agentSetup(
  'not_installed',
  layoutWidths.phone,
  'dark',
);
export const AgentNotInstalledWideLight = agentSetup(
  'not_installed',
  layoutWidths.wide,
  'light',
);
export const AgentNotInstalledWideDark = agentSetup(
  'not_installed',
  layoutWidths.wide,
  'dark',
);
export const AgentNotSignedInPhoneLight = agentSetup(
  'not_signed_in',
  layoutWidths.phone,
  'light',
);
export const AgentNotSignedInPhoneDark = agentSetup(
  'not_signed_in',
  layoutWidths.phone,
  'dark',
);
export const AgentNotSignedInWideLight = agentSetup(
  'not_signed_in',
  layoutWidths.wide,
  'light',
);
export const AgentNotSignedInWideDark = agentSetup(
  'not_signed_in',
  layoutWidths.wide,
  'dark',
);

export const NoAgentReady: Story = {
  parameters: {
    trpc: {
      ...newSessionMocks,
      'agents.list': (): FixtureOutput<'agents.list'> =>
        newSessionCatalogs.oneNotSignedIn.filter(
          (entry) => entry.availability !== 'available',
        ),
    },
  },
  play: async ({ canvas }) => {
    const agent = newSessionCatalogs.oneNotSignedIn.find(
      (entry) => entry.availability === 'not_signed_in',
    );
    await eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        agent?.installStep ?? '',
      );
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeDisabled();
    });
  },
};

export const Opening: Story = {
  parameters: { trpc: sendingNewSessionMocks },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openSessionLabel }),
    );
    await eachLayout(async () => {
      const sending = await canvas.findByRole('progressbar', {
        name: 'Opening Session',
      });
      const bounds = sending.getBoundingClientRect();
      await expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight);
      await expect(
        canvas.getByRole('button', { name: `Project: ${exampleProject.name}` }),
      ).toBeDisabled();
    });
    await expect(recorder.replacements).toEqual([]);
  },
};

// A local Project's new worktree starts from its current branch, so opening waits for it.
export const WaitsForTheBaseBranch: Story = {
  args: { projectId: landingProject.id },
  parameters: {
    trpc: { ...newSessionMocks, 'projects.branches': pending() },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: openSessionLabel }),
    ).toBeDisabled();
  },
};

let agentsListCalls = 0;

export const FailedStart: Story = {
  parameters: {
    trpc: {
      ...failedStartNewSessionMocks,
      'agents.list': (): FixtureOutput<'agents.list'> => {
        agentsListCalls += 1;
        return newSessionCatalogs.bothAvailable;
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const callsBeforeSend = agentsListCalls;
    await userEvent.click(
      await canvas.findByRole('button', { name: openSessionLabel }),
    );
    // A failed start can mean the Agent is no longer available, so the screen asks again.
    await waitFor(() =>
      expect(agentsListCalls).toBeGreaterThan(callsBeforeSend),
    );
    await eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        `Couldn't open the Session. ${failedStartMessage}`,
      );
      await expect(
        canvas.getByRole('button', { name: openSessionLabel }),
      ).toBeEnabled();
    });
    await expect(recorder.replacements).toEqual([]);
  },
};

export const LoadFailure: Story = {
  parameters: {
    trpc: {
      ...newSessionMocks,
      'projects.list': (): FixtureOutput<'projects.list'> => {
        throw new Error('Server is down');
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Couldn't load New Session"),
    ).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
  },
};

function effortFollowsModel(width: number, agentIndex: number): Story {
  const recorded = effortModelCases[agentIndex];
  if (!recorded)
    throw new Error(
      'Recorded catalog needs two Agents with model effort levels.',
    );
  const {
    agent,
    model,
    effort,
    nextModel,
    unsupported,
    defaultEffort,
    offered,
    nextOffered,
  } = recorded;
  return {
    parameters: {
      trpc: { 'agents.list': (): FixtureOutput<'agents.list'> => [agent] },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = await canvas.findByRole('button', {
        name: agentModelLabel,
      });
      await userEvent.click(trigger);
      const slider = await overlay.findByRole('slider', { name: 'Effort' });
      await chooseEffort(slider, offered, unsupported.name);
      await expect(slider).toHaveAttribute(
        effortValueAttribute,
        unsupported.name,
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          overlay.getByRole('button', { name: 'Choose model' }),
        );
      await userEvent.click(
        await overlay.findByRole('button', { name: nextModel.name }),
      );
      if (width === layoutWidths.wide) {
        await expect(trigger).toHaveTextContent(defaultEffort.name);
        await expect(trigger).not.toHaveTextContent(unsupported.name);
      }
      const nextSlider = await overlay.findByRole('slider', { name: 'Effort' });
      await waitFor(() =>
        expect(nextSlider).toHaveAttribute(
          effortValueAttribute,
          defaultEffort.name,
        ),
      );
      // The slider offers only the new model's levels, so the unsupported one is out of reach.
      await expect(nextSlider).toHaveAttribute(
        'max',
        String(nextOffered.length - 1),
      );
      await expect(
        overlay.queryByText(unsupported.name, { exact: true }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('switch', { name: 'Fast mode' }),
      ).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        await canvas.findByRole('button', { name: 'Open Session' }),
      );
      await waitFor(() => expect(started).toHaveLength(1));
      await expect(started[0]?.agent).toBe(agent.agent);
      await expect(started[0]?.configOptions).toContainEqual({
        configId: model.configId,
        value: nextModel.value,
      });
      await expect(started[0]?.configOptions).toContainEqual({
        configId: effort.configId,
        value: defaultEffort.value,
      });
      await expect(started[0]?.configOptions).not.toContainEqual({
        configId: effort.configId,
        value: unsupported.value,
      });
    },
  };
}
export const EffortFollowsModelPhoneFirstAgent = effortFollowsModel(
  layoutWidths.phone,
  0,
);
export const EffortFollowsModelPhoneSecondAgent = effortFollowsModel(
  layoutWidths.phone,
  1,
);
export const EffortFollowsModelWideFirstAgent = effortFollowsModel(
  layoutWidths.wide,
  0,
);
export const EffortFollowsModelWideSecondAgent = effortFollowsModel(
  layoutWidths.wide,
  1,
);
