import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { OnboardingView } from './onboarding-view';
import {
  onboardingArgs,
  githubButtons,
  githubSteps,
  serverName,
} from './onboarding-view.mocks';

const addProject = 'Add Project';

const meta = {
  title: 'Tests/Screens/Onboarding/Set up Argo',
  component: OnboardingView,
  parameters: { screenPreview: true },
  args: onboardingArgs(),
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof OnboardingView>;

export default meta;

type Story = StoryObj<typeof meta>;

const noAgent = { status: 'not-installed' } as const;

export const DoneStepsShowTheAccount: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: 'Set up Argo', level: 1 }),
    ).toBeVisible();
    await expect(canvas.getByText(new RegExp(serverName))).toBeVisible();
    await expect(
      canvas.getByRole('heading', { name: 'Agent Setup' }),
    ).toBeVisible();
    await expect(canvas.getAllByLabelText('Done')).toHaveLength(2);
    await expect(canvas.getByLabelText('Step 3')).toBeVisible();
  },
};

type Handler = 'onAddAgent' | 'onAddProject';

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

export const AddAgentOpensAgents = pressCalls('Add Agent', 'onAddAgent');

export const AddProjectAddsOne = pressCalls(addProject, 'onAddProject');

export const ProjectCanComeBeforeAnAgent: Story = {
  args: { agent: noAgent },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: addProject }),
    ).toBeEnabled();
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
    await expect(canvas.queryByText(new RegExp(serverName))).toBeNull();
    await expect(
      canvas.getByRole('heading', { name: 'Set up Argo', level: 1 }),
    ).toBeVisible();
  },
};
