import { appendFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { releasingHeldCheck } from './held-check.ts';
import { isScenarioName, scenarios } from './scenarios.ts';
import { createScriptedAgent } from './scripted-agent.ts';
import type { ScriptedResponses } from './scripted-responses.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';
import { runTerminalLoginMock } from './terminal-login.ts';

// The scripted Agent over stdio; `node scripted-agent-process.ts <scenario>`.
const name = process.argv[2];
if (!isScenarioName(name)) throw new Error(`Unknown scenario: ${name}`);
const scenario: ScriptedScenario = releasingHeldCheck(name, scenarios[name]);
const requestLog = process.env.ARGO_E2E_REQUEST_LOG;

// App E2E reads which Sessions the Agent was asked to close.
const loggedCloses = (log: string): ScriptedResponses => ({
  ...scenario.responses,
  'session/close': [
    {
      requests: {
        push: (params): void => {
          appendFileSync(
            log,
            `${JSON.stringify({ method: 'session/close', params })}\n`,
          );
        },
      },
    },
  ],
});
const selected: ScriptedScenario =
  requestLog && !scenario.responses?.['session/close']
    ? { ...scenario, responses: loggedCloses(requestLog) }
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
if (process.argv.includes('--interactive-login')) runTerminalLoginMock();
else connect();
