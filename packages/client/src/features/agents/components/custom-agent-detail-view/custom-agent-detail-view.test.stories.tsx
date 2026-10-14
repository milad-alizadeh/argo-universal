import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  customAgentDefinition,
  customAgentFailure,
  failsItsCheck,
  customAgentDetailArgs,
} from '../custom-agent.mocks';
import { CustomAgentDetailView } from './custom-agent-detail-view';

const answered = 'Answered ACP initialize';

const meta = {
  title: 'Tests/Screens/Settings/Custom Agent',
  component: CustomAgentDetailView,
  args: customAgentDetailArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof CustomAgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsTheSavedLaunch: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', { name: customAgentDefinition.name }),
    ).toBeVisible();
    await expect(
      canvas.getByText(customAgentDefinition.executable),
    ).toBeVisible();

    for (const argument of customAgentDefinition.args)
      await expect(canvas.getByText(argument)).toBeVisible();
    await expect(canvas.getByText(answered)).toBeVisible();
  },
};

export const ShowsWhyItCantStart: Story = {
  args: { readiness: { status: 'cant-start', reason: customAgentFailure } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(customAgentFailure)).toBeVisible();
    await expect(canvas.queryByText(answered)).toBeNull();
  },
};

// Recheck asks the Server for a new check of the saved launch.
export const RechecksAfterItCantStart: Story = {
  args: { readiness: { status: 'cant-start', reason: customAgentFailure } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByText('Recheck'));
    await expect(args.onRecheck).toHaveBeenCalledOnce();
  },
};

export const ShowsAPlaceholderForAnAgentThatIsNotCustom: Story = {
  args: { agentId: 'example-agent', definition: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('Settings for example-agent will appear here.'),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('heading', { name: customAgentDefinition.name }),
    ).toBeNull();
  },
};

export const EditsTheLaunch: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: 'Edit' }));
    const name = canvas.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed ACP');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(args.onSave).toHaveBeenCalledWith({
        ...customAgentDefinition,
        name: 'Renamed ACP',
      }),
    );
    await expect(
      await canvas.findByRole('link', { name: 'Edit' }),
    ).toBeVisible();
  },
};

export const KeepsTheFormOpenWhenTheEditFailsItsCheck: Story = {
  args: {
    onSave: failsItsCheck(),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('link', { name: 'Edit' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(await canvas.findByText('Check failed')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
  },
};

export const SignInNeededIsNotReady: Story = {
  args: {
    readiness: {
      status: 'sign-in-needed',
      reason: 'The Agent requires sign-in.',
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Sign-in needed')).toBeVisible();
    await expect(canvas.queryByText('Ready')).toBeNull();
    await expect(canvas.queryByText(answered)).toBeNull();
  },
};
