import type { RequestMock } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import {
  issueTitle,
  meta as elicitationTestMeta,
  type Story,
} from '../../../../../mocks/requests/elicitation/elicitation-form-story.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  elicitationProps,
  elicitationMocks,
  emptyAnswersRequest,
  fieldsRequest,
} from '../request.mocks';
import galleryMeta, { Overview as Gallery } from './elicitation-form.stories';
import { ElicitationOutcome } from './elicitation-outcome';

const meta = { ...elicitationTestMeta, title: 'Tests/ElicitationForm' };

export default meta;

export const AcceptedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={fieldsRequest}
      answer={{
        action: 'accept',
        content: {
          title: issueTitle,
          team: 'Mobile',
          estimate: 8,
          notify: false,
        },
      }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You answered')).toBeVisible();
    await expect(canvas.getByText('No', { exact: true })).toBeVisible();
    await expect(canvas.getByText('Mobile', { exact: true })).toBeVisible();
  },
};

export const DeclinedOutcome: Story = {
  render: () => (
    <ElicitationOutcome
      request={fieldsRequest}
      answer={{ action: 'decline' }}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You declined')).toBeVisible();
  },
};

export const DismissedOutcome: Story = {
  render: () => (
    <ElicitationOutcome request={fieldsRequest} answer={{ action: 'cancel' }} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You dismissed')).toBeVisible();
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
    await expect(canvas.getByText('None', { exact: true })).toBeVisible();
  },
};

function galleryFixture(mock: RequestMock, width: number): Story {
  const props = elicitationProps({ mock });

  return {
    render: () => Gallery.render({ ...galleryMeta.args, agent: mock.agent }),
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getAllByText(props.request.message).length,
      ).toBeGreaterThan(0);
    },
  };
}

const [firstGalleryAgent, secondGalleryAgent] = elicitationMocks;

if (!firstGalleryAgent || !secondGalleryAgent)
  throw new Error('Recorded gallery needs both Agents.');

export const GalleryFirstAgentPhone: Story = galleryFixture(
  firstGalleryAgent,
  layoutWidths.phone,
);

export const GalleryFirstAgentWide: Story = galleryFixture(
  firstGalleryAgent,
  layoutWidths.wide,
);

export const GallerySecondAgentPhone: Story = galleryFixture(
  secondGalleryAgent,
  layoutWidths.phone,
);

export const GallerySecondAgentWide: Story = galleryFixture(
  secondGalleryAgent,
  layoutWidths.wide,
);
