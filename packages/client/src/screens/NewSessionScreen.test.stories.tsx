import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/api/mocks';
import type { SessionNewInput } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import {
  failedStartMessage,
  failedStartNewSessionMocks,
  newSessionMocks,
  notInstalledNewSessionMocks,
  notSignedInNewSessionMocks,
  sendingNewSessionMocks,
} from '../../mocks/new-session-mock';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { ContentLayout } from '../components/ContentLayout';
import { applyTheme } from '../lib/theme';
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

async function settle() {
  await document.fonts.ready;
  for (let frame = 0; frame < 2; frame++)
    await new Promise((resolve) => requestAnimationFrame(resolve));
}

// Runs the assertion at phone and wide widths, in light and dark.
async function eachLayout(assertion: (wide: boolean) => Promise<void>) {
  const { page } = await import('vitest/browser');
  try {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settle();
      for (const mode of ['light', 'dark'] as const) {
        applyTheme('default', mode);
        await assertion(width >= 720);
      }
    }
  } finally {
    applyTheme('default', 'light');
  }
}

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

export const Reconnecting: Story = {
  parameters: { connection: 'reconnecting' },
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('img', { name: 'Reconnecting' }),
      ).toBeVisible();
      await expect(canvas.getByText('Reconnecting…')).toBeVisible();
      const input = canvas.getByRole('textbox', { name: 'Message' });
      await userEvent.clear(input);
      await userEvent.type(input, 'Keep this draft');
      await expect(input).toHaveValue('Keep this draft');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    }),
};

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

export const SwitchProject: Story = {
  play: async ({ canvas, userEvent }) =>
    eachLayout(async () => {
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
      await userEvent.click(
        canvas.getByRole('button', { name: `Project: ${landingProject.name}` }),
      );
      await userEvent.click(
        await overlay.findByRole('button', { name: exampleProject.name }),
      );
      await expect(
        await canvas.findByRole('button', {
          name: `Project: ${exampleProject.name}`,
        }),
      ).toBeVisible();
    }),
};

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

async function expectAgentSetup(
  canvas: ReturnType<typeof within>,
  userEvent: {
    click: (element: Element) => Promise<void>;
    keyboard: (text: string) => Promise<void>;
  },
  wide: boolean,
  availability: 'not_installed' | 'not_signed_in',
) {
  const catalog =
    availability === 'not_installed'
      ? newSessionCatalogs.oneNotInstalled
      : newSessionCatalogs.oneNotSignedIn;
  const agent = catalog.find((entry) => entry.availability === availability);
  if (!agent) throw new Error('Missing Agent mock.');
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Agent and model' }),
  );
  if (!wide)
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Choose Agent' }),
    );
  // The overlay closed at the last width can still be fading out, so look for a visible copy.
  const status =
    availability === 'not_installed' ? 'Not installed' : 'Not signed in';
  await waitFor(() =>
    expect(
      overlay.getAllByText(status).some((element) => element.checkVisibility()),
    ).toBe(true),
  );
  await expect(
    overlay.getByRole('button', { name: `Select ${agent.label}` }),
  ).toBeDisabled();
  recorder.reset();
  await userEvent.click(
    overlay.getByRole('button', { name: `Set up ${agent.label}` }),
  );
  await expect(recorder.destinations).toEqual([
    { to: 'settings-agent', agent: agent.agent },
  ]);
  await userEvent.keyboard('{Escape}');
}

export const AgentNotInstalled: Story = {
  parameters: { trpc: notInstalledNewSessionMocks },
  play: async ({ canvas, userEvent }) =>
    eachLayout((wide) =>
      expectAgentSetup(canvas, userEvent, wide, 'not_installed'),
    ),
};

export const AgentNotSignedIn: Story = {
  parameters: { trpc: notSignedInNewSessionMocks },
  play: async ({ canvas, userEvent }) =>
    eachLayout((wide) =>
      expectAgentSetup(canvas, userEvent, wide, 'not_signed_in'),
    ),
};

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

export const FailedStart: Story = {
  parameters: { trpc: failedStartNewSessionMocks },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Message' }),
      'Fix the flaky login test',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
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
