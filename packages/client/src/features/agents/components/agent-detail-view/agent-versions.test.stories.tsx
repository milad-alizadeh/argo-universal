import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { AgentDetail } from '../../state/agent-detail-types';
import { AgentDetailView } from './agent-detail-view';
import { agentDetailArgs, readyAgent } from './agent-detail.mocks';

const meta = {
  title: 'Tests/Screens/Settings/Agent versions',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

const foundAgent: AgentDetail = {
  ...readyAgent,
  version: '0.9.2',
  source: 'Found on this Mac',
  distribution: undefined,
};

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const versionRow = (canvas: Canvas): HTMLElement | null =>
  canvas.queryByRole('group', { name: /^Version, / });

export const ShowsOnlyTheAdapterWhenTheAgentMatches: Story = {
  args: { agent: foundAgent },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Version, Adapter 0.9.2' }),
    ).toBeVisible();
    await expect(canvas.queryByText(/·/)).not.toBeInTheDocument();
  },
};

export const ShowsTheAgentVersionWhenItDiffers: Story = {
  args: { agent: { ...foundAgent, agentVersion: '0.47.0' } },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', {
        name: `Version, Adapter 0.9.2 · ${readyAgent.name} 0.47.0`,
      }),
    ).toBeVisible();
  },
};

export const ShowsNoVersionBeforeOneIsKnown: Story = {
  args: { agent: { ...foundAgent, version: undefined } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Found on this Mac')).toBeVisible();
    await expect(versionRow(canvas)).not.toBeInTheDocument();
  },
};

const updateAgent: AgentDetail = {
  ...foundAgent,
  status: 'update-available',
  version: '0.88.0',
  agentVersion: '0.47.0',
  availableVersion: '0.90.1',
};

const updateStory = (width: number): Story => ({
  args: { agent: updateAgent },
  beforeEach: (): Promise<void> => settleViewport(width),
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByRole('group', { name: 'Version, v0.88.0 → v0.90.1' }),
    ).toBeVisible();
    await expect(canvas.getAllByText('Update available')[0]).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Update' }));
    await expect(args.onUpdate).toHaveBeenCalledOnce();
  },
});

// Whoever installed the copy, the version line reads from → to and Update is offered.
export const ShowsAnUpdateForACopyFoundOnThisMac = updateStory(
  layoutWidths.wide,
);

export const ShowsAnUpdateForACopyFoundOnThisMacOnAPhone = updateStory(
  layoutWidths.phone,
);
