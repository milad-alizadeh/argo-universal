import type {
  AgentCheck,
  AgentRegistration,
  CustomAgentDefinition,
  CustomAgentEditInput,
} from '@repo/contracts';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  customAgentDefinition,
  customAgentFailure,
  customAgentId,
  customAgentMocks,
} from '../../../mocks/custom-agent-mock';
import { layoutWidths } from '../../../mocks/each-layout';
import { settleViewport } from '../../../mocks/settle-viewport';
import { createNavigationRecorder } from '../../../mocks/with-navigation-mocks';
import { AgentSettingsScreen } from './agent-settings-screen';

const recorder = createNavigationRecorder();
const answered = 'Answered ACP initialize';
let checks: AgentCheck[] = [];
let checkCount = 0;
let edited: CustomAgentDefinition[] = [];

const meta = {
  title: 'Tests/AgentSettingsScreen',
  component: AgentSettingsScreen,
  args: { agent: customAgentId },
  parameters: {
    navigation: recorder,
    screenPreview: true,
    trpc: {
      ...customAgentMocks,
      'agents.check': (): AgentCheck => {
        checkCount += 1;
        return checks.shift() ?? { status: 'ready' };
      },
      'agents.editCustom': ({
        definition,
      }: CustomAgentEditInput): AgentRegistration => {
        edited.push(definition);
        return { status: 'ready', agentId: customAgentId };
      },
    },
  },
  beforeEach: async (): Promise<void> => {
    recorder.reset();
    checks = [];
    checkCount = 0;
    edited = [];
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof AgentSettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsTheSavedLaunch: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: customAgentDefinition.name }),
    ).toBeVisible();
    await expect(
      canvas.getByText(customAgentDefinition.executable),
    ).toBeVisible();
    for (const argument of customAgentDefinition.args)
      await expect(canvas.getByText(argument)).toBeVisible();
    await expect(await canvas.findByText(answered)).toBeVisible();
  },
};

// Readiness comes from a new check each time, never from the saved record.
export const ChecksAgainAfterAFailure: Story = {
  beforeEach: () => {
    checks = [{ status: 'failed', failure: customAgentFailure }];
  },
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByText(customAgentFailure)).toBeVisible();
    await expect(canvas.queryByText(answered)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Check again' }));
    await expect(await canvas.findByText(answered)).toBeVisible();
    await expect(canvas.queryByText(customAgentFailure)).toBeNull();
    await expect(checkCount).toBe(2);
  },
};

export const EditsTheLaunch: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));
    const name = canvas.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed ACP');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(edited).toEqual([
        { ...customAgentDefinition, name: 'Renamed ACP' },
      ]),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Edit' }),
    ).toBeVisible();
  },
};
