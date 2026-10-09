import type {
  AgentMessage,
  BlobRef,
  SessionUpdate,
  UserMessage,
} from '@repo/contracts';
import { type FeedMock, recordedFeedMocks } from '@repo/mocks/app';

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

const textLength = (row: AgentMessage): number =>
  row.content
    .map((block) => (block.type === 'text' ? block.text.length : 0))
    .reduce((total, length) => total + length, 0);

// The newest Agent message as it stood mid-stream: the recorded stream replayed until 60% of its text arrived.
export function streamingAgentMessage(
  agent: MockAgent,
  recording: string,
): AgentMessage {
  const mock = recordedFeedMock(agent, recording);
  const settled = recordedAgentMessage(agent, recording);
  const fullLength = textLength(settled);
  let row: AgentMessage | undefined;
  for (const event of mock.stream) {
    if (event.type === 'row.upsert' && event.row.id === settled.id) {
      if (event.row.sessionUpdate !== 'agent_message')
        throw new Error('Streamed row is not an Agent message');
      row = event.row;
      continue;
    }
    if (event.type !== 'row.append' || event.id !== settled.id || !row)
      continue;
    const [, index] = event.field.split('.');
    const content = [...row.content];
    const block = content[Number(index)];
    if (block?.type !== 'text' || block.text.length !== event.off)
      throw new Error(`Append out of order in ${agent}/${recording}`);
    content[Number(index)] = { ...block, text: block.text + event.text };
    row = { ...row, content, revision: event.rev };
    if (textLength(row) >= fullLength * 0.6) break;
  }
  if (row?.state !== 'open')
    throw new Error(`No open Agent message streamed in ${agent}/${recording}`);
  return row;
}
