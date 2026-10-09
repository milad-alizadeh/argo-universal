import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { recordedAcpContent } from '../../mocks/acp-feed-content';
import { layoutWidths } from '../../mocks/each-layout';
import type { MockAgent } from '../../mocks/feed-message-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { toFeedView } from '../feed/to-feed-view';
import { Feed } from './feed';

const meta = {
  title: 'Tests/FeedContent',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    items: [],
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: (): string => '',
  },
} satisfies Meta<typeof Feed>;
export default meta;
type Story = StoryObj<typeof meta>;
const projectGuideTitle = 'Project guide';

type ContentCase = 'references' | 'notices' | 'compaction' | 'plans' | 'tool';

function supportedContent(
  viewportWidth: number,
  agent: MockAgent,
  contentCase: ContentCase,
): Story {
  const { rows, snapshot } = recordedAcpContent(agent);
  return {
    args: {
      items: toFeedView(rows, snapshot).items,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(viewportWidth);
      switch (contentCase) {
        case 'references':
          for (const text of [
            projectGuideTitle,
            'file:///project/guide.md',
            'Embedded result',
            'Unsupported image content',
          ])
            await expect(canvas.getByText(text)).toBeVisible();
          await expect(
            canvas
              .getByText('Before reference')
              .compareDocumentPosition(canvas.getByText(projectGuideTitle)) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
          await expect(
            canvas
              .getByText(projectGuideTitle)
              .compareDocumentPosition(canvas.getByText('After reference')) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
          await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
          break;
        case 'notices':
          await expect(canvas.getByText('Context almost full')).toBeVisible();
          await expect(
            canvas.getByText('Unknown severity: future-severity'),
          ).toBeVisible();
          break;
        case 'compaction':
          for (const text of [
            'Compacting context',
            'Live context summary',
            'Compaction could not finish',
            'Unknown compaction status: constructor',
          ])
            await expect(canvas.getByText(text)).toBeVisible();
          break;
        case 'plans':
          await expect(
            canvas.getByText('file:///project/plan.md'),
          ).toBeVisible();
          await expect(canvas.getByText('Read-only Plan')).toBeVisible();
          await expect(
            canvas.queryByRole('button', { name: 'Approve' }),
          ).not.toBeInTheDocument();
          break;
        case 'tool':
          await userEvent.click(canvas.getByRole('button', { name: /Lookup/ }));
          await expect(canvas.getByText('Tool reference')).toBeVisible();
          await expect(
            canvas.getByText('Unsupported terminal content'),
          ).toBeVisible();
      }
    },
  };
}
export const ReferencesFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  'references',
);
export const ReferencesFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  'references',
);
export const ReferencesSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  'references',
);
export const ReferencesSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  'references',
);
export const NoticesFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  'notices',
);
export const NoticesFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  'notices',
);
export const NoticesSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  'notices',
);
export const NoticesSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  'notices',
);
export const CompactionFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  'compaction',
);
export const CompactionFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  'compaction',
);
export const CompactionSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  'compaction',
);
export const CompactionSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  'compaction',
);
export const PlansFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  'plans',
);
export const PlansFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  'plans',
);
export const PlansSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  'plans',
);
export const PlansSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  'plans',
);
export const ToolFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  'tool',
);
export const ToolFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  'tool',
);
export const ToolSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  'tool',
);
export const ToolSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  'tool',
);
