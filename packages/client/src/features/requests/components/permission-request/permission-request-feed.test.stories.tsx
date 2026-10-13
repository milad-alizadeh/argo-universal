import type { RequestMock } from '@repo/mocks/app';
import { expect, within } from 'storybook/test';
import { PermissionOutcome } from '#features/feed';
import {
  chosenOptionFeed,
  permissionFeed,
} from '../../../../../mocks/requests/permission/permission-feed.test.mocks';
import {
  allowedOnceAnswer,
  meta as permissionTestMeta,
  type Story,
} from '../../../../../mocks/requests/permission/permission-story-context.test.mocks';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { RequestFrame } from '../../../../lib/product/request-frame';
import { permissionProps, permissionMocks } from '../request.mocks';
import galleryMeta, { Overview as Gallery } from './permission-request.stories';

const meta = { ...permissionTestMeta, title: 'Tests/PermissionRequest' };
export default meta;

export const FirstAgentApprovalPhone = permissionFeed(390, 0, false);
export const FirstAgentApprovalWide = permissionFeed(1440, 0, false);
export const SecondAgentApprovalPhone = permissionFeed(390, 1, false);
export const SecondAgentApprovalWide = permissionFeed(1440, 1, false);
export const FirstAgentOutcomePhone = permissionFeed(390, 0, true);
export const FirstAgentOutcomeWide = permissionFeed(1440, 0, true);
export const SecondAgentOutcomePhone = permissionFeed(390, 1, true);
export const SecondAgentOutcomeWide = permissionFeed(1440, 1, true);

const chosenAlwaysAllow = {
  name: 'Always Allow',
  kind: 'allow_always',
} as const;
const chosenNeverAllow = {
  name: 'Never allow',
  kind: 'reject_always',
} as const;
export const FirstAgentAlwaysAllowPhone = chosenOptionFeed(
  390,
  0,
  chosenAlwaysAllow,
);
export const FirstAgentAlwaysAllowWide = chosenOptionFeed(
  1440,
  0,
  chosenAlwaysAllow,
);
export const SecondAgentAlwaysAllowPhone = chosenOptionFeed(
  390,
  1,
  chosenAlwaysAllow,
);
export const SecondAgentAlwaysAllowWide = chosenOptionFeed(
  1440,
  1,
  chosenAlwaysAllow,
);
export const FirstAgentNeverAllowWide = chosenOptionFeed(
  1440,
  0,
  chosenNeverAllow,
);
export const SecondAgentNeverAllowWide = chosenOptionFeed(
  1440,
  1,
  chosenNeverAllow,
);

// Rows kept before the outcome carried a name and kind still read as their native option.
export const StoredNativeOutcome: Story = {
  render: () => (
    <RequestFrame>
      <PermissionOutcome
        outcome={{ outcome: 'selected', optionId: 'allow_once' }}
      />
    </RequestFrame>
  ),
  play: async () => {
    const canvas = within(document.body);
    await settleViewport(1440);
    await expect(canvas.getByText(allowedOnceAnswer)).toBeVisible();
  },
};

function galleryFixture(mock: RequestMock, width: number): Story {
  const props = permissionProps({ mock });
  return {
    render: () => Gallery.render({ ...galleryMeta.args, agent: mock.agent }),
    play: async () => {
      const canvas = within(document.body);
      await settleViewport(width);
      await expect(
        canvas.getAllByText(props.request.title).length,
      ).toBeGreaterThan(0);
      if (!props.input) throw new Error('Recorded permission needs input.');
      await expect(
        canvas.getAllByText(props.input, { normalizer: (text): string => text })
          .length,
      ).toBeGreaterThan(0);
    },
  };
}
const [firstGalleryAgent, secondGalleryAgent] = permissionMocks;
if (!firstGalleryAgent || !secondGalleryAgent)
  throw new Error('Recorded gallery needs both Agents.');
export const GalleryFirstAgentPhone: Story = galleryFixture(
  firstGalleryAgent,
  390,
);
export const GalleryFirstAgentWide: Story = galleryFixture(
  firstGalleryAgent,
  1024,
);
export const GallerySecondAgentPhone: Story = galleryFixture(
  secondGalleryAgent,
  390,
);
export const GallerySecondAgentWide: Story = galleryFixture(
  secondGalleryAgent,
  1024,
);
