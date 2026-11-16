import type { PluginOperationCaller } from '@repo/contracts/plugins/plugin-operations';

// A person's App may name the Session it is showing without acting as its Agent.
export const isAgentCaller = ({
  person,
  sessionId,
}: PluginOperationCaller): boolean =>
  person !== true && sessionId !== undefined;
