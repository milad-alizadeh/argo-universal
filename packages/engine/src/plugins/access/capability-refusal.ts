import { runtimeError } from '../protocol/runtime';
import type { PluginReply } from '../protocol/runtime';

// A call the Plugin's Capabilities don't allow; it is answered as an error and logged as a refusal.
export class CapabilityRefusal extends Error {}

const replyError = (cause: unknown): string =>
  cause instanceof CapabilityRefusal
    ? `Refused: ${cause.message}`
    : runtimeError(cause);

// A refusal carries its own flag, so no reader has to recognise it by the message's wording.
export const replyFailure = (cause: unknown): PluginReply =>
  cause instanceof CapabilityRefusal
    ? { ok: false, error: replyError(cause), refused: true }
    : { ok: false, error: replyError(cause) };
