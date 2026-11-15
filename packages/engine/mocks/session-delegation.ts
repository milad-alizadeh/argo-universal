import type {
  TerminalOutputResponse,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { SessionNewOutput, type SessionNewInput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';
import { operationCaller, runOperation } from './operations';
import {
  openAccessSessionIn,
  readAgentIdentity,
  sessionIdentityStep,
} from './session-access';

type DelegationOptions = {
  // Where the calling Session runs; the main checkout by default.
  checkout?: SessionNewInput['checkout'];
  requests?: PromptRequest[];
  installPlugins?: NonNullable<
    Parameters<typeof startAcpEngine>[0]
  >['installPlugins'];
};

export async function delegationJourney(
  options: DelegationOptions = {},
): Promise<DelegationJourney> {
  const outputs: TerminalOutputResponse[] = [];
  const firstTurnSteps: ScriptedStep[] = [sessionIdentityStep(outputs)];

  const host = await startAcpEngine(
    delegationScenario(options, firstTurnSteps),
  );

  const caller = await openAccessSessionIn(
    { host, outputs },
    callerStart(options),
  );

  return { host, outputs, caller, firstTurnSteps };
}

const callerStart = ({
  checkout = emptySessionInput.checkout,
}: DelegationOptions): Partial<SessionNewInput> => ({
  checkout,
  prompt: [{ type: 'text', text: 'Caller' }],
});

const delegationScenario = (
  options: DelegationOptions,
  firstTurnSteps: ScriptedStep[],
): NonNullable<Parameters<typeof startAcpEngine>[0]> => ({
  steps: [],
  installPlugins: options.installPlugins,
  responses: {
    'session/prompt': [
      { steps: firstTurnSteps, requests: options.requests },
      { steps: [{ type: 'wait-for-cancel' }], requests: options.requests },
    ],
  },
});

export type DelegationJourney = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  outputs: TerminalOutputResponse[];
  caller: Awaited<ReturnType<typeof openAccessSessionIn>>;
  firstTurnSteps: ScriptedStep[];
};

export async function startDelegated(
  journey: DelegationJourney,
  caller = journey.caller,
  checkout: SessionNewInput['checkout'] = emptySessionInput.checkout,
): Promise<DelegationJourney['caller']> {
  const created = await startDelegatedSession(caller, checkout);

  await waitForAcpSessionIdle(journey.host, created.sessionId);
  const identity = readAgentIdentity(journey.outputs);

  return {
    ...created,
    ...identity,
    caller: await operationCaller(journey.host, identity.token),
  };
}

type DelegatedParams = Omit<typeof emptySessionInput, 'checkout' | 'prompt'> & {
  checkout: SessionNewInput['checkout'];
  prompt: { type: 'text'; text: string }[];
};

const delegatedParams = (
  checkout: SessionNewInput['checkout'],
): DelegatedParams => ({
  ...emptySessionInput,
  checkout,
  prompt: [{ type: 'text', text: 'Delegated work' }],
});

const startDelegatedSession = async (
  caller: DelegationJourney['caller'],
  checkout: SessionNewInput['checkout'],
): Promise<ReturnType<typeof SessionNewOutput.parse>> =>
  SessionNewOutput.parse(
    OperationExecution.parse(
      await runOperation(caller.caller.operations, {
        wait: true,
        id: 'session.new',
        params: delegatedParams(checkout),
      }),
    ).result,
  );

export async function holdSession(
  journey: DelegationJourney,
  sessionId: string,
): Promise<void> {
  await journey.host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Keep working' }],
  });
}
