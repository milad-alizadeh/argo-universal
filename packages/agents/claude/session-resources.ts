import { randomUUID } from 'node:crypto';
import type { Query } from '@anthropic-ai/claude-agent-sdk';
import type {
  AgentConnectInput,
  VendorSessionListener,
} from '../src/agent-adapter';
import type { VendorMessage } from './messages';
import { createPromptQueue } from './prompt-queue';
import { createRequestTracker } from './request-tracker';
import { createSessionErrors } from './session-errors';
import { createSessionLifetime } from './session-lifetime';
export function prepareSession(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): SessionResources {
  const queue = createPromptQueue();
  const requests = createRequestTracker(listener);
  const lifetime = createSessionLifetime(signal, queue, requests);
  const vendorSessionId = input.vendorSessionId ?? randomUUID();
  const errors = createSessionErrors();
  return { vendorSessionId, queue, requests, lifetime, errors, listener };
}
interface SessionResources {
  vendorSessionId: string;
  queue: ReturnType<typeof createPromptQueue>;
  requests: ReturnType<typeof createRequestTracker>;
  lifetime: ReturnType<typeof createSessionLifetime>;
  errors: ReturnType<typeof createSessionErrors>;
  listener: VendorSessionListener<VendorMessage>;
}
export type QueryContext = SessionResources & {
  vendor: Query;
};
