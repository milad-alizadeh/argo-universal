import { runtimeError } from '../protocol/runtime';
import type { PluginReply } from '../protocol/runtime';

// A call the Plugin's Capabilities don't allow; it is answered as an error and logged as a refusal.
export class CapabilityRefusal extends Error {}

// A Query's borrow that returned nothing (ADR-0036): signed out, or a provider that did not answer.
export class AccountUnavailable extends CapabilityRefusal {
  constructor() {
    super('Account is unavailable');
  }
}

const replyError = (cause: unknown): string =>
  cause instanceof CapabilityRefusal
    ? `Refused: ${cause.message}`
    : runtimeError(cause);

// A refusal carries its own kind, so no reader has to recognise it by the message's wording.
export const replyFailure = (cause: unknown): PluginReply => {
  const error = replyError(cause);

  if (cause instanceof AccountUnavailable)
    return { ok: false, error, errorKind: 'no-account' };

  return cause instanceof CapabilityRefusal
    ? { ok: false, error, errorKind: 'refused' }
    : { ok: false, error };
};
