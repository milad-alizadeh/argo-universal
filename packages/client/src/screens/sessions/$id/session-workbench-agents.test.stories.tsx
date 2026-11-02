import { settleLayout } from '@repo/kit/mocks/story-layout';
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
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const cardId = 'workbench-subagents';

const activeTitle = runningSubagent.title;

export const PreviewsThreeAndShowsMore: Story = {
  play: async ({ canvas, userEvent }) => {
    const content = within(await canvas.findByTestId(cardId));

    await expect(content.getByText(activeTitle)).toBeVisible();
    await expect(content.getByLabelText('Running')).toBeVisible();
    await expect(content.getByLabelText('Needs input')).toBeVisible();
    await expect(
      content.getAllByRole('button', { name: /^Open / }),
    ).toHaveLength(3);
    await userEvent.click(content.getByRole('button', { name: 'Show 1 more' }));
    await expect(canvas.getByRole('tab', { name: 'Agents: 4' })).toBeVisible();
  },
};

export const DisclosureKeepsInspectorClosed: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Collapse Agents' }),
    );
    await waitFor(() => expect(canvas.queryByText(activeTitle)).toBeNull());
    await expect(
      canvas.getByRole('button', { name: 'Show Inspector' }),
    ).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Agents' }),
    );
    await expect(canvas.getByText(activeTitle)).toBeVisible();
  },
};

export const AFewAgentsHaveNoShowMore: Story = {
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
    const content = within(await canvas.findByTestId(cardId));

    await expect(content.queryByLabelText('Running')).toBeNull();
    await expect(content.queryByRole('button', { name: /^Show / })).toBeNull();
    const [first] = content.getAllByRole('button', { name: /^Open / });

    await userEvent.click(first ?? content.getByRole('button'));
    await expect(canvas.getByRole('tab', { name: 'Agents: 2' })).toBeVisible();
  },
};
