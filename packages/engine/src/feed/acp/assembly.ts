import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  FeedChange,
  PlanUpdate,
  SessionUpdate,
  ToolCallContent,
} from '@repo/contracts';
import type { Feed } from '../feed-change';
import type { MessageStreams } from './message-identity';
import type { OutputBlob } from './tool-output';

export type AcpContentInput = {
  update: SessionNotification['update'];
  acpSessionId: SessionNotification['sessionId'];
  turnId: string | null;
  stale?: true;
  lastSettledTurnId?: string | null;
  feed: Feed;
  streams: MessageStreams;
  toolContents?: Record<string, ToolCallContent[]>;
  findWrittenRow: (id: string) => SessionUpdate | undefined;
  findUnaddressedPlan?: (acpSessionId: string) => PlanUpdate | undefined;
  unaddressedPlan?: { acpSessionId: string; rowId: string };
};

export type ContentAssemblyInput = AcpContentInput & {
  findRow: AcpContentInput['findWrittenRow'];
};

export type AssembledContent = {
  change: FeedChange;
  streams?: MessageStreams;
  toolContents?: AcpContentInput['toolContents'];
  unaddressedPlan?: AcpContentInput['unaddressedPlan'];
  diagnostics?: string[];
  // Whole output values the change cut to a preview.
  blobs?: OutputBlob[];
};

export type ContentAssemblyResult =
  | AssembledContent
  | { rejection: string }
  | undefined;
