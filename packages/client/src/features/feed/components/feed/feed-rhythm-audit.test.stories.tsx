import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import { Feed } from './feed';
import { type RhythmAudit, rhythmAudits } from './feed-rhythm-audit-fixtures';

const meta = {
  title: 'Tests/Feed/RhythmAudit',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    items: [],
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: recordedImageUrl,
    alignAtTop: true,
  },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

function rhythm(audit: RhythmAudit, width: number): Story {
  const gaps = width === 390 ? audit.compact : audit.wide;

  return {
    args: { items: audit.items },
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId('feed-scroll');
      await canvas.findAllByTestId('feed-column');
      await waitFor(async () => {
        const columns = canvas
          .getAllByTestId('feed-column')
          .sort(
            (left, right) =>
              left.getBoundingClientRect().top -
              right.getBoundingClientRect().top,
          );

        await expect(columns).toHaveLength(gaps.length + 1);
        await expect(scroll.scrollWidth).toBeLessThanOrEqual(
          scroll.clientWidth + 1,
        );

        for (const [index, gap] of gaps.entries())
          await expectGap(columns, index, gap);
      });
    },
  };
}

export const TransitionsPhone = rhythm(rhythmAudits.transitions, 390);

export const TransitionsDesktop = rhythm(rhythmAudits.transitions, 1440);

export const ParagraphsPhone = rhythm(rhythmAudits.paragraphs, 390);

export const ParagraphsDesktop = rhythm(rhythmAudits.paragraphs, 1440);

export const ActivityPhone = rhythm(rhythmAudits.activity, 390);

export const ActivityDesktop = rhythm(rhythmAudits.activity, 1440);

export const MarkdownPhone = rhythm(rhythmAudits.markdown, 390);

export const MarkdownDesktop = rhythm(rhythmAudits.markdown, 1440);

export const AttachmentsPhone = rhythm(rhythmAudits.attachments, 390);

export const AttachmentsDesktop = rhythm(rhythmAudits.attachments, 1440);

function requiredColumn(columns: HTMLElement[], index: number): HTMLElement {
  const column = columns[index];

  if (!column) throw new Error('Recorded rhythm needs both adjacent rows');

  return column;
}

async function expectGap(
  columns: HTMLElement[],
  index: number,
  expected: number,
): Promise<void> {
  const column = requiredColumn(columns, index);
  const next = requiredColumn(columns, index + 1);
  const content = column.firstElementChild;

  if (!content) throw new Error('The recorded Feed row needs its content');

  const actual =
    next.getBoundingClientRect().top - content.getBoundingClientRect().bottom;

  await expect(actual).toBeCloseTo(expected, 0);
}

export const UsersPhone = rhythm(rhythmAudits.users, 390);

export const UsersDesktop = rhythm(rhythmAudits.users, 1440);

export const PermissionPhone = rhythm(rhythmAudits.permission, 390);

export const PermissionDesktop = rhythm(rhythmAudits.permission, 1440);
