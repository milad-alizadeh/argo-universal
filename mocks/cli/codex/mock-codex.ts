// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
import path from 'node:path';
import { z } from 'zod';
import {
  readMockCliEnvironment,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import { readRecording, splitTurns } from '../recording.ts';

const PRODUCER = 'codex-app-server';

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
const models = readRecording(
  path.join(path.dirname(environment.recordingFile), 'model-list.json'),
  PRODUCER,
).payload;
let turnIndex = 0;

function startTurn(id: string | number | undefined) {
  const turn = turns[turnIndex++];
  const started = turn?.find((message) => message.method === 'turn/started');
  if (turn === undefined || started === undefined) {
    send({
      id,
      error: {
        code: -32603,
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
    case 'turn/interrupt':
      return send({ id, result: {} });
    case 'model/list':
      return send({ id, result: models });
    case 'thread/start':
    case 'thread/resume':
      return send({ id, result: { thread: { id: threadId } } });
    case 'turn/start':
      return startTurn(id);
    default:
      send({
        id,
        error: {
          code: -32601,
          message: `The recording does not answer ${method}.`,
        },
      });
  }
});
