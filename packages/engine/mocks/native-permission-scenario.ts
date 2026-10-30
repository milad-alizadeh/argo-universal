import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { OperationWaitClock } from '../src/operations';
import type { startAcpEngine } from './acp-engine';
import { recordingSource, writeHookPlugins } from './hook-plugins';
import { sessionIdentityStep } from './session-access';

export const autoAllowPlugin = 'auto-allow';

export const permissionScenario = (
  outputs: TerminalOutputResponse[],
  release: PromiseWithResolvers<void>,
  operationWaitClock: OperationWaitClock | undefined,
): Parameters<typeof startAcpEngine>[0] => ({
  operationWaitClock,
  steps: [],
  sessionIds: ['permission-session'],
  configOptions: [bypassMode],
  responses: promptResponses(outputs, release),
  installPlugins: installAutoAllow,
});

const bypassMode = {
  id: 'mode',
  name: 'Mode',
  category: 'mode',
  type: 'select' as const,
  currentValue: 'bypass',
  options: [{ value: 'bypass', name: 'Bypass permissions' }],
};

const promptResponses = (
  outputs: TerminalOutputResponse[],
  release: PromiseWithResolvers<void>,
): NonNullable<
  NonNullable<Parameters<typeof startAcpEngine>[0]>['responses']
> => ({
  'session/prompt': [
    { steps: [sessionIdentityStep(outputs)] },
    { steps: [{ type: 'wait-for-cancel' as const, until: release.promise }] },
  ],
});

const installAutoAllow = (home: string): Promise<void> =>
  writeHookPlugins(home, [
    {
      id: autoAllowPlugin,
      source: recordingSource(
        "await on('tool.check', () => ({ decision: 'allow' }));",
      ),
      hooks: ['tool.check'],
    },
  ]);
