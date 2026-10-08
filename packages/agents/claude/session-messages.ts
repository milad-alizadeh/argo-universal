import type { Query, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { VendorSessionListener } from '../src/agent-adapter';
import { isKnownMessage } from './known-messages';
import type { VendorMessage } from './messages';
import type { createPromptQueue } from './prompt-queue';
import type { SessionErrors } from './session-errors';
import type { Lifetime } from './session-lifetime';
type Reading = {
  vendor: Query;
  listener: VendorSessionListener<VendorMessage>;
  lifetime: Lifetime;
  errors: SessionErrors;
  queue: ReturnType<typeof createPromptQueue>;
};
export async function readMessages(context: Reading): Promise<void> {
  try {
    for await (const message of context.vendor)
      receiveMessage(context, message);
    failUnlessStopping(context, 'The Claude CLI exited.');
  } catch (error) {
    failUnlessStopping(context, error);
  } finally {
    context.queue.end();
  }
}
function failUnlessStopping(context: Reading, error: unknown): void {
  if (!context.lifetime.isStopping())
    context.listener.failed(context.errors.describe(error));
}
function receiveMessage(context: Reading, message: SDKMessage): void {
  if (isKnownMessage(message))
    context.listener.message({ ...message, receivedAt: Date.now() });
  else
    context.listener.event({
      type: 'agent.messageRejected',
      reason: `Unsupported SDK message: ${message.type}`,
    });
  if (message.type === 'result') void sendUsage(context).catch((): void => {});
}
async function sendUsage({ vendor, listener }: Reading): Promise<void> {
  const usage = await vendor.getContextUsage({ detail: 'summary' });
  listener.event({
    type: 'agent.usage',
    usage: { used: usage.totalTokens, size: usage.maxTokens },
  });
}
