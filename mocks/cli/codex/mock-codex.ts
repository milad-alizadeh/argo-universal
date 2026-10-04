// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
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
const threadId = messages.find((message) => message.params?.threadId)?.params
  ?.threadId;
let turnIndex = 0;

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

function startTurn(id: string | number | undefined) {
  const turn = turns[turnIndex++];
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
  send({ id, result: { turn: started.params?.turn } });
  // Every recording crashes at the same point: right after `turn/started`.
  replayTurn(
    turn,
    environment.exitMidTurn ? (message) => message === started : null,
  );
}

serveJsonLines((line) => {
  const { id, method } = Request.parse(line);
  switch (method) {
    case undefined:
    case 'initialized':
      return;
    case 'initialize':
      return send({ id, result: {} });
    case 'model/list':
      return listModels(id);
    case 'thread/start':
      return send({ id, result: { thread: { id: threadId } } });
    case 'turn/start':
      return startTurn(id);
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
