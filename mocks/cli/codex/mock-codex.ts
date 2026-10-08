// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import {
  isVendorMessage,
  isThreadStartResponse,
  isAccountResponse,
} from '../../../packages/agents/codex/payloads.ts';
import type {
  Turn,
  Account,
  GetAccountResponse,
} from '../../../packages/agents/codex/protocol.gen.ts';
import {
  isResumeInput,
  isInterruptInput,
} from '../../../packages/agents/codex/request-payloads.ts';
import {
  type WireFrame,
  type WireMessage,
  isWireMessage,
  isWireFrame,
} from '../../../packages/agents/codex/wire-payloads.ts';
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
import {
  createRequestAnswerReader,
  recordRequestAnswer,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { toPlanProposalAnswer, toRequestAnswer } from './request-answer.ts';

const PRODUCER = 'codex-app-server';
// JSON-RPC error codes.
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

const environment = readMockCliEnvironment();
const readRequestAnswer = createRequestAnswerReader();
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
const messages = recordedFrames(
  recording.payload,
  'messages',
  isWireMessage,
).map(({ emittedAtMs: _, ...message }): typeof message => message);
const turns = splitTurns(
  messages,
  (message): message is Extract<VendorMessage, { method: 'turn/completed' }> =>
    isVendorMessage(message) && message.method === 'turn/completed',
);
const recordedThreadId = messages.flatMap((message): string[] =>
  typeof message.params.threadId === 'string' ? [message.params.threadId] : [],
)[0];
if (!recordedThreadId) throw new Error('The recording has no thread id.');
let threadId = recordedThreadId;
let turnIndex = 0;
let pendingPlanProposal = false;
let interruptedFrames: typeof messages | null = null;
let activeTurnId: string | null = null;
let cancelling = false;
let heldRequestId: string | number | null = null;
let heldRequest: VendorMessage | null = null;
let requestFrames: typeof messages = [];
const concurrentRequests = new Map<string | number, VendorMessage>();

function replayRequestFrames(
  recordedFrames: typeof messages,
  crashAfter: ((message: WireMessage) => boolean) | null,
): void {
  let frames = recordedFrames;
  const index = frames.findIndex(
    (frame): frame is Extract<VendorMessage, { id: string | number }> =>
      'id' in frame,
  );
  let request = frames[index];
  if (request && environment.scenario.otherThreadRequest) {
    // Changing only threadId preserves the recording's generated payload family.
    request = {
      ...request,
      params: { ...request.params, threadId: 'another-thread' },
    };
    frames = [...frames.slice(0, index), request, ...frames.slice(index + 1)];
  }
  heldRequestId = request?.id ?? null;
  heldRequest = isVendorMessage(request) ? request : null;
  requestFrames = index < 0 ? [] : frames.slice(index + 1);
  if (
    environment.scenario.concurrentQuestions &&
    isVendorMessage(request) &&
    request.method === 'item/tool/requestUserInput'
  ) {
    const second = {
      ...request,
      id: `${request.id}-second`,
      params: { ...request.params, itemId: `${request.params.itemId}-second` },
    } satisfies VendorMessage;
    concurrentRequests.set(request.id, request);
    concurrentRequests.set(second.id, second);
    replayTurn<WireMessage>(
      [...frames.slice(0, index + 1), second],
      crashAfter,
    );
    return;
  }
  const completed = replayTurn(
    index < 0 ? frames : frames.slice(0, index + 1),
    crashAfter,
  );
  if (completed && index < 0) activeTurnId = null;
}
let withheldStartResponse: {
  id: string | number | undefined;
  result: { turn: Turn };
} | null = null;

// Read on request, so a version folder without a model list still serves Turns.
function listModels(id: string | number | undefined): void {
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
): void {
  const turn = turns[turnIndex++]?.map((message): WireMessage => ({
    ...message,
    params: { ...message.params, threadId },
  }));
  const started = turn?.find(
    (message): message is Extract<VendorMessage, { method: 'turn/started' }> =>
      isVendorMessage(message) && message.method === 'turn/started',
  );
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
    isVendorMessage(final) &&
    final.method === 'turn/completed' &&
    final.params.turn.status === 'interrupted';
  const command = interrupted
    ? turn.findIndex(
        (message): boolean =>
          isVendorMessage(message) &&
          message.method === 'item/started' &&
          message.params.item.type === 'commandExecution',
      )
    : -1;
  if (command >= 0) interruptedFrames = turn.slice(command + 1);
  pendingPlanProposal = turn.some(
    (message): boolean =>
      isVendorMessage(message) &&
      message.method === 'item/completed' &&
      message.params.item.type === 'plan',
  );
  activeTurnId = started.params.turn.id;
  cancelling = false;
  const frames = command >= 0 ? turn.slice(0, command + 1) : turn;
  if (environment.scenario.blockTurnStart) {
    replayTurn(frames.slice(0, frames.indexOf(started) + 1), null);
    return;
  }
  const incompleteTurn: Partial<typeof started.params.turn> = {
    ...started.params.turn,
  };
  delete incompleteTurn.itemsView;
  const response = {
    id,
    result: {
      turn: environment.scenario.malformedPayload
        ? incompleteTurn
        : started.params.turn,
    },
  };
  const crashAfter = environment.exitMidTurn
    ? (message: (typeof frames)[number]): boolean => message === started
    : null;
  if (turnIndex === 1 && environment.scenario.turnResponseAfterNextStart) {
    withheldStartResponse = { id, result: { turn: started.params.turn } };
    replayTurn(frames, crashAfter);
    if (command < 0) activeTurnId = null;
    return;
  }
  if (environment.scenario.requestBeforeStartResponse) {
    withheldStartResponse = { id, result: { turn: started.params.turn } };
    replayRequestFrames(frames, crashAfter);
    return;
  }
  let before = 0;
  if (environment.scenario.completionBeforeResponse) {
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
  if (command >= 0) replayTurn(frames.slice(before), crashAfter);
  else replayRequestFrames(frames.slice(before), crashAfter);
}

serveJsonLines<WireFrame>(({ id, method, params, result }): void | boolean => {
  switch (method) {
    case undefined:
      return answerRequest(id, result);
    case 'initialized':
      return;
    case 'initialize':
      if (environment.scenario.blockInitialize) return;
      if (environment.scenario.malformedLine) return send({ id, error: {} });
      if (environment.scenario.malformedPayload)
        return send({ id, result: {} });
      return send({ id, result: startupResponse('initialize') });
    case 'account/read': {
      const usesApiKey =
        process.env.OPENAI_API_KEY ||
        process.env.CODEX_API_KEY ||
        environment.scenario.account === 'apiKey';
      const captured = startupResponse('account-read');
      if (!isAccountResponse(captured))
        throw new Error('Invalid account recording');
      const account = usesApiKey
        ? ({ type: 'apiKey' } satisfies Account)
        : captured.account;
      const response: GetAccountResponse = {
        ...captured,
        account: environment.availability === 'not_signed_in' ? null : account,
      };
      return send({ id, result: response });
    }
    case 'model/list':
      return listModels(id);
    case 'thread/start':
      return send({ id, result: startupResponse('thread-start') });
    case 'thread/resume': {
      const file = environment.scenario.transcriptFile;
      const stored = file ? readMockTranscript(file) : null;
      if (!isResumeInput(params))
        throw new Error('Invalid thread/resume input');
      const resume = params;
      if (!stored || stored.vendorSessionId !== resume?.threadId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: `Codex has no transcript for Session ${resume?.threadId}.`,
          },
        });
      threadId = stored.vendorSessionId;
      return send({ id, result: startupResponse('thread-resume') });
    }
    case 'turn/interrupt':
      cancelling = true;
      if (environment.scenario.interruptError !== 'none') {
        if (environment.scenario.interruptError === 'afterCompletion') {
          const completed = requestFrames.find(
            (
              message,
            ): message is Extract<
              VendorMessage,
              { method: 'turn/completed' }
            > => message.method === 'turn/completed',
          );
          if (completed?.method === 'turn/completed')
            send({
              ...completed,
              params: {
                ...completed.params,
                turn: { ...completed.params.turn, status: 'interrupted' },
              },
            } satisfies VendorMessage);
          activeTurnId = null;
        }
        return send({
          id,
          error: { code: INTERNAL_ERROR, message: 'Mock interrupt failed.' },
        });
      }
      if (!isInterruptInput(params) || params.turnId !== activeTurnId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: 'The vendor Turn id does not match.',
          },
        });
      const interruptedRequest = heldRequest;
      if (interruptedRequest?.method === 'item/tool/requestUserInput') {
        if (concurrentRequests.size === 0)
          recordRequestAnswer(
            readRequestAnswer((): RecordedRequestAnswer =>
              toRequestAnswer(interruptedRequest, { method: 'turn/interrupt' }),
            ),
          );
        const completed = requestFrames.find(
          (
            message,
          ): message is Extract<VendorMessage, { method: 'turn/completed' }> =>
            message.method === 'turn/completed',
        );
        send({ id, result: {} });
        if (completed?.method === 'turn/completed')
          send({
            ...completed,
            params: {
              ...completed.params,
              turn: { ...completed.params.turn, status: 'interrupted' },
            },
          } satisfies VendorMessage);
        heldRequestId = null;
        heldRequest = null;
        requestFrames = [];
        activeTurnId = null;
        return;
      }
      if (!interruptedFrames) return send({ id, result: {} });
      send({ id, result: {} });
      replayTurn(interruptedFrames, null);
      interruptedFrames = null;
      activeTurnId = null;
      return;
    case 'turn/start':
      if (pendingPlanProposal)
        recordRequestAnswer(
          readRequestAnswer((): RecordedRequestAnswer =>
            toPlanProposalAnswer(params),
          ),
        );
      return startTurn(
        id,
        notificationsFirstRequested(params) ||
          environment.scenario.notificationsFirst,
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
}, isWireFrame);

