import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { RequestMock } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import {
  elicitationProps,
  elicitationMocks,
  emptyAnswersRequest,
  configurationRequest,
} from '../request.mocks';
import { ElicitationOutcome } from './elicitation-outcome';

const meta = { ...elicitationTestMeta, title: 'Tests/ElicitationForm/Outcome' };

export default meta;

export const AcceptedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={configurationRequest}
      answer={{
        action: 'accept',
        content: { name: 'argo-server', port: 3000, enableLogging: false },
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/answered/)).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Name, argo-server' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Port, 3000' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('group', { name: 'Enable logging, No' }),
    ).toBeVisible();
    await expect(canvas.getByText('No', { exact: true })).toBeVisible();
  },
};

export const DeclinedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={configurationRequest}
      answer={{ action: 'decline' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/declined/)).toBeVisible();
  },
};

export const DismissedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={configurationRequest}
      answer={{ action: 'cancel' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/dismissed/)).toBeVisible();
  },
};

export const EmptyAcceptedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={emptyAnswersRequest}
      answer={{
        action: 'accept',
        content: { options: [], choice: '', 'detail.name': 'release' },
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('group', { name: 'Choice, None' }),
    ).toBeVisible();
    await expect(canvas.getByRole('group', { name: 'Options' })).toBeVisible();
  },
};

// Each Agent's recorded Elicitation draws its message.
function recordedRequest(mock: RequestMock, width: number): Story {
  const props = elicitationProps({ mock });

  return {
    args: props,
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getAllByText(props.request.message).length,
      ).toBeGreaterThan(0);
    },
  };
}

const [firstRecordedAgent, secondRecordedAgent] = elicitationMocks;

if (!firstRecordedAgent || !secondRecordedAgent)
  throw new Error('Recorded catalog needs both Agents.');

export const RecordedFirstAgentPhone: Story = recordedRequest(
  firstRecordedAgent,
  layoutWidths.phone,
);

export const RecordedFirstAgentWide: Story = recordedRequest(
  firstRecordedAgent,
  layoutWidths.wide,
);

export const RecordedSecondAgentPhone: Story = recordedRequest(
  secondRecordedAgent,
  layoutWidths.phone,
);

export const RecordedSecondAgentWide: Story = recordedRequest(
  secondRecordedAgent,
  layoutWidths.wide,
);
