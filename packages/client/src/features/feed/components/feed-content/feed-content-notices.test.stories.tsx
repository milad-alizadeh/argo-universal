import type { Meta } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { Feed } from '../feed/feed';
import {
  type FeedPlayContext,
  feedContentArgs,
  supportedContent,
} from './feed-content.mocks';

const meta = {
  title: 'Tests/FeedContent',
  component: Feed,
  parameters: { screenPreview: true },
  args: feedContentArgs,
} satisfies Meta<typeof Feed>;

export default meta;

const compactingLabel = 'Compacting context';

async function drawsNotices({ canvas }: FeedPlayContext): Promise<void> {
  await expect(
    canvas.getByRole('status', {
      name: 'warning: Context almost full',
    }),
  ).toBeVisible();
  await expect(
    canvas.getByText('Unknown severity: future-severity'),
  ).toBeVisible();
}

async function drawsCompaction({ canvas }: FeedPlayContext): Promise<void> {
  await expect(
    canvas.getByRole('status', { name: `info: ${compactingLabel}` }),
  ).toBeVisible();

  for (const text of [
    'Unknown compaction status: constructor',
    'Compaction could not finish',
  ])
    await expect(canvas.getByText(text)).toBeVisible();
  await expect(
    canvas.queryByText('Live context summary'),
  ).not.toBeInTheDocument();
}

async function drawsToolContent({
  canvas,
  userEvent,
}: FeedPlayContext): Promise<void> {
  await userEvent.click(canvas.getByRole('button', { name: /Lookup/ }));
  await expect(canvas.getByText('Tool reference')).toBeVisible();
  await expect(canvas.getByText('Unsupported terminal content')).toBeVisible();
}

export const NoticesFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  drawsNotices,
);

export const NoticesFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  drawsNotices,
);

export const NoticesSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  drawsNotices,
);

export const NoticesSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  drawsNotices,
);

export const CompactionFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  drawsCompaction,
);

export const CompactionFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  drawsCompaction,
);

export const CompactionSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  drawsCompaction,
);

export const CompactionSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  drawsCompaction,
);

export const ToolFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  drawsToolContent,
);

export const ToolFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  drawsToolContent,
);

export const ToolSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  drawsToolContent,
);

export const ToolSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  drawsToolContent,
);
