import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { OnboardingView } from './onboarding-view';
import {
  agentName,
  onboardingArgs,
  githubButtons,
  githubSteps,
  serverName,
} from './onboarding-view.mocks';

const addProject = 'Add Project';

const meta = {
  title: 'Tests/Screens/Setup/Onboarding',
  component: OnboardingView,
  parameters: { screenPreview: true },
  args: onboardingArgs(),
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof OnboardingView>;
export default meta;
type Story = StoryObj<typeof meta>;

const noAgent = { status: 'not-found', checking: false } as const;

export const DoneStepsShowTheAccount: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Set up Argo', level: 1 }),
    ).toBeVisible();
    await expect(
      canvas.getByText(`Server running on ${serverName}`),
    ).toBeVisible();
    await expect(
      canvas.getByText(`${agentName}, signed in with your subscription.`),
    ).toBeVisible();
    await expect(canvas.getAllByLabelText('Done')).toHaveLength(2);
    await expect(canvas.getByLabelText('Step 3')).toBeVisible();
  },
};

type Handler =
  | 'onChangeAgent'
  | 'onCheckAgentAgain'
  | 'onAddProject'
  | 'onUseOnPhone';

// Pressing the button calls its handler.
const pressCalls = (
  button: string,
  handler: Handler,
  args: Partial<Story['args']> = {},
): Story => ({
  args,
  play: async ({ args: { [handler]: onPress }, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: button }));
    await expect(onPress).toHaveBeenCalledOnce();
  },
});

export const ChangeOpensAgents = pressCalls('Change', 'onChangeAgent');

export const AddProjectAddsOne = pressCalls(addProject, 'onAddProject');

export const UseOnPhoneOpensDevices = pressCalls(
  'Use Argo on your phone',
  'onUseOnPhone',
);

export const CheckAgainLooksAgain = pressCalls(
  'Check again',
  'onCheckAgentAgain',
  { agent: noAgent },
);

export const NoAgentFoundWaitsOnStep1: Story = {
  args: { agent: noAgent },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/No coding Agent found on this computer/),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Step 1')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Change' })).toBeNull();
  },
};

export const ProjectCanComeBeforeAnAgent: Story = {
  args: { agent: noAgent },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: addProject }),
    ).toBeEnabled();
  },
};

export const CheckingAgainWaits: Story = {
  args: { agent: { status: 'not-found', checking: true } },
  play: async ({ canvas }) => {
    const checkAgain = canvas.getByRole('button', { name: 'Check again' });
    await expect(checkAgain).toBeDisabled();
    await expect(checkAgain).toHaveAttribute('aria-busy', 'true');
  },
};

// Today's App: no GitHub sign-in or Add Project flow, so those buttons stay disabled.
export const UnbuiltActionsAreDisabled: Story = {
  args: {
    github: githubSteps.notConnected,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: githubButtons.connect }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: addProject }),
    ).toBeDisabled();
    await expect(canvas.getByLabelText('Step 2')).toBeVisible();
  },
};

export const ServerNameWaitsForTheServer: Story = {
  args: { serverName: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Server running on/)).toBeNull();
    await expect(
      canvas.getByRole('heading', { name: 'Set up Argo', level: 1 }),
    ).toBeVisible();
  },
};
