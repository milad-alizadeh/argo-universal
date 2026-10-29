import type {
  PromptRequest,
  TerminalOutputResponse,
} from '@agentclientprotocol/sdk';
import { onTestFinished } from 'vitest';
import { startAcpEngine } from './acp-engine';
import { TestOperationWaitClock } from './operation-wait-clock';
import { createScriptedAgentProcess } from './scripted-agent';
import { openAccessSession, sessionIdentityStep } from './session-access';

type DelegatedWaitHost = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  caller: Awaited<ReturnType<typeof openAccessSession>>;
  clock: TestOperationWaitClock;
  prompted: Promise<PromptRequest>;
  release: PromiseWithResolvers<void>;
};

export async function delegatedTurnWaitHost(): Promise<DelegatedWaitHost> {
  const clock = new TestOperationWaitClock();
  const outputs: TerminalOutputResponse[] = [];
  const prompted = Promise.withResolvers<PromptRequest>();
  const release = releasingGate();

  const first = createScriptedAgentProcess({
    steps: [sessionIdentityStep(outputs)],
  });

  const delegated = createScriptedAgentProcess({
    steps: [],
    responses: {
      'session/prompt': [
        {
          received: prompted,
          steps: [{ type: 'wait-for-cancel', until: release.promise }],
        },
      ],
    },
  });

  let launches = 0;

  const host = await startAcpEngine({
    steps: [],
    operationWaitClock: clock,
    launchProcess: (launch) =>
      (launches++ === 0 ? first : delegated).launchProcess(launch),
  });

  const caller = await openAccessSession(
    { host, outputs },
    'Delegating caller',
  );

  return { host, caller, clock, prompted: prompted.promise, release };
}

function releasingGate(): PromiseWithResolvers<void> {
  const gate = Promise.withResolvers<void>();
  onTestFinished(() => gate.resolve());

  return gate;
}
