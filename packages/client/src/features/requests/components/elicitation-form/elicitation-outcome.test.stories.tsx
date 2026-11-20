import { expect } from 'storybook/test';
import {
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import { emptyAnswersRequest, configurationRequest } from '../request.mocks';
import { ElicitationOutcome } from './elicitation-outcome';

const meta = {
  ...elicitationTestMeta,
  title: 'Tests/Requests/ElicitationForm/Outcome',
};

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
