import type { ContentBlock, SubagentUpdate } from '@repo/contracts';
import type { ChildFeed } from '../../subagents/child-feed';
import {
  type AcpSessionMessage,
  type FieldOf,
  type MessageRouting,
  previousAction,
  promptField,
  resultField,
} from './subagent-actions';

const isOwn = (input: MessageRouting, child: ChildFeed | undefined): boolean =>
  child?.parentId === input.parentId;

function ownChild(
  input: MessageRouting,
  vendorId: string | null | undefined,
): ChildFeed | undefined {
  const child = input.children.get(vendorId ?? '');

  return isOwn(input, child) ? child : undefined;
}

// Only a reply that names its child sender and this transcript's Session as recipient is a result.
const explicitReplier = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ChildFeed | undefined =>
  update.recipientSessionId === input.transcriptId
    ? ownChild(input, update.senderSessionId)
    : undefined;

const childById = (
  input: MessageRouting,
  row: SubagentUpdate,
): ChildFeed | undefined =>
  [...input.children.values()].find(
    (child) => child.sessionId === row.subagentSessionId,
  );

// A message whose recipient is not this transcript is its outgoing view, so a missing sender is the transcript itself (ACP subagents RFD).
const sentByTranscript = (
  input: MessageRouting,
  update: AcpSessionMessage,
): boolean =>
  update.senderSessionId == null ||
  update.senderSessionId === input.transcriptId;

// Only this transcript's own message that names its child as recipient is a prompt.
const explicitRecipient = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ChildFeed | undefined =>
  sentByTranscript(input, update)
    ? ownChild(input, update.recipientSessionId)
    : undefined;

// The child an action names; `previous` is its content so far, which a chunk extends and a patch may keep.
type ActionTarget = { child: ChildFeed; previous: ContentBlock[] | undefined };

// How one kind of action is read from its row and which child a first message names.
type ActionKind = {
  fieldOf: FieldOf;
  participant: (
    input: MessageRouting,
    update: AcpSessionMessage,
  ) => ChildFeed | undefined;
};

// A chunk or patch of a known action names no participants, so its action row names the child.
const childOf = (
  input: MessageRouting,
  update: AcpSessionMessage,
  { kind, previous }: { kind: ActionKind; previous?: SubagentUpdate },
): ChildFeed | undefined =>
  previous ? childById(input, previous) : kind.participant(input, update);

function actionOf(
  input: MessageRouting,
  update: AcpSessionMessage,
  kind: ActionKind,
): ActionTarget | undefined {
  const previous = previousAction(input, update.messageId, kind.fieldOf);
  const child = childOf(input, update, { kind, previous });

  return child && { child, previous: previous && kind.fieldOf(previous) };
}

const reply: ActionKind = {
  fieldOf: resultField,
  participant: explicitReplier,
};

const prompt: ActionKind = {
  fieldOf: promptField,
  participant: explicitRecipient,
};

export const replyOf = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ActionTarget | undefined => actionOf(input, update, reply);

export const promptOf = (
  input: MessageRouting,
  update: AcpSessionMessage,
): ActionTarget | undefined => actionOf(input, update, prompt);
