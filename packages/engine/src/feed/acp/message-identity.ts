import type { ContentAssemblyInput } from './assembly';
import { createScopedFeedRowId } from './identity';

export type MessageKind = 'agent_message' | 'agent_thought';
export type MessageStream = {
  id: string;
  acpSessionId: string;
  upstreamId: string | null;
  turnId: string | null;
};
export type MessageStreams = Partial<Record<MessageKind, MessageStream>>;
const matchesLocalMessageScope = (
  stream: MessageStream,
  input: ContentAssemblyInput,
): boolean =>
  stream.turnId === input.turnId && stream.acpSessionId === input.acpSessionId;
const canContinueLocalMessage = (
  stream: MessageStream | undefined,
  input: ContentAssemblyInput,
): stream is MessageStream => {
  if (!stream) return false;
  return stream.upstreamId === null && matchesLocalMessageScope(stream, input);
};
const createMessageStream = (
  input: ContentAssemblyInput,
  kind: MessageKind,
  upstreamId: string | null,
): MessageStream => ({
  id: createScopedFeedRowId({
    acpSessionId: input.acpSessionId,
    kind,
    upstreamId: upstreamId ?? undefined,
    localPosition: input.feed.nextPosition,
  }),
  acpSessionId: input.acpSessionId,
  upstreamId,
  turnId: input.turnId,
});
const selectLocalMessageStream = (
  input: ContentAssemblyInput,
  kind: MessageKind,
): MessageStream => {
  const previous = input.streams[kind];
  return canContinueLocalMessage(previous, input)
    ? previous
    : createMessageStream(input, kind, null);
};
export const selectMessageStream = (
  input: ContentAssemblyInput,
  kind: MessageKind,
  upstreamId: string | null,
): MessageStream =>
  upstreamId === null
    ? selectLocalMessageStream(input, kind)
    : createMessageStream(input, kind, upstreamId);
