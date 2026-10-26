import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import {
  subagentStates,
  runningSubagent,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { subagentsSession } from './session-detail-view-subagents.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchAgents',
  parameters: { screenPreview: true },
  args: { view: subagentsSession },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleViewport(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const cardId = 'workbench-subagents';

const activeTitle = runningSubagent.title;

const [completedAgent] = subagentStates.allFinished;

if (!completedAgent) throw new Error('Agents fixture needs a completed Agent');

const completedTitle = completedAgent.title;

export const ActivePreviewAndDoneGroup: Story = {
  play: async ({ canvas, userEvent }) => {
    const card = await canvas.findByRole('button', {
      name: 'Open Agents overview',
    });

    const content = within(canvas.getByTestId(cardId));

    await expect(content.getByText(activeTitle)).toBeVisible();
    await expect(content.getByText('2 done')).toBeVisible();
    await expect(content.getByLabelText('Running')).toBeVisible();
    await expect(content.getByLabelText('Needs input')).toBeVisible();
    await expect(content.queryByText(completedTitle)).toBeNull();
    await userEvent.click(card);
    await expect(canvas.getByRole('tab', { name: 'Agents: 4' })).toBeVisible();
  },
};

export const DisclosureKeepsInspectorClosed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Collapse Agents' }),
    );
    await waitFor(() => expect(canvas.queryByText(activeTitle)).toBeNull());
    await expect(canvas.queryByText('2 done')).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Show Inspector' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Agents' }),
    );
    await expect(canvas.getByText(activeTitle)).toBeVisible();
    await expect(canvas.getByText('2 done')).toBeVisible();
  },
};

export const CompletedAgentsStayGrouped: Story = {
  args: {
    view: {
      ...subagentsSession,
      subagents: {
        ...subagentsSession.subagents,
        subagents: subagentStates.allFinished,
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const card = await canvas.findByRole('button', {
      name: 'Open Agents overview',
    });

    await expect(
      within(canvas.getByTestId(cardId)).getByText('2 done'),
    ).toBeVisible();
    await expect(
      within(canvas.getByTestId(cardId)).queryByLabelText('Running'),
    ).toBeNull();
    await expect(
      within(canvas.getByTestId(cardId)).queryByText(completedTitle),
    ).toBeNull();
    await userEvent.click(card);
    await expect(canvas.getByRole('tab', { name: 'Agents: 2' })).toBeVisible();
  },
};
