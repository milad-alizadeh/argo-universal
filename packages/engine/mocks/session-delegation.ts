import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';
import { operationCaller } from './operations';
import {
  openAccessSession,
  readAgentIdentity,
  sessionIdentityStep,
} from './session-access';

export async function delegationJourney(): Promise<DelegationJourney> {
  const outputs: TerminalOutputResponse[] = [];
  const firstTurnSteps: ScriptedStep[] = [sessionIdentityStep(outputs)];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { steps: firstTurnSteps },
        { steps: [{ type: 'wait-for-cancel' }] },
      ],
    },
  });

  const caller = await openAccessSession({ host, outputs }, 'Caller');

  return { host, outputs, caller, firstTurnSteps };
}

export type DelegationJourney = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  outputs: TerminalOutputResponse[];
  caller: Awaited<ReturnType<typeof openAccessSession>>;
  firstTurnSteps: ScriptedStep[];
};

export async function startDelegated(
  journey: DelegationJourney,
  caller = journey.caller,
): Promise<DelegationJourney['caller']> {
  const created = SessionNewOutput.parse(
    await caller.caller.operations.run.mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Delegated work' }],
      },
    }),
  );

  await waitForAcpSessionIdle(journey.host, created.sessionId);
  const identity = readAgentIdentity(journey.outputs);

  return {
    ...created,
    ...identity,
    caller: await operationCaller(journey.host, identity.token),
  };
}

export async function holdSession(
  journey: DelegationJourney,
  sessionId: string,
): Promise<void> {
  await journey.host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Keep working' }],
  });
}
