import { Writable } from 'node:stream';
import { isScenarioName, scenarios } from './scenarios.ts';
import { createScriptedAgent } from './scripted-agent.ts';
import {
  scriptedInitialization,
  type ScriptedScenario,
} from './scripted-scenario.ts';

// The scripted Agent over stdio; `node scripted-agent-process.ts <scenario>`.
const name = process.argv[2];
if (!isScenarioName(name)) throw new Error(`Unknown scenario: ${name}`);
const selected: ScriptedScenario = scenarios[name];
const initialization = selected.initialize ?? scriptedInitialization;
createScriptedAgent({
  ...selected,
  // Process ownership tests read the environment the launcher handed over.
  initialize: {
    ...initialization,
    _meta: { ...initialization._meta, environment: { ...process.env } },
  },
}).connect(
  Writable.toWeb(process.stdout),
  new ReadableStream<Uint8Array>({
    start: (controller): void => {
      process.stdin.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      process.stdin.on('end', () => controller.close());
    },
  }),
);
