import type { ContentBlock, ImageContent } from '@repo/contracts';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  recordedAgentMessage,
  recordedFeedMock,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import { commandTitle } from '../command-row/command-row-play.mocks';
import { imageReadsGroup } from '../tool-call-group/tool-call-group-fixtures';
import { completedCommand } from '../tool-call.mocks';
import { Feed } from './feed';
import { feedScrollId, scrolledToEnd } from './feed-reader.mocks';
import { feedArgs } from './paged-feed.mocks';

const { snapshot } = recordedFeedMock('agent-1', 'markdown-answer');

const recordedPrompt = recordedUserMessage('agent-1', 'image-prompt');

// The recorded prompt's images under another name, so each image in the Feed is told apart by its label.
const imagesNamed = (name: string): ImageContent[] =>
  recordedPrompt.content.flatMap((block: ContentBlock) =>
    block.type === 'image' ? [{ ...block, name }] : [],
  );

const promptImage = 'prompt.png';

const answerImage = 'answer.png';

// The two images the group's reads returned, drawn on its header and again on each read's row.
const beforeImage = 'feed-before.png';

const afterImage = 'feed-after.png';

if (imagesNamed(promptImage).length !== 1)
  throw new Error('Recorded catalog needs one image in the image prompt');

const promptItems = toFeedView(
  [
    {
      ...recordedPrompt,
      id: 'image-prompt-row',
      content: imagesNamed(promptImage),
    },
  ],
  snapshot,
).items;

const answerItems = toFeedView(
  [
    {
      ...recordedAgentMessage('agent-1', 'markdown-answer'),
      id: 'image-answer-row',
      content: imagesNamed(answerImage),
    },
  ],
  snapshot,
).items;

const meta = {
  title: 'Tests/Feed/Images',
  component: Feed,
  parameters: { screenPreview: true },
  args: {
    ...feedArgs,
    items: [...promptItems, ...answerItems, imageReadsGroup.group],
  },
} satisfies Meta<typeof Feed>;

export default meta;

type Story = StoryObj<typeof meta>;

type Play = Parameters<NonNullable<Story['play']>>[0];

const body = within(document.body);

const thumbnail = (name: string) => ({ name: `Open image, ${name}` }) as const;

const shows = (name: string): Promise<void> =>
  waitFor(() =>
    expect(
      within(body.getByRole('dialog')).getByRole('img', { name }),
    ).toBeInTheDocument(),
  );

const closed = (): Promise<void> =>
  waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument());

// Presses one arrow key per name, and expects the open image to be that name after each.
async function steps(
  { userEvent }: Play,
  key: 'ArrowLeft' | 'ArrowRight',
  names: string[],
): Promise<void> {
  for (const name of names) {
    await userEvent.keyboard(`{${key}}`);
    await shows(name);
  }
}

// Opened, the group draws each read's image twice: on its header and on the read's own row.
async function openGroup({ canvas, userEvent }: Play): Promise<void> {
  await userEvent.click(
    await canvas.findByRole('button', { name: imageReadsGroup.group.title }),
  );
  await waitFor(() =>
    expect(canvas.getAllByRole('button', thumbnail(beforeImage))).toHaveLength(
      2,
    ),
  );
}

function stepsThroughImages(width: number): Story {
  return {
    play: async (context) => {
      const { canvas, userEvent } = context;
      await settleLayout(width);
      await openGroup(context);

      await userEvent.click(canvas.getByRole('button', thumbnail(promptImage)));
      await shows(promptImage);
      // The first image is the start: Left does not wrap to the last.
      await steps(context, 'ArrowLeft', [promptImage]);
      // An image drawn on the header and on its row is one stop, and the last image is the end.
      await steps(context, 'ArrowRight', [
        answerImage,
        beforeImage,
        afterImage,
        afterImage,
      ]);
      await steps(context, 'ArrowLeft', [beforeImage, answerImage]);
      await userEvent.keyboard('{Escape}');
      await closed();

      // With no image open the keys open nothing.
      await userEvent.keyboard('{ArrowRight}');
      await expect(body.queryByRole('dialog')).not.toBeInTheDocument();
    },
  };
}

export const StepsThroughImagesPhone = stepsThroughImages(layoutWidths.phone);

export const StepsThroughImagesWide = stepsThroughImages(layoutWidths.wide);

