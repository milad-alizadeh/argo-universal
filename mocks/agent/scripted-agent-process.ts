import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import type {
  AgentRequestMethod,
  AgentRequestParamsByMethod,
} from '@agentclientprotocol/sdk';
import { isScenarioName, scenarios } from './scenarios.ts';
import { createScriptedAgent } from './scripted-agent.ts';
import type {
  ScriptedResponse,
  ScriptedResponses,
} from './scripted-responses.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';
import { runTerminalLoginMock } from './terminal-login.ts';

// The scripted Agent over stdio; `node scripted-agent-process.ts <scenario>`.
const name = process.argv[2];

if (!isScenarioName(name)) throw new Error(`Unknown scenario: ${name}`);

const requestLog = process.env.ARGO_E2E_REQUEST_LOG;

const named: ScriptedScenario = scenarios[name];

// A scenario with a relaunch marks its failed exit, so the Agent a Retry starts again plays the relaunch.
const exitedMarker = requestLog && `${requestLog}.${name}.exited`;

const scenario: ScriptedScenario =
  named.relaunched && exitedMarker && existsSync(exitedMarker)
    ? named.relaunched
    : named;

if (named.relaunched && exitedMarker)
  process.on('exit', (code) => {
    if (code !== 0) writeFileSync(exitedMarker, '');
  });

// Appends each request to the App E2E's request log, then hands it to the response's own requests.
const logged = <Method extends AgentRequestMethod>(
  log: string,
  method: Method,
  own: ScriptedResponse<Method>['requests'],
): Required<ScriptedResponse<Method>>['requests'] => ({
  push: (params: AgentRequestParamsByMethod[Method]): void => {
    appendFileSync(log, `${JSON.stringify({ method, params })}\n`);
    own?.push(params);
  },
});

// Each of a scenario's responses for the method, or one answered by default, also logs its request.
const loggedResponses = <Method extends AgentRequestMethod>(
  log: string,
  method: Method,
  responses: readonly ScriptedResponse<Method>[] = [{}],
): ScriptedResponse<Method>[] =>
  responses.map((response) => ({
    ...response,
    requests: logged(log, method, response.requests),
  }));

// App E2E reads which Sessions the Agent was asked to open and close; a scenario's own script for either still answers.
const loggedRequests = (log: string): ScriptedResponses => ({
  ...scenario.responses,
  'session/new': loggedResponses(
    log,
    'session/new',
    scenario.responses?.['session/new'],
  ),
  'session/close': loggedResponses(
    log,
    'session/close',
    scenario.responses?.['session/close'],
  ),
});

const selected: ScriptedScenario = requestLog
  ? { ...scenario, responses: loggedRequests(requestLog) }
  : scenario;

const initialization = selected.initialize ?? scriptedInitialization;

const readStandardInput = (): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start: (controller): void => {
      process.stdin.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      process.stdin.on('end', () => controller.close());
    },
  });

const connect = (): void => {
  createScriptedAgent({
    ...selected,
    // Process ownership tests read the environment the launcher handed over.
    initialize: {
      ...initialization,
      _meta: { ...initialization._meta, environment: { ...process.env } },
    },
  }).connect(Writable.toWeb(process.stdout), readStandardInput());
};

if (
  process.argv.includes('--interactive-login') ||
  process.argv.includes('--auth-pattern') ||
  process.argv.includes('--auth-fail')
)
  runTerminalLoginMock();
else connect();
