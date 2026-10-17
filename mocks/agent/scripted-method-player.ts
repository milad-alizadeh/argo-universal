import type {
  AgentRequestMethod,
  AgentRequestContext,
  AgentRequestParamsByMethod,
  AgentRequestResponsesByMethod,
  JsonRpcId,
} from '@agentclientprotocol/sdk';
import {
  responseSessionId,
  completeResponse,
  requestScope,
  promptSteps,
} from './scripted-response-fallbacks.ts';
import {
  playResponse,
  responseSequence,
  type ScriptedResponse,
} from './scripted-responses.ts';
import {
  runTurn,
  type ScriptedScenario,
  type ScriptedStep,
  type ScriptedTurn,
} from './scripted-scenario.ts';
import { ScriptedSessions } from './scripted-sessions.ts';

const promptMethod = 'session/prompt';

export type ScriptedWire = Pick<
  ScriptedTurn,
  'writeRaw' | 'closed' | 'released' | 'exit'
>;

type MethodContext<Method extends AgentRequestMethod> = AgentRequestContext<
  AgentRequestParamsByMethod[Method]
>;

type MethodResponder<Method extends AgentRequestMethod> = (
  context: MethodContext<Method>,
  fallback: AgentRequestResponsesByMethod[Method],
) => Promise<AgentRequestResponsesByMethod[Method]>;

type MethodPlayback<Method extends AgentRequestMethod> = {
  method: Method;
  response: ScriptedResponse<Method> | undefined;
  context: MethodContext<Method>;
  fallback: AgentRequestResponsesByMethod[Method];
};

// Prompt playback belongs to one Agent; other method sequences may model account state across restarts.
function scopePromptResponses(scenario: ScriptedScenario): ScriptedScenario {
  const prompts = scenario.responses?.['session/prompt'];

  if (!prompts) return scenario;

  return {
    ...scenario,
    responses: { ...scenario.responses, 'session/prompt': [...prompts] },
  };
}

export class ScriptedMethodPlayer {
  private readonly scenario: ScriptedScenario;
  private readonly sessions: ScriptedSessions;
  private readonly wire: ScriptedWire;
  public constructor(input: {
    scenario: ScriptedScenario;
    sessions: ScriptedSessions;
    wire: ScriptedWire;
  }) {
    this.scenario = scopePromptResponses(input.scenario);
    this.sessions = input.sessions;
    this.wire = input.wire;
  }
  public respond<Method extends AgentRequestMethod>(
    method: Method,
  ): MethodResponder<Method> {
    const next = responseSequence<Method>(this.scenario.responses?.[method]);

    return (context, fallback) =>
      this.playMethod({
        method,
        response: next(context.params),
        context,
        fallback,
      });
  }
  private async playMethod<Method extends AgentRequestMethod>({
    method,
    response,
    context,
    fallback,
  }: MethodPlayback<Method>): Promise<AgentRequestResponsesByMethod[Method]> {
    const selected = this.methodResponse(method, response);
    const sessionId = responseSessionId(selected, context.params, fallback);

    const played = await playResponse(
      selected,
      context,
      this.turn(context, sessionId, method === promptMethod),
    );

    return played.result ?? completeResponse(fallback, played.stopReason);
  }
  private methodResponse<Method extends AgentRequestMethod>(
    method: Method,
    response: ScriptedResponse<Method> | undefined,
  ): ScriptedResponse<Method> | undefined {
    if (method !== promptMethod) return response;

    return { ...response, steps: promptSteps(response, this.scenario.steps) };
  }
  public turn(
    context: { client: ScriptedTurn['client']; requestId?: JsonRpcId },
    sessionId: string,
    active = true,
  ): ScriptedTurn {
    return {
      sessionId,
      client: context.client,
      ...requestScope(context.requestId),
      ...(active
        ? this.sessions.startTurn(sessionId)
        : { cancelled: new Promise<void>(() => {}), isCancelled: () => false }),
      ...this.wire,
    };
  }
  private promptSteps(sessionId: string): readonly ScriptedStep[] {
    return this.sessions.wasResumed(sessionId)
      ? (this.scenario.resumedSteps ?? this.scenario.steps)
      : this.scenario.steps;
  }
  public async prompt(
    context: AgentRequestContext<AgentRequestParamsByMethod['session/prompt']>,
  ): Promise<AgentRequestResponsesByMethod['session/prompt']> {
    return runTurn(
      this.promptSteps(context.params.sessionId),
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
