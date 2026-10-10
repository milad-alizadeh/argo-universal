import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { FeedChange, PlanUpdate, SessionUpdate } from '@repo/contracts';
import type { Feed } from '../feed-change';
import type { MessageStreams } from './message-identity';
import type { OutputBlob } from './tool-output';

export type AcpContentInput = {
  update: SessionNotification['update'];
  acpSessionId: SessionNotification['sessionId'];
  turnId: string | null;
  feed: Feed;
  streams: MessageStreams;
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
  unaddressedPlan?: AcpContentInput['unaddressedPlan'];
  diagnostics?: string[];
  // Whole output values the change cut to a preview.
  blobs?: OutputBlob[];
};
export type ContentAssemblyResult =
  | AssembledContent
  | { rejection: string }
  | undefined;
