import type {
  AgentRequestContext,
  InitializeRequest,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { AuthStatusUpdateNotification } from '@repo/contracts';
import type { ScriptedScenario } from './scripted-types.ts';

const subscriptionAccount: AuthStatusUpdateNotification = {
  authStatus: {
    kind: 'account',
    label: 'Subscription',
    account: { plan: 'plus' },
  },
};
export const initializeScriptedAgent = async (
  context: AgentRequestContext<InitializeRequest>,
  initialize: (
    context: AgentRequestContext<InitializeRequest>,
    fallback: InitializeResponse,
  ) => Promise<InitializeResponse>,
  initialization: NonNullable<ScriptedScenario['initialize']>,
): Promise<NonNullable<ScriptedScenario['initialize']>> => {
  await context.client.notify('_auth/status_update', subscriptionAccount);
  return initialize(context, initialization);
};
