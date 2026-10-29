import type { SessionSnapshot, Turn, ToolCallUpdate } from '@repo/contracts';

export interface RuntimeTarget {
  httpUrl: string;
  token: string;
  sessionId: string;
}

export interface RuntimeWorkload {
  id: string;
  prompt: string;
  expectedReply?: string;
  expectedStdout?: string;
  toolMarker?: string;
  cancelAfterStdout?: string;
  cancelWhenAccepted?: boolean;
  timeoutMs: number;
  reopen?: boolean;
}

export type RuntimeMilestone =
  | 'dispatched'
  | 'accepted'
  | 'first-agent-content'
  | 'sentinel-received'
  | 'tool-received'
  | 'first-tool-output'
  | 'tool-completed'
  | 'cancel-dispatched'
  | 'cancel-acknowledged'
  | 'turn-ended';

export interface RuntimeObservation {
  milestone: RuntimeMilestone;
  atMs: number;
  sessionId: string;
  turnId?: string;
  rowId?: string;
  toolCallId?: string;
}

export interface RuntimeTrial {
  id: string;
  sessionId: string;
  status: 'completed' | 'failed' | 'timed-out';
  measurements: Record<string, number | null>;
  milestones: RuntimeObservation[];
  turn?: Turn;
  operationId?: string;
  cleanup?: {
    status: 'idle' | 'cancelled' | 'skipped' | 'failed';
    atMs: number;
    turn?: Turn;
    message?: string;
  };
  reply: string;
  expectedReply: string | null;
  timeoutMs: number;
  replyMatches: boolean | null;
  activeToolAtCancel: boolean | null;
  stdout: {
    observed: string;
    final: string;
    expected: string | null;
    matches: boolean | null;
  };
  wire: {
    atMs: number;
    rowId: string;
    turnId: string | null;
    revision: number;
    kind: string;
    text: string;
    output: string;
    tool?: Pick<ToolCallUpdate, 'toolCallId' | 'status' | 'kind'>;
  }[];
  choices: {
    beforeOpen?: SessionSnapshot['configOptions'];
    afterOpen?: SessionSnapshot['configOptions'];
    after?: SessionSnapshot['configOptions'];
  };
  error?: { phase: string; message: string };
}
