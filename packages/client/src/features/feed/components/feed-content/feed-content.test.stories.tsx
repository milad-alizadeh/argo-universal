import { layoutWidths } from '@repo/kit/each-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor } from 'storybook/test';
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

const projectGuideTitle = 'Project guide';

const embeddedName = 'result.txt';

const embeddedText = 'Embedded result';

async function copiesReference({
  canvas,
  userEvent,
}: FeedPlayContext): Promise<void> {
  const clipboard = spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

  try {
    const [copyUri] = canvas.getAllByRole('button', {
      name: 'Copy URI',
    });

    if (!copyUri) throw new Error('Resource needs a Copy URI button');
    await userEvent.click(copyUri);
    await waitFor(() =>
      expect(clipboard).toHaveBeenCalledWith('file:///project/guide.md'),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Copy resource text' }),
    );
    await waitFor(() => expect(clipboard).toHaveBeenCalledWith(embeddedText));
  } finally {
    clipboard.mockRestore();
  }
}

async function opensReferences({
  canvas,
  userEvent,
}: FeedPlayContext): Promise<void> {
  for (const text of [
    projectGuideTitle,
    embeddedName,
    'Unsupported image content',
  ])
    await expect(canvas.getByText(text)).toBeVisible();
  await expect(canvas.queryByText(embeddedText)).not.toBeInTheDocument();
  await userEvent.click(
    canvas.getByRole('button', { name: projectGuideTitle }),
  );
  await userEvent.click(canvas.getByRole('button', { name: embeddedName }));

  for (const text of ['The current guide', embeddedText])
    await expect(canvas.getByText(text)).toBeVisible();
}

async function drawsReferences(context: FeedPlayContext): Promise<void> {
  const { canvas } = context;
  await opensReferences(context);
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
  await expect(canvas.getByLabelText('file:///project/guide.md')).toBeVisible();
  await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
  await copiesReference(context);
}

export const ReferencesFirstAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-1',
  drawsReferences,
);

export const ReferencesFirstAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-1',
  drawsReferences,
);

export const ReferencesSecondAgentPhone = supportedContent(
  layoutWidths.phone,
  'agent-2',
  drawsReferences,
);

export const ReferencesSecondAgentWide = supportedContent(
  layoutWidths.wide,
  'agent-2',
  drawsReferences,
);
