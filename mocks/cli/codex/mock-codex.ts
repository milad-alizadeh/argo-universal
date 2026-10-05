// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  readMockCliEnvironment,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import { findRecording, readRecording, splitTurns } from '../recording.ts';

const PRODUCER = 'codex-app-server';
// JSON-RPC error codes.
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

const RecordedMessage = z.looseObject({
  method: z.string(),
  params: z
    .looseObject({
      threadId: z.string().optional(),
      turn: z.unknown().optional(),
    })
    .optional(),
  emittedAtMs: z.number().optional(),
});
const RecordedTurns = z.looseObject({ messages: z.array(RecordedMessage) });

const Request = z.looseObject({
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z
    .looseObject({
      threadId: z.string().optional(),
      turnId: z.string().optional(),
      notificationsFirst: z.boolean().optional(),
    })
    .optional(),
});

const environment = readMockCliEnvironment();
const recording = readRecording(environment.recordingFile, PRODUCER);
const [command] = process.argv.slice(2);

if (command === '--version') {
  process.stdout.write(`codex-cli ${recording.version}\n`);
  process.exit(0);
}
if (command !== 'app-server') {
  process.stderr.write('The mock Codex CLI serves only `app-server`.\n');
  process.exit(2);
}

// The capture time is the recorder's, not part of the wire message.
const messages = RecordedTurns.parse(recording.payload).messages.map(
  ({ emittedAtMs: _, ...message }) => message,
);
const turns = splitTurns(
  messages,
  (message) => message.method === 'turn/completed',
);
let threadId = messages.find((message) => message.params?.threadId)?.params
  ?.threadId;
let turnIndex = 0;
let interruptedFrames: typeof messages | null = null;
let activeTurnId: string | null = null;

// Read on request, so a version folder without a model list still serves Turns.
function listModels(id: string | number | undefined) {
  try {
    const file = findRecording(
      path.join(import.meta.dirname, 'recordings'),
      'model-list',
    );
    send({ id, result: readRecording(file, PRODUCER).payload });
  } catch (error) {
    send({ id, error: { code: INTERNAL_ERROR, message: String(error) } });
  }
}

function startTurn(
  id: string | number | undefined,
  notificationsFirst = false,
) {
  const turn = turns[turnIndex++]?.map((message) => ({
    ...message,
    params: { ...message.params, threadId },
  }));
  const started = turn?.find((message) => message.method === 'turn/started');
  if (turn === undefined || started === undefined) {
    send({
      id,
      error: {
        code: INTERNAL_ERROR,
        message: `The recording has no Turn ${turnIndex}.`,
      },
    });
    return;
  }
  // Every recording crashes at the same point: right after `turn/started`.
  const final = turn.at(-1);
  const interrupted =
    final?.method === 'turn/completed' &&
    (final.params?.turn as { status?: string })?.status === 'interrupted';
  const command = interrupted
    ? turn.findIndex(
        (message) =>
          message.method === 'item/started' &&
          (message.params as { item?: { type?: string } })?.item?.type ===
            'commandExecution',
      )
    : -1;
  if (command >= 0) interruptedFrames = turn.slice(command + 1);
  activeTurnId = z.object({ id: z.string() }).parse(started.params?.turn).id;
  const frames = command >= 0 ? turn.slice(0, command + 1) : turn;
  const before = notificationsFirst ? frames.indexOf(started) + 1 : 0;
  const crashAfter = environment.exitMidTurn
    ? (message: (typeof frames)[number]) => message === started
    : null;
  if (before && !replayTurn(frames.slice(0, before), crashAfter)) return;
  send({ id, result: { turn: started.params?.turn } });
  replayTurn(frames.slice(before), crashAfter);
}

serveJsonLines((line) => {
  const { id, method, params } = Request.parse(line);
  switch (method) {
    case undefined:
    case 'initialized':
      return;
    case 'initialize':
      return send({ id, result: {} });
    case 'account/read':
      return send({
        id,
        result: {
          account: {
            type:
              process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY
                ? 'apiKey'
                : (process.env.MOCK_CLI_ACCOUNT_TYPE ?? 'chatgpt'),
          },
          requiresOpenaiAuth: true,
          workspaceRouting: null,
        },
      });
    case 'model/list':
      return listModels(id);
    case 'thread/start':
      return send({ id, result: { thread: { id: threadId } } });
    case 'thread/resume': {
      const file = process.env.MOCK_CLI_TRANSCRIPT;
      const stored = file
        ? z
            .object({ vendorSessionId: z.string() })
            .parse(JSON.parse(readFileSync(file, 'utf8')))
        : null;
      if (!stored || stored.vendorSessionId !== params?.threadId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: `Codex has no transcript for Session ${params?.threadId}.`,
          },
        });
      threadId = stored.vendorSessionId;
      return send({ id, result: { thread: { id: threadId } } });
    }
    case 'turn/interrupt':
      if (params?.turnId !== activeTurnId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: 'The vendor Turn id does not match.',
          },
        });
      if (!interruptedFrames) return send({ id, result: {} });
      send({ id, result: {} });
      replayTurn(interruptedFrames, null);
      interruptedFrames = null;
      return;
    case 'turn/start':
      return startTurn(
        id,
        params?.notificationsFirst ||
          process.env.MOCK_CLI_NOTIFICATIONS_FIRST === '1',
      );
    default:
      send({
        id,
        error: {
          code: METHOD_NOT_FOUND,
          message: `The recording does not answer ${method}.`,
        },
      });
  }
});
