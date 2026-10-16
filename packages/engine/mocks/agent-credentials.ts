import type { ScriptedCredentials } from '@repo/mocks/agent/scripted-scenario';

// One stored sign-in for scripted Agents; share it to share the sign-in.
export const agentCredentials = (
  { signedIn }: { signedIn: boolean } = { signedIn: false },
): ScriptedCredentials => ({ signedIn });
