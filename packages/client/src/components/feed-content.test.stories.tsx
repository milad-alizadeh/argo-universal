import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor, within } from 'storybook/test';
import { recordedAcpContent } from '../../mocks/acp-feed-content';
import { layoutWidths } from '../../mocks/each-layout';
import {
  type MockAgent,
  recordedUserMessage,
  recordedAgentMessage,
  recordedFeedMock,
  recordedImageUrl,
  redSquareDataUrl,
} from '../../mocks/feed-message-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { toFeedView } from '../feed/to-feed-view';
import { Feed } from './feed';

const compactingLabel = 'Compacting context';

const meta = {
  title: 'Tests/FeedContent',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    items: [],
    liveHeader: null,
    loadingOlder: false,
    onStartReached: (): void => {},
    imageUrl: recordedImageUrl,
  },
} satisfies Meta<typeof Feed>;
export default meta;
type Story = StoryObj<typeof meta>;
const projectGuideTitle = 'Project guide';

type ContentCase = 'references' | 'notices' | 'compaction' | 'tool';

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
          await expect(
            canvas.getByLabelText('file:///project/guide.md'),
          ).toBeVisible();
          await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
          const clipboard = spyOn(
            navigator.clipboard,
            'writeText',
          ).mockResolvedValue();
          try {
            const [copyUri] = canvas.getAllByRole('button', {
              name: 'Copy URI',
            });
            if (!copyUri) throw new Error('Resource needs a Copy URI button');
            await userEvent.click(copyUri);
            await waitFor(() =>
              expect(clipboard).toHaveBeenCalledWith(
                'file:///project/guide.md',
              ),
            );
            await userEvent.click(
              canvas.getByRole('button', { name: 'Copy resource text' }),
            );
            await waitFor(() =>
              expect(clipboard).toHaveBeenCalledWith('Embedded result'),
            );
          } finally {
            clipboard.mockRestore();
          }
          break;
        case 'notices':
          await expect(
            canvas.getByRole('status', {
              name: 'warning: Context almost full',
            }),
          ).toBeVisible();
          await expect(
            canvas.getByText('Unknown severity: future-severity'),
          ).toBeVisible();
          break;
        case 'compaction':
          await expect(
            canvas.getByRole('status', { name: compactingLabel }),
          ).toBeVisible();
          for (const text of ['Unknown compaction status: constructor'])
            await expect(canvas.getByText(text)).toBeVisible();
          await expect(
            canvas.getByRole('button', { name: compactingLabel }),
          ).toBeVisible();
          await expect(
            canvas.queryByText('Live context summary'),
          ).not.toBeInTheDocument();
          await userEvent.click(
            canvas.getByRole('button', { name: compactingLabel }),
          );
          await expect(canvas.getByText('Live context summary')).toBeVisible();
          await userEvent.click(
            canvas.getByRole('button', { name: "Couldn't compact context" }),
          );
          await expect(
            canvas.getByText('Compaction could not finish'),
          ).toBeVisible();
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

function opensAgentImage(viewportWidth: number, agent: MockAgent): Story {
  const image = recordedUserMessage(agent, 'image-prompt').content.filter(
    (block) => block.type === 'image',
  );
  const row = {
    ...recordedAgentMessage(agent, 'markdown-answer'),
    content: image,
  };
  return {
    args: {
      items: toFeedView(
        [row],
        recordedFeedMock(agent, 'markdown-answer').snapshot,
      ).items,
      imageUrl: recordedImageUrl,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(viewportWidth);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open image, 32×32' }),
      );
      const dialog = await within(document.body).findByRole('dialog');
      await waitFor(() => expect(dialog).toBeVisible());
      await expect(
        within(dialog).getByRole('img', { name: '32×32' }),
      ).toHaveAttribute('src', redSquareDataUrl);
      await userEvent.keyboard('{Escape}');
      await expect(
        within(document.body).queryByRole('dialog'),
      ).not.toBeInTheDocument();
    },
  };
}
export const ImageFirstAgentPhone = opensAgentImage(
  layoutWidths.phone,
  'agent-1',
);
export const ImageFirstAgentWide = opensAgentImage(
  layoutWidths.wide,
  'agent-1',
);
export const ImageSecondAgentPhone = opensAgentImage(
  layoutWidths.phone,
  'agent-2',
);
export const ImageSecondAgentWide = opensAgentImage(
  layoutWidths.wide,
  'agent-2',
);
