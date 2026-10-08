import {
  newSessionCatalogs,
  newSessionProjects,
  serverInfo,
} from '@repo/api/mocks';
import type { SessionNewInput } from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { composerImages } from '../../mocks/composer-mock';
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
import { fails, pending } from '../../mocks/trpc-mock-link';
import { createNavigationRecorder } from '../../mocks/with-navigation-mocks';
import { ContentLayout } from '../components/content-layout';
import { NewSessionScreen } from './new-session-screen';

const agentModelLabel = 'Agent and model';
const loginTestPrompt = 'Fix the flaky login test';
const imagePickerDraft = 'Keep this draft while choosing images.';
const failedImageName = 'failed-selection.png';

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
  return { agent, model, effort, nextModel, unsupported, defaultEffort };
});

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
        await canvas.findByRole('button', { name: 'Send' }),
      ).toBeDisabled();
      await userEvent.click(
        await canvas.findByRole('button', { name: agentModelLabel }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: 'Choose Agent' }),
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
        await waitFor(() => {
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
            expect(choice.top).toBeGreaterThanOrEqual(menu.top);
            expect(action.bottom).toBeLessThanOrEqual(menu.bottom);
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
        await canvas.findByRole('button', { name: agentModelLabel }),
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
      loginTestPrompt,
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
      ).toHaveValue(loginTestPrompt);
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
      loginTestPrompt,
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
      ).toHaveValue(loginTestPrompt);
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

