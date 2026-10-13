import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { GetStartedView } from './get-started-view';
import {
  agentName,
  getStartedArgs,
  githubButtons,
  githubLogin,
  githubSteps,
  serverName,
} from './get-started-view.mocks';

const addProject = 'Add Project';

const meta = {
  title: 'Tests/Screens/Setup/Get started',
  component: GetStartedView,
  parameters: { screenPreview: true },
  args: getStartedArgs(),
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof GetStartedView>;
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
    await expect(canvas.getByText(`Connected as ${githubLogin}`)).toBeVisible();
    await expect(canvas.getAllByLabelText('Done')).toHaveLength(2);
    await expect(canvas.getByLabelText('Step 3')).toBeVisible();
  },
};

export const EachStepCallsItsAction: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    await expect(args.onChangeAgent).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: githubButtons.anotherAccount }),
    );
    await expect(args.onConnectGitHub).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: addProject }));
    await expect(args.onAddProject).toHaveBeenCalledOnce();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Use Argo on your phone' }),
    );
    await expect(args.onUseOnPhone).toHaveBeenCalledOnce();
  },
};

export const NoAgentFoundChecksAgain: Story = {
  args: { agent: noAgent },
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByText(/No coding Agent found on this computer/),
    ).toBeVisible();
    await expect(canvas.getByLabelText('Step 1')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Change' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Check again' }));
    await expect(args.onCheckAgentAgain).toHaveBeenCalledOnce();
    // A Project can still be added first.
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
