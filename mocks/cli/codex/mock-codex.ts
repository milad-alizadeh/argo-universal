// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import type {
  ThreadResumeParams,
  TurnInterruptParams,
  TurnStartParams,
  TurnStartResponse,
} from '../../../packages/agents/codex/protocol.gen.ts';
import {
  readMockCliEnvironment,
  readMockTranscript,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import {
  findRecording,
  readRecording,
  recordedFrames,
  splitTurns,
} from '../recording.ts';

const PRODUCER = 'codex-app-server';
// JSON-RPC error codes.
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

// The transport owns method and correlation; each request payload uses generated protocol types.
type Request = { id?: string | number; method?: string; params?: unknown };
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
const messages = recordedFrames<VendorMessage & { emittedAtMs?: number }>(
  recording.payload,
  'messages',
).map(({ emittedAtMs: _, ...message }) => message);
const turns = splitTurns(
  messages,
  (message) => message.method === 'turn/completed',
);
const recordedThreadId = messages.find((message) => message.params.threadId)
  ?.params.threadId;
if (!recordedThreadId) throw new Error('The recording has no thread id.');
let threadId = recordedThreadId;
let turnIndex = 0;
let interruptedFrames: typeof messages | null = null;
let activeTurnId: string | null = null;
let withheldStartResponse: {
  id: string | number | undefined;
  result: TurnStartResponse;
} | null = null;

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
  const turn = turns[turnIndex++]?.map(
    (message) =>
      ({
        ...message,
        params: { ...message.params, threadId },
      }) as VendorMessage,
  );
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
    final.params.turn.status === 'interrupted';
  const command = interrupted
    ? turn.findIndex(
        (message) =>
          message.method === 'item/started' &&
          message.params.item.type === 'commandExecution',
      )
    : -1;
  if (command >= 0) interruptedFrames = turn.slice(command + 1);
  activeTurnId = started.params.turn.id;
  const frames = command >= 0 ? turn.slice(0, command + 1) : turn;
  if (process.env.MOCK_CLI_BLOCK_TURN_START === '1') {
    replayTurn(frames.slice(0, frames.indexOf(started) + 1), null);
    return;
  }
  const response = { id, result: { turn: started.params?.turn } };
  const crashAfter = environment.exitMidTurn
    ? (message: (typeof frames)[number]) => message === started
    : null;
  if (
    turnIndex === 1 &&
    process.env.MOCK_CLI_TURN_RESPONSE_AFTER_NEXT_START === '1'
  ) {
    withheldStartResponse = response;
    replayTurn(frames, crashAfter);
    if (command < 0) activeTurnId = null;
    return;
  }
  let before = 0;
  if (process.env.MOCK_CLI_COMPLETION_BEFORE_RESPONSE === '1') {
    before = frames.length;
  } else if (notificationsFirst || withheldStartResponse) {
    before = frames.indexOf(started) + 1;
  }
  if (before && !replayTurn(frames.slice(0, before), crashAfter)) return;
  if (withheldStartResponse) {
    send(withheldStartResponse);
    withheldStartResponse = null;
  }
  send(response);
  replayTurn(frames.slice(before), crashAfter);
  if (command < 0) activeTurnId = null;
}

serveJsonLines<Request>(({ id, method, params }) => {
  switch (method) {
    case undefined:
    case 'initialized':
      return;
    case 'initialize':
      if (process.env.MOCK_CLI_BLOCK_INITIALIZE === '1') return;
      return send({ id, result: {} });
    case 'account/read':
      return send({
        id,
        result: {
          account:
            environment.availability === 'not_signed_in'
              ? null
              : {
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
      const stored = file ? readMockTranscript(file) : null;
      const resume = params as ThreadResumeParams;
      if (!stored || stored.vendorSessionId !== resume?.threadId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: `Codex has no transcript for Session ${resume?.threadId}.`,
          },
        });
      threadId = stored.vendorSessionId;
      return send({ id, result: { thread: { id: threadId } } });
    }
    case 'turn/interrupt':
      if ((params as TurnInterruptParams)?.turnId !== activeTurnId)
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
      activeTurnId = null;
      return;
    case 'turn/start':
      return startTurn(
        id,
        (params as TurnStartParams & { notificationsFirst?: boolean })
          ?.notificationsFirst ||
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
