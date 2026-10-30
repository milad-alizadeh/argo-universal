import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { recordedImageUrl } from '../../../../lib/product/feed-message.mocks';
import { Feed } from './feed';
import { type RhythmAudit, rhythmAudits } from './feed-rhythm-audit-fixtures';

const feedColumn = 'feed-column';

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
    opensAtStart: true,
  },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;

function sortedColumns(canvas: Canvas): HTMLElement[] {
  const columns: HTMLElement[] = canvas.getAllByTestId(feedColumn);

  return columns.sort(
    (left, right) =>
      left.getBoundingClientRect().top - right.getBoundingClientRect().top,
  );
}

function rhythm(audit: RhythmAudit, width: number): Story {
  const gaps = width === 390 ? audit.compact : audit.wide;

  return {
    args: {
      items: audit.items,
      liveHeader: audit.liveHeader ?? null,
      now: audit.now,
    },
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      const scroll = await canvas.findByTestId('feed-scroll');
      await canvas.findAllByTestId(feedColumn);
      await waitFor(async () => {
        const columns = sortedColumns(canvas);

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

function requiredContent(column: HTMLElement): Element {
  const content = column.firstElementChild;

  if (!content) throw new Error('The recorded Feed row needs its content');

  return content;
}

async function expectGap(
  columns: HTMLElement[],
  index: number,
  expected: number,
): Promise<void> {
  const next = requiredColumn(columns, index + 1);
  const content = requiredContent(requiredColumn(columns, index));

  const actual =
    next.getBoundingClientRect().top - content.getBoundingClientRect().bottom;

  await expect(actual).toBeCloseTo(expected, 0);
}

export const UsersPhone = rhythm(rhythmAudits.users, 390);

export const UsersDesktop = rhythm(rhythmAudits.users, 1440);

export const StreamingPhone = rhythm(rhythmAudits.streaming, 390);

export const StreamingDesktop = rhythm(rhythmAudits.streaming, 1440);

export const StatusesPhone = rhythm(rhythmAudits.statuses, 390);

export const StatusesDesktop = rhythm(rhythmAudits.statuses, 1440);

export const PermissionPhone = rhythm(rhythmAudits.permission, 390);

export const PermissionDesktop = rhythm(rhythmAudits.permission, 1440);

interface ExpansionMeasure {
  // The space the answer keeps below the prompt's drawn content.
  gap: number;
  // How tall that content is, so an opened prompt reads as grown.
  height: number;
}

function measuredGap(canvas: Canvas): ExpansionMeasure {
  const columns = sortedColumns(canvas);
  const answer = requiredColumn(columns, 1);
  const content = requiredContent(requiredColumn(columns, 0));
  const box = content.getBoundingClientRect();

  return {
    gap: answer.getBoundingClientRect().top - box.bottom,
    height: box.height,
  };
}

// The list leaves a cell it has not placed yet out of reach; a reader presses the row once it is placed.
async function placed(element: HTMLElement): Promise<void> {
  const reachable = (): boolean =>
    globalThis.getComputedStyle(element).pointerEvents !== 'none';

  await waitFor(async () => await expect(reachable()).toBe(true));
}

// Opening a clamped prompt grows its row; the answer below keeps the same space and never overlaps it.
function expansion(width: number): Story {
  const audit = rhythmAudits.expansion;
  const [gap] = width === 390 ? audit.compact : audit.wide;

  if (gap === undefined) throw new Error('The recorded expansion needs a gap');

  return {
    args: { items: audit.items },
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      await canvas.findAllByTestId(feedColumn);
      const closed = await waitFor(() => measuredGap(canvas));
      await expect(closed.gap).toBeCloseTo(gap, 0);
      const more = await canvas.findByText('Show more');
      await placed(more);
      await userEvent.click(more);
      await waitFor(async () => {
        const opened = measuredGap(canvas);

        await expect(opened.height).toBeGreaterThan(closed.height);
        await expect(opened.gap).toBeCloseTo(gap, 0);
      });
    },
  };
}

export const ExpansionPhone = expansion(390);

export const ExpansionDesktop = expansion(1440);