// Correlates mock request replies and releases the Turn once every question has an answer.
function answerRequest(id: string | number | undefined, result: unknown): void {
  if (id !== undefined && concurrentRequests.has(id)) {
    heldRequest = concurrentRequests.get(id) ?? null;
    heldRequestId = id;
    concurrentRequests.delete(id);
  }
  if (id === heldRequestId) {
    const request = heldRequest;
    if (request && 'id' in request)
      recordRequestAnswer(
        readRequestAnswer((): RecordedRequestAnswer =>
          toRequestAnswer(request, result),
        ),
      );
    if (withheldStartResponse) {
      send(withheldStartResponse);
      withheldStartResponse = null;
    }
    if (concurrentRequests.size === 0 && !cancelling)
      replayRequestFrames(requestFrames, null);
  }
}

const notificationsFirstRequested = (value: unknown): boolean =>
  isWireFrame(value) &&
  'notificationsFirst' in value &&
  value.notificationsFirst === true;

function startupResponse(method: string): unknown {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    `startup-${method}`,
  );
  const captured = readRecording(file, PRODUCER).payload;
  const identityFile = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'startup-thread-start',
  );
  const identity = readRecording(identityFile, PRODUCER).payload;
  if (!isThreadStartResponse(identity))
    throw new Error('Invalid startup recording');
  return JSON.parse(
    JSON.stringify(captured)
      .replaceAll(identity.thread.id, threadId)
      .replaceAll(identity.cwd, process.cwd()),
  );
}