// A read's own row opens the same stop its header thumbnail does.
function stepsFromReadRow(width: number): Story {
  return {
    play: async (context) => {
      const { canvas, userEvent } = context;
      await settleLayout(width);
      await openGroup(context);

      const onRow = canvas.getAllByRole('button', thumbnail(afterImage)).at(-1);

      if (!onRow) throw new Error('Expected the read row thumbnail');
      await userEvent.click(onRow);
      await shows(afterImage);
      await steps(context, 'ArrowRight', [afterImage]);
      await steps(context, 'ArrowLeft', [beforeImage, answerImage]);
    },
  };
}

export const StepsFromReadRowPhone = stepsFromReadRow(layoutWidths.phone);

export const StepsFromReadRowWide = stepsFromReadRow(layoutWidths.wide);

// The Long Feed's newest page without the rows that hold images of their own, so only the first and last rows hold one.
const rowsWithoutImages = feedArgs.items.filter(
  (item) => !JSON.stringify(item).includes('"type":"image"'),
);

if (rowsWithoutImages.length < 100)
  throw new Error('Recorded catalog needs a long Feed of rows without images');

const commandImage = 'command.png';

// A recorded command as if it had also returned an image, which its row draws in its output.
const commandWithImage = {
  type: 'tool_call' as const,
  row: {
    ...completedCommand,
    id: 'image-command-row',
    content: [
      ...completedCommand.content,
      ...imagesNamed(commandImage).map((content) => ({
        type: 'content' as const,
        content,
      })),
    ],
  },
};

// An image a command returned is drawn in the command's own output, and is a stop like any other.
function stepsFromCommandOutput(width: number): Story {
  return {
    args: { items: [...answerItems, commandWithImage] },
    play: async (context) => {
      const { canvas, userEvent } = context;
      await settleLayout(width);
      await userEvent.click(
        await canvas.findByRole('button', { name: commandTitle }),
      );
      await userEvent.click(
        await canvas.findByRole('button', thumbnail(commandImage)),
      );
      await shows(commandImage);
      await steps(context, 'ArrowLeft', [answerImage]);
      await steps(context, 'ArrowRight', [commandImage, commandImage]);
    },
  };
}

export const StepsFromCommandOutputPhone = stepsFromCommandOutput(
  layoutWidths.phone,
);

export const StepsFromCommandOutputWide = stepsFromCommandOutput(
  layoutWidths.wide,
);

const olderRowsAsked = fn();

/*
 * A long Feed between its first image and its last: opened at the end, the first image's row is not
 * drawn. Left still reaches it, stops there without asking for older rows, and closing leaves the
 * Feed where it was.
 */
function reachesImageNotDrawn(width: number): Story {
  return {
    args: {
      items: [...promptItems, ...rowsWithoutImages, ...answerItems],
      hasOlder: true,
      onStartReached: olderRowsAsked,
    },
    play: async (context) => {
      const { canvas, userEvent } = context;
      await settleLayout(width);
      const scroll = await canvas.findByTestId(feedScrollId);
      await waitFor(() => expect(scrolledToEnd(scroll)).toBe(true));
      await expect(
        canvas.queryByRole('button', thumbnail(promptImage)),
      ).toBeNull();
      // Rows above may still measure, so the place is where the thumbnail sits on screen, not scrollTop.
      const opener = canvas.getByRole('button', thumbnail(answerImage));
      const place = opener.getBoundingClientRect().top;
      // The Feed may ask for older rows as it opens; stepping must not ask again.
      const asked = olderRowsAsked.mock.calls.length;

      await userEvent.click(opener);
      await shows(answerImage);
      await steps(context, 'ArrowLeft', [promptImage, promptImage]);
      await expect(olderRowsAsked).toHaveBeenCalledTimes(asked);
      await userEvent.keyboard('{Escape}');
      await closed();

      await waitFor(async () => {
        const thumbnailOnReturn = canvas.getByRole(
          'button',
          thumbnail(answerImage),
        );

        await expect(
          Math.abs(thumbnailOnReturn.getBoundingClientRect().top - place),
        ).toBeLessThan(2);
        await expect(scrolledToEnd(scroll)).toBe(true);
      });
      await expect(
        canvas.queryByRole('button', thumbnail(promptImage)),
      ).toBeNull();
    },
  };
}

export const ReachesImageNotDrawnPhone = reachesImageNotDrawn(
  layoutWidths.phone,
);

export const ReachesImageNotDrawnWide = reachesImageNotDrawn(layoutWidths.wide);