function effortFollowsModel(width: number, agentIndex: number): Story {
  const recorded = effortModelCases[agentIndex];
  if (!recorded)
    throw new Error(
      'Recorded catalog needs two Agents with model effort levels.',
    );
  const { agent, model, effort, nextModel, unsupported, defaultEffort } =
    recorded;
  return {
    parameters: { trpc: { 'agents.list': () => [agent] } },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = await canvas.findByRole('button', {
        name: agentModelLabel,
      });
      await userEvent.click(trigger);
      await userEvent.click(
        await overlay.findByRole('button', {
          name: `Set effort to ${unsupported.name}`,
        }),
      );
      await expect(
        overlay.getByRole('slider', { name: 'Effort' }),
      ).toHaveAttribute('aria-valuetext', unsupported.name);
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
      await expect(
        await overlay.findByRole('button', {
          name: `Set effort to ${defaultEffort.name}`,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        overlay.getByRole('slider', { name: 'Effort' }),
      ).toHaveAttribute('aria-valuetext', defaultEffort.name);
      await expect(
        overlay.queryByRole('button', {
          name: `Set effort to ${unsupported.name}`,
        }),
      ).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('switch', { name: 'Fast mode' }),
      ).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await userEvent.type(
        canvas.getByRole('textbox', { name: 'Message' }),
        'Use this model and effort',
      );
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
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

const uploadCatalogs = newSessionCatalogs.bothAvailable.map((agent, index) => {
  const image = composerImages[index];
  if (!image)
    throw new Error(`Recorded catalog needs an image for ${agent.label}.`);
  return { agent, image };
});

function failedUpload(width: number, agentIndex: 0 | 1): Story {
  const catalog = uploadCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  let calls = 0;
  const failure = 'The Server could not store the image.';
  return {
    beforeEach: () => {
      calls = 0;
    },
    parameters: {
      trpc: {
        ...newSessionMocks,
        'agents.list': () => [catalog.agent],
        'blob.upload': fails(failure),
        'session.new': () => {
          calls += 1;
          return { sessionId: 'unexpected-session' };
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const message = await canvas.findByRole('textbox', { name: 'Message' });
      await userEvent.type(message, 'Name the dominant color in this image.');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Attach images' }),
      );
      await userEvent.click(
        await within(document.body).findByRole('button', {
          name: width === layoutWidths.wide ? 'Files and Folder' : 'Photos',
        }),
      );
      const file = new File(
        [await (await fetch(catalog.image.uri)).blob()],
        catalog.image.name,
        { type: 'image/png' },
      );
      await userEvent.upload(
        await within(document.body).findByTestId('file-input'),
        file,
      );
      await expect(
        await canvas.findByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
      const alert = await canvas.findByRole('alert');
      await expect(alert.textContent).toBe(
        `Couldn't upload the image. ${failure}`,
      );
      await expect(alert).toBeVisible();
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue('Name the dominant color in this image.');
      await expect(
        canvas.getByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeEnabled();
      await expect(calls).toBe(0);
    },
  };
}
export const FailedUploadPhoneFirstAgent = failedUpload(layoutWidths.phone, 0);
export const FailedUploadPhoneSecondAgent = failedUpload(layoutWidths.phone, 1);
export const FailedUploadWideFirstAgent = failedUpload(layoutWidths.wide, 0);
export const FailedUploadWideSecondAgent = failedUpload(layoutWidths.wide, 1);

function failedPick(width: number, agentIndex: 0 | 1): Story {
  const catalog = uploadCatalogs[agentIndex];
  if (!catalog) throw new Error('Recorded catalog needs both Agents.');
  let calls = 0;
  let restorePicker = () => {};
  return {
    beforeEach: () => {
      restorePicker();
      calls = 0;
      return () => restorePicker();
    },
    parameters: {
      trpc: {
        ...newSessionMocks,
        'agents.list': () => [catalog.agent],
        'session.new': () => {
          calls += 1;
          return { sessionId: 'unexpected-session' };
        },
      },
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const bytes = await (await fetch(catalog.image.uri)).blob();
      const attachImage = async (name: string) => {
        await userEvent.click(
          canvas.getByRole('button', { name: 'Attach images' }),
        );
        const menuName =
          width === layoutWidths.wide ? 'Files and Folder' : 'Photos';
        const menu = await within(document.body).findByRole('button', {
          name: menuName,
        });
        await waitFor(() => expect(menu).toBeVisible());
        await userEvent.click(menu);
        await userEvent.upload(
          await within(document.body).findByTestId('file-input'),
          new File([bytes], name, { type: 'image/png' }),
        );
        await waitFor(() =>
          expect(
            within(document.body).queryByRole('button', { name: menuName }),
          ).toBeNull(),
        );
      };
      await userEvent.type(
        await canvas.findByRole('textbox', { name: 'Message' }),
        imagePickerDraft,
      );
      await attachImage(catalog.image.name);
      await expect(
        await canvas.findByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      const picker = spyOn(URL, 'createObjectURL').mockImplementationOnce(
        () => {
          throw new Error('Image selection failed');
        },
      );
      restorePicker = () => picker.mockRestore();
      try {
        await attachImage(failedImageName);
        const alert = await canvas.findByRole('alert');
        await expect(alert.textContent).toBe(
          "Couldn't select images. Try again.",
        );
        await expect(alert).toBeVisible();
        await expect(
          canvas.getByRole('textbox', { name: 'Message' }),
        ).toHaveValue(imagePickerDraft);
        await expect(
          canvas.getByRole('img', { name: catalog.image.name }),
        ).toBeVisible();
        await expect(
          canvas.queryByRole('img', { name: failedImageName }),
        ).toBeNull();
        await expect(
          canvas.getAllByRole('button', { name: /^Remove / }),
        ).toHaveLength(1);
        await expect(
          canvas.queryByRole('button', { name: 'Retry' }),
        ).toBeNull();
        await expect(calls).toBe(0);
        await expect(picker).toHaveBeenCalledOnce();
      } finally {
        picker.mockRestore();
      }
      await attachImage('retry-selection.png');
      await expect(
        await canvas.findByRole('img', { name: 'retry-selection.png' }),
      ).toBeVisible();
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(
        canvas.getByRole('img', { name: catalog.image.name }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('img', { name: failedImageName }),
      ).toBeNull();
      await expect(
        canvas.getAllByRole('button', { name: /^Remove / }),
      ).toHaveLength(2);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toHaveValue(imagePickerDraft);
      await expect(calls).toBe(0);
    },
  };
}
export const FailedPickPhoneFirstAgent = failedPick(layoutWidths.phone, 0);
export const FailedPickPhoneSecondAgent = failedPick(layoutWidths.phone, 1);
export const FailedPickWideFirstAgent = failedPick(layoutWidths.wide, 0);
export const FailedPickWideSecondAgent = failedPick(layoutWidths.wide, 1);
