import { runtimeError } from '../protocol/runtime';

// A call the Plugin's Capabilities don't allow; it is answered as an error and logged as a refusal.
export class CapabilityRefusal extends Error {}

export const replyError = (cause: unknown): string =>
  cause instanceof CapabilityRefusal
    ? `Refused: ${cause.message}`
    : runtimeError(cause);
