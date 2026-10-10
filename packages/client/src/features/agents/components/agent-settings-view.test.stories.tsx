import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { AgentSettingsView } from './agent-settings-view';
import {
  customAgentDefinition,
  customAgentFailure,
  customAgentId,
  failsItsCheck,
  registers,
} from './custom-agent.mocks';

const answered = 'Answered ACP initialize';

const meta = {
  title: 'Tests/AgentSettingsScreen',
  component: AgentSettingsView,
  args: {
    agentId: customAgentId,
    definition: customAgentDefinition,
    check: { status: 'ready' },
    onCheck: fn(),
    onSave: registers(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentSettingsView>;
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

export const ShowsAFailedCheck: Story = {
  args: { check: { status: 'failed', failure: customAgentFailure } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(customAgentFailure)).toBeVisible();
    await expect(canvas.queryByText(answered)).toBeNull();
  },
};

// Readiness comes from a new check each time, never from the saved record.
export const ChecksAgainAfterAFailure: Story = {
  args: { check: { status: 'failed', failure: customAgentFailure } },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Check again' }));
    await expect(args.onCheck).toHaveBeenCalledOnce();
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
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
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
      await canvas.findByRole('button', { name: 'Edit' }),
    ).toBeVisible();
  },
};

export const KeepsTheFormOpenWhenTheEditFailsItsCheck: Story = {
  args: {
    onSave: failsItsCheck(),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(await canvas.findByText('Check failed')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeVisible();
  },
};
