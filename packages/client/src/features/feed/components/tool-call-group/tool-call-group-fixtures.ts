import type { ImageContent, ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { permissionMock } from '../../../../../mocks/requests/recorded-requests';
import { recordedUserMessage } from '../../../../lib/product/feed-message.mocks';
import type { FeedActivity, FeedGroup } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';
import { toolCallGroupMock } from '../tool-call.mocks';
import type { ToolCallGroupProps } from './tool-call-group';

// A story supplies the activity drawing; a fixture is the group and its clock.
type ToolCallGroupFixture = Omit<ToolCallGroupProps, 'renderActivity'>;

// A running group: its live Tool call heads the disclosure and the duration counts up.
export const runningGroup = {
  group: toolCallGroupMock.running,
  now: toolCallGroupMock.now,
} satisfies ToolCallGroupFixture;

// Opened while running: the command runs behind the read it followed, as a row of its own (#2044).
export const runningExpandedGroup = {
  ...runningGroup,
  initialOpen: true,
} satisfies ToolCallGroupFixture;

// Parallel calls: the earlier command still runs, so the later read stays in the list.
export const parallelGroup = {
  group: toolCallGroupMock.parallel,
  now: toolCallGroupMock.now,
  initialOpen: true,
} satisfies ToolCallGroupFixture;

export const settledGroup = {
  group: toolCallGroupMock.group,
} satisfies ToolCallGroupFixture;

type RecordedGroup = (typeof permissionMock)['pending'];

function recordedGroup({ rows, snapshot }: RecordedGroup): FeedGroup {
  const group = toFeedView(rows, snapshot).items.find(
    (item): item is FeedGroup => item.type === 'group',
  );

  if (!group) throw new Error('The permission recording needs a group.');

  return group;
}

// The Tool call waits on the user: the group carries the Awaiting approval notice.
export const awaitingApprovalGroup = {
  group: recordedGroup(permissionMock.pending),
} satisfies ToolCallGroupFixture;

// The user allowed it once: the recorded outcome closes the group.
export const allowedOnceGroup = {
  group: recordedGroup(permissionMock.answered),
} satisfies ToolCallGroupFixture;

// A recorded non-zero exit changes the group's collapsed summary.
const commandOutcomes = recordedFeedMocks.find(
  (mock) => mock.recording === 'command-outcomes',
);

if (!commandOutcomes)
  throw new Error('Recorded catalog needs command outcomes');

export const failedCommandsGroup = {
  group: recordedGroup(commandOutcomes),
} satisfies ToolCallGroupFixture;

const allowedCall = allowedOnceGroup.group.items
  .flatMap((item) => (item.type === 'tool_call' ? [item.row] : []))
  .find((row) => row._meta?.argo?.permissionOutcome);

if (!allowedCall)
  throw new Error('Recorded catalog needs an answered Tool call');

export const allowedOnceHeaderGroup = {
  group: {
    ...allowedOnceGroup.group,
    items: [{ type: 'tool_call' as const, row: allowedCall }],
    liveHeader: {
      text: allowedCall.title,
      source: {
        type: 'tool_call' as const,
        toolCallId: allowedCall.toolCallId,
      },
      startedAt: null,
    },
  },
} satisfies ToolCallGroupFixture;

function requireRecordedImage(): ImageContent {
  const image = recordedUserMessage('agent-1', 'image-prompt').content.find(
    (block): block is ImageContent => block.type === 'image',
  );

  if (!image) throw new Error('Recorded catalog needs a prompt image.');

  return image;
}

const recordedImage = requireRecordedImage();

const imagePaths = [
  'docs/screens/feed-before.png',
  'docs/screens/feed-after.png',
];

const imageOutput = (): ToolCallUpdate['content'] => [
  {
    type: 'content',
    content: { type: 'image', mimeType: 'image/png', blob: recordedImage.blob },
  },
];

// A recorded read as if it had read an image: the Engine stores the image as a Blob.
function asImageRead(
  row: ToolCallUpdate,
  path: string,
  index: number,
): ToolCallUpdate {
  return {
    ...row,
    id: `${row.id}-image-${index}`,
    title: `Read ${path}`,
    locations: [{ path }],
    rawInput: { file_path: path },
    rawOutput: undefined,
    content: imageOutput(),
  };
}

// Two image reads before the recorded text read, so the exploration mixes both.
function withImageCalls(item: FeedActivity): FeedActivity {
  if (item.type !== 'exploration') return item;
  const [first] = item.toolCalls;

  const images = first
    ? imagePaths.map((path, index) => asImageRead(first, path, index))
    : [];

  return { ...item, toolCalls: [...images, ...item.toolCalls] };
}

function withImageReads(group: FeedGroup): FeedGroup {
  return {
    ...group,
    title: 'Ran 1 command, Read 3 files',
    items: group.items.map(withImageCalls),
  };
}

// Two reads returned images: the header ends in their thumbnails.
export const imageReadsGroup = {
  group: withImageReads(toolCallGroupMock.group),
} satisfies ToolCallGroupFixture;

// Opened: each image read ends in its thumbnail; the text read is unchanged.
export const imageReadsExpandedGroup = {
  ...imageReadsGroup,
  initialOpen: true,
} satisfies ToolCallGroupFixture;
