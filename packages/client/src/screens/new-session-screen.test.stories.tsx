import type { SessionNewInput } from '@repo/contracts';
import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import {
  agentProbeRequests,
  failedStartMessage,
  failedStartNewSessionMocks,
  newSessionMocks,
  notInstalledNewSessionMocks,
  notSignedInNewSessionMocks,
  sendingNewSessionMocks,
  unavailableNewSessionMocks,
} from '../../mocks/new-session-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import type { FixtureOutput } from '../../mocks/trpc-mock-link';
import { pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { ContentLayout } from '../components/content-layout';
import { NewSessionScreen } from './new-session-screen';

const openSessionLabel = 'Open Session';
const createdSessionId = 'new-session';
const chooseAgentLabel = 'Choose Agent';
const agentModelLabel = 'Agent and model';

const recorder = createNavigationRecorder();
const started: SessionNewInput[] = [];
const [exampleProject, landingProject] = newSessionProjects;
const firstAgent = newSessionCatalogs.bothAvailable[0];
if (!exampleProject || !landingProject || !firstAgent)
  throw new Error('New Session needs two Projects and an Agent.');

const meta = {
  title: 'Tests/NewSessionScreen',
  component: NewSessionScreen,
  parameters: {
    screenPreview: true,
    navigation: recorder,
    trpc: {
      ...newSessionMocks,
      'session.new': (input: SessionNewInput): FixtureOutput<'session.new'> => {
        started.push(input);
        return { sessionId: createdSessionId };
      },
    },
  },
  beforeEach: (): void => {
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
    await expect(checkout).toHaveTextContent(/New worktree from\s*main/);
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
      if (!wide)
        await expect(
          canvas.getByRole('button', { name: 'Checkout' }),
        ).toHaveTextContent(/New worktree from\s*main/);
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
        configOptions: [],
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
      await expect(
        overlay.queryByRole('slider', { name: 'Effort' }),
      ).toBeNull();
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      await userEvent.click(
        await overlay.findByRole('button', { name: `Select ${agent.label}` }),
      );
      await userEvent.keyboard('{Escape}');
      await userEvent.click(
        await canvas.findByRole('button', { name: openSessionLabel }),
      );
      await waitFor(() => expect(started).toHaveLength(1));
      await expect(started[0]).toMatchObject({
        agent: agent.agent,
        prompt: [],
        configOptions: [],
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
