import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { z } from 'zod';
import { type LoggedMessage, MessageId, releaseMarker } from './request-log.ts';
import { isScenarioName, scenarios } from './scenarios.ts';
import { createScriptedAgent } from './scripted-agent.ts';
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

const initialization = scenario.initialize ?? scriptedInitialization;

const log = (message: LoggedMessage): void => {
  if (requestLog) appendFileSync(requestLog, `${JSON.stringify(message)}\n`);
};

// One NDJSON frame on the Agent's stdio, as far as the request log needs it.
const Frame = z.object({
  method: z.string().optional(),
  id: MessageId.optional(),
  params: z.unknown().optional(),
});

type Frame = z.infer<typeof Frame>;

// A malformed frame a scenario writes on purpose is not logged.
const readFrame = (line: string): Frame | undefined => {
  try {
    return Frame.parse(JSON.parse(line));
  } catch {
    return undefined;
  }
};

// Whole NDJSON lines from a byte stream, keeping a partial last line for the next chunk.
const lineReader = (): ((chunk: Uint8Array) => string[]) => {
  const decoder = new TextDecoder();
  let pending = '';

  return (chunk) => {
    const lines = (pending + decoder.decode(chunk, { stream: true })).split(
      '\n',
    );

    pending = lines.pop() ?? '';

    return lines.filter(Boolean);
  };
};

// App E2E reads every request and notification the Agent received, and each answer it sent, in order.
const logFrames = (
  record: (frame: Frame) => void,
): ((chunk: Uint8Array) => void) => {
  const lines = lineReader();

  return (chunk) => {
    for (const frame of lines(chunk).map(readFrame)) if (frame) record(frame);
  };
};

const received = logFrames(({ method, id, params }) => {
  if (method) log({ agent: process.pid, method, id, params });
});

const answered = logFrames(({ method, id }) => {
  if (!method && id !== undefined) log({ agent: process.pid, answered: id });
});

const readStandardInput = (): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start: (controller): void => {
      process.stdin.on('data', (chunk: Buffer) => {
        received(chunk);
        controller.enqueue(chunk);
      });
      process.stdin.on('end', () => controller.close());
    },
  });

const standardOutput = (): WritableStream<Uint8Array> => {
  const writer = Writable.toWeb(process.stdout).getWriter();

  return new WritableStream({
    write: (chunk): Promise<void> => {
      answered(chunk);

      return writer.write(chunk);
    },
    close: () => writer.close(),
    abort: (reason) => writer.abort(reason),
  });
};

const releasePoll = 25;

// Resolves once App E2E writes the release marker beside its request log.
const released = (): Promise<void> => {
  const marker = requestLog && releaseMarker(requestLog);

  if (!marker) return new Promise(() => {});

  return new Promise((resolve) => {
    const poll = setInterval(() => {
      if (!existsSync(marker)) return;
      clearInterval(poll);
      resolve();
    }, releasePoll);

    poll.unref();
  });
};

const connect = (): void => {
  createScriptedAgent(
    {
      ...scenario,
      // Process ownership tests read the environment the launcher handed over.
      initialize: {
        ...initialization,
        _meta: { ...initialization._meta, environment: { ...process.env } },
      },
    },
    undefined,
    { released: released() },
  ).connect(standardOutput(), readStandardInput());
};

if (
  process.argv.includes('--interactive-login') ||
  process.argv.includes('--auth-pattern') ||
  process.argv.includes('--auth-fail')
)
  runTerminalLoginMock();
else connect();
