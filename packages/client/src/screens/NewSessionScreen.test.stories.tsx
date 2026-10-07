import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/api/mocks';
import type { SessionNewInput } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../mocks/each-layout';
import {
  failedStartMessage,
  failedStartNewSessionMocks,
  newSessionMocks,
  notInstalledNewSessionMocks,
  notSignedInNewSessionMocks,
  sendingNewSessionMocks,
} from '../../mocks/new-session-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { ContentLayout } from '../components/ContentLayout';
import { NewSessionScreen } from './NewSessionScreen';

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
      'session.new': (input: SessionNewInput) => {
        started.push(input);
        return { sessionId: 'new-session' };
      },
    },
  },
  beforeEach: () => {
    recorder.reset();
    started.length = 0;
  },
} satisfies Meta<typeof NewSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;
type Mode = 'light' | 'dark';

const overlay = within(document.body);

export const NarrowMainColumn: Story = {
  render: () => (
    <View className="h-full w-[600px]">
      <ContentLayout>
        <NewSessionScreen />
      </ContentLayout>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
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
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveAttribute('placeholder', '');
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
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await expect(input).toHaveValue('');
      await userEvent.type(input, 'Keep this draft');
      await expect(input).toHaveValue('Keep this draft');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    },
  };
}
export const ReconnectingPhoneLight = reconnecting(layoutWidths.phone, 'light');
export const ReconnectingPhoneDark = reconnecting(layoutWidths.phone, 'dark');
export const ReconnectingWideLight = reconnecting(layoutWidths.wide, 'light');
export const ReconnectingWideDark = reconnecting(layoutWidths.wide, 'dark');

export const SendReplacesThePage: Story = {
  args: { projectId: exampleProject.id },
  play: async ({ canvas, userEvent }) => {
    const input = await canvas.findByRole('textbox', { name: 'Message' });
    await userEvent.type(input, 'Fix the flaky login test\nThen tidy up.');
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(recorder.replacements).toEqual([
        { to: 'session', id: 'new-session' },
      ]),
    );
    await expect(started).toEqual([
      {
        projectId: exampleProject.id,
        agent: firstAgent.agent,
        checkout: { type: 'worktree', baseBranch: 'main' },
        configOptions: firstAgent.configOptions.map(
          ({ configId, currentValue }) => ({ configId, value: currentValue }),
        ),
        prompt: [
          { type: 'text', text: 'Fix the flaky login test\nThen tidy up.' },
        ],
      },
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
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Message' }),
      'Update the hero copy',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
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
        await canvas.findByRole('button', { name: 'Agent and model' }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose Agent' }),
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
      'agents.list': () =>
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
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    });
  },
};

export const Sending: Story = {
  parameters: { trpc: sendingNewSessionMocks },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Message' }),
      'Fix the flaky login test',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await eachLayout(async () => {
      const sending = await canvas.findByRole('progressbar', {
        name: 'Sending',
      });
      const bounds = sending.getBoundingClientRect();
      await expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('Fix the flaky login test');
      await expect(
        canvas.getByRole('button', { name: `Project: ${exampleProject.name}` }),
      ).toBeDisabled();
    });
    await expect(recorder.replacements).toEqual([]);
  },
};

// A local Project's new worktree starts from its current branch, so Send waits for it.
export const WaitsForTheBaseBranch: Story = {
  args: { projectId: landingProject.id },
  parameters: {
    trpc: { ...newSessionMocks, 'projects.branches': pending() },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Message' }),
      'Update the hero copy',
    );
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
  },
};

let agentsListCalls = 0;

export const FailedStart: Story = {
  parameters: {
    trpc: {
      ...failedStartNewSessionMocks,
      'agents.list': () => {
        agentsListCalls += 1;
        return newSessionCatalogs.bothAvailable;
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Message' }),
      'Fix the flaky login test',
    );
    const callsBeforeSend = agentsListCalls;
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    // A failed start can mean the Agent is no longer available, so the screen asks again.
    await waitFor(() =>
      expect(agentsListCalls).toBeGreaterThan(callsBeforeSend),
    );
    await eachLayout(async () => {
      await expect(await canvas.findByRole('alert')).toHaveTextContent(
        `Couldn't start the Session. ${failedStartMessage}`,
      );
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('Fix the flaky login test');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
    });
    await expect(recorder.replacements).toEqual([]);
  },
};

export const LoadFailure: Story = {
  parameters: {
    trpc: {
      ...newSessionMocks,
      'projects.list': () => {
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
