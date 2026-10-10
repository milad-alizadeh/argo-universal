import { AgentMessage as AgentMessageSchema } from '@repo/contracts';
import type {
  AgentMessage,
  BlobRef,
  SessionUpdate,
  UserMessage,
} from '@repo/contracts';
import { type FeedMock, recordedFeedMocks } from '@repo/mocks/app';
import intermediateMessages from './streaming-messages.json';

// The bytes of `mocks/agent/red-square.png`, the shared image attachment mock.
export const redSquareDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGN4piFHU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULANahsD1zXuJAAAAAAElFTkSuQmCC';

export type MockAgent = 'agent-1' | 'agent-2';

// Serves recorded images the way the Server's `/blobs/:id` would.
export function recordedImageUrl(blob: BlobRef): typeof redSquareDataUrl | '' {
  const recorded = recordedUserMessage('agent-1', 'image-prompt').content.some(
    (block) => block.type === 'image' && block.blob.blobId === blob.blobId,
  );
  return recorded ? redSquareDataUrl : '';
}

export function recordedFeedMock(
  agent: MockAgent,
  recording: string,
): FeedMock {
  const mock = recordedFeedMocks.find(
    (mock) => mock.agent === agent && mock.recording === recording,
  );
  if (!mock) throw new Error(`No recorded Feed ${agent}/${recording}`);
  return mock;
}

function recordedRow<Kind extends SessionUpdate['sessionUpdate']>(
  agent: MockAgent,
  recording: string,
  kind: Kind,
): Extract<SessionUpdate, { sessionUpdate: Kind }> {
  const row = recordedFeedMock(agent, recording).rows.findLast(
    (row): row is Extract<SessionUpdate, { sessionUpdate: Kind }> =>
      row.sessionUpdate === kind,
  );
  if (!row) throw new Error(`No ${kind} in ${agent}/${recording}`);
  return row;
}

export const recordedUserMessage = (
  agent: MockAgent,
  recording: string,
): UserMessage => recordedRow(agent, recording, 'user_message');

export const recordedAgentMessage = (
  agent: MockAgent,
  recording: string,
): AgentMessage => recordedRow(agent, recording, 'agent_message');

// Saved from recorded events through the real Feed reducer during fixture preparation.
const streamingMessages = intermediateMessages.map((entry) => ({
  ...entry,
  row: AgentMessageSchema.parse(entry.row),
}));
export function streamingAgentMessage(
  agent: MockAgent,
  recording: string,
): AgentMessage {
  const entry = streamingMessages.find(
    (message) => message.agent === agent && message.recording === recording,
  );
  if (!entry)
    throw new Error(`No recorded streaming message ${agent}/${recording}`);
  return entry.row;
}
