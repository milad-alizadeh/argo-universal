import type {
  AgentRequestMethod,
  AgentRequestContext,
  AgentRequestParamsByMethod,
  AgentRequestResponsesByMethod,
  PromptResponse,
} from '@agentclientprotocol/sdk';
import {
  playResponse,
  responseSequence,
  type ScriptedResponse,
} from './scripted-responses.ts';
import {
  runTurn,
  type ScriptedScenario,
  type ScriptedTurn,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

const promptMethod = 'session/prompt';

export type ScriptedWire = Pick<ScriptedTurn, 'writeRaw' | 'closed'>;

export class ScriptedMethodPlayer {
  private readonly scenario: ScriptedScenario;
  private readonly sessions: ScriptedSessions;
  private readonly wire: ScriptedWire;
  public constructor(input: {
    scenario: ScriptedScenario;
    sessions: ScriptedSessions;
    wire: ScriptedWire;
  }) {
    this.scenario = input.scenario;
    this.sessions = input.sessions;
    this.wire = input.wire;
  }
  public respond<Method extends AgentRequestMethod>(
    method: Method,
  ): (
    context: AgentRequestContext<AgentRequestParamsByMethod[Method]>,
    fallback: AgentRequestResponsesByMethod[Method],
  ) => Promise<AgentRequestResponsesByMethod[Method]> {
    const next = responseSequence<Method>(this.scenario.responses?.[method]);
    return async (context, fallback) => {
      const selected = next(context.params);
      const response =
        method === promptMethod
          ? { ...selected, steps: selected?.steps ?? this.scenario.steps }
          : selected;
      const sessionId = responseSessionId({
        response,
        params: context.params,
        fallback,
      });
      const played = await playResponse(
        response,
        context,
        this.turn(context, sessionId, method === promptMethod),
      );
      return played.result ?? completeResponse(fallback, played.stopReason);
    };
  }
  public turn(
    context: { client: ScriptedTurn['client'] },
    sessionId: string,
    active = true,
  ): ScriptedTurn {
    return {
      sessionId,
      client: context.client,
      ...(active
        ? this.sessions.startTurn(sessionId)
        : { cancelled: new Promise<void>(() => {}), isCancelled: () => false }),
      ...this.wire,
    };
  }
  public async prompt(
    context: AgentRequestContext<AgentRequestParamsByMethod['session/prompt']>,
  ): Promise<AgentRequestResponsesByMethod['session/prompt']> {
    return runTurn(
      this.scenario.steps,
      this.turn(context, context.params.sessionId),
    );
  }
  public async dispatchPrompt(
    context: AgentRequestContext<AgentRequestParamsByMethod['session/prompt']>,
  ): Promise<AgentRequestResponsesByMethod['session/prompt']> {
    try {
      return await (this.scenario.responses?.[promptMethod]
        ? this.respond(promptMethod)(context, { stopReason: 'end_turn' })
        : this.prompt(context));
    } finally {
      this.sessions.endTurn(context.params.sessionId);
    }
  }
}

const responseSessionId = <Method extends AgentRequestMethod>(input: {
  response: ScriptedResponse<Method> | undefined;
  params: AgentRequestParamsByMethod[Method];
  fallback: AgentRequestResponsesByMethod[Method];
}): string => {
  const result = input.response?.result ?? input.fallback;
  if ('sessionId' in result) return String(result.sessionId);
  if ('sessionId' in input.params) return String(input.params['sessionId']);
  return '';
};

const completeResponse = <Response extends object>(
  fallback: Response,
  stopReason: PromptResponse['stopReason'],
): Response => {
  if ('stopReason' in fallback) return { ...fallback, stopReason };
  return fallback;
};
