// A stand-in `codex app-server` over JSON-RPC. Each `turn/start` replays the next recorded Turn.
import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import type {
  Account,
  CommandExecutionRequestApprovalResponse,
  FileChangeRequestApprovalResponse,
  GetAccountResponse,
  ThreadResumeParams,
  ToolRequestUserInputResponse,
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
import { recordRequestAnswer } from '../request-answer.ts';

const PRODUCER = 'codex-app-server';
// JSON-RPC error codes.
const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

// The transport owns method and correlation; each request payload uses generated protocol types.
type Request = {
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
};
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
let cancelling = false;
let heldRequestId: string | number | null = null;
let heldRequest: VendorMessage | null = null;
let requestFrames: typeof messages = [];
const concurrentRequests = new Map<string | number, VendorMessage>();

function replayRequestFrames(
  recordedFrames: typeof messages,
  crashAfter: ((message: VendorMessage) => boolean) | null,
) {
  let frames = recordedFrames;
  const index = frames.findIndex((frame) => 'id' in frame);
  let request = frames[index];
  if (request && environment.scenario.otherThreadRequest) {
    // Changing only threadId preserves the recording's generated payload family.
    request = {
      ...request,
      params: { ...request.params, threadId: 'another-thread' },
    } as VendorMessage;
    frames = [...frames.slice(0, index), request, ...frames.slice(index + 1)];
  }
  heldRequestId = request && 'id' in request ? request.id : null;
  heldRequest = request ?? null;
  requestFrames = index < 0 ? [] : frames.slice(index + 1);
  if (
    environment.scenario.concurrentQuestions &&
    request?.method === 'item/tool/requestUserInput'
  ) {
    const second = {
      ...request,
      id: `${request.id}-second`,
      params: { ...request.params, itemId: `${request.params.itemId}-second` },
    } satisfies VendorMessage;
    concurrentRequests.set(request.id, request);
    concurrentRequests.set(second.id, second);
    replayTurn([...frames.slice(0, index + 1), second], crashAfter);
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
  cancelling = false;
  const frames = command >= 0 ? turn.slice(0, command + 1) : turn;
  if (environment.scenario.blockTurnStart) {
    replayTurn(frames.slice(0, frames.indexOf(started) + 1), null);
    return;
  }
  const response = { id, result: { turn: started.params?.turn } };
  const crashAfter = environment.exitMidTurn
    ? (message: (typeof frames)[number]) => message === started
    : null;
  if (turnIndex === 1 && environment.scenario.turnResponseAfterNextStart) {
    withheldStartResponse = response;
    replayTurn(frames, crashAfter);
    if (command < 0) activeTurnId = null;
    return;
  }
  if (environment.scenario.requestBeforeStartResponse) {
    withheldStartResponse = response;
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

serveJsonLines<Request>(({ id, method, params, result }) => {
  switch (method) {
    case undefined:
      return answerRequest(id, result);
    case 'initialized':
      return;
    case 'initialize':
      if (environment.scenario.blockInitialize) return;
      if (environment.scenario.malformedLine) return send({ id, error: {} });
      return send({ id, result: {} });
    case 'account/read': {
      const usesApiKey =
        process.env.OPENAI_API_KEY ||
        process.env.CODEX_API_KEY ||
        environment.scenario.account === 'apiKey';
      const account: Account = usesApiKey
        ? { type: 'apiKey' }
        : { type: 'chatgpt', email: 'mock@example.com', planType: 'plus' };
      const response: GetAccountResponse = {
        account: environment.availability === 'not_signed_in' ? null : account,
        requiresOpenaiAuth: true,
        workspaceRouting: null,
      };
      return send({ id, result: response });
    }
    case 'model/list':
      return listModels(id);
    case 'thread/start':
      return send({ id, result: { thread: { id: threadId } } });
    case 'thread/resume': {
      const file = environment.scenario.transcriptFile;
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
      cancelling = true;
      if (environment.scenario.interruptError !== 'none') {
        if (environment.scenario.interruptError === 'afterCompletion') {
          const completed = requestFrames.find(
            (message) => message.method === 'turn/completed',
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
      if ((params as TurnInterruptParams)?.turnId !== activeTurnId)
        return send({
          id,
          error: {
            code: INTERNAL_ERROR,
            message: 'The vendor Turn id does not match.',
          },
        });
      if (heldRequest?.method === 'item/tool/requestUserInput') {
        if (concurrentRequests.size === 0)
          recordRequestAnswer({ type: 'elicitation', action: 'cancel' });
        const completed = requestFrames.find(
          (message) => message.method === 'turn/completed',
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
      return startTurn(
        id,
        (params as TurnStartParams & { notificationsFirst?: boolean })
          ?.notificationsFirst || environment.scenario.notificationsFirst,
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

// Correlates mock request replies and releases the Turn once every question has an answer.
function answerRequest(id: string | number | undefined, result: unknown) {
  if (id !== undefined && concurrentRequests.has(id)) {
    heldRequest = concurrentRequests.get(id) ?? null;
    heldRequestId = id;
    concurrentRequests.delete(id);
  }
  if (id === heldRequestId) {
    if (
      heldRequest?.method === 'item/commandExecution/requestApproval' ||
      heldRequest?.method === 'item/fileChange/requestApproval'
    ) {
      const answer = result as
        | CommandExecutionRequestApprovalResponse
        | FileChangeRequestApprovalResponse;
      recordRequestAnswer({
        type: 'permission',
        optionId: answer.decision === 'accept' ? 'allow_once' : 'reject_once',
      });
    }
    if (heldRequest?.method === 'item/tool/requestUserInput') {
      const answer = result as ToolRequestUserInputResponse;
      recordRequestAnswer(
        Object.keys(answer.answers).length
          ? {
              type: 'elicitation',
              action: 'accept',
              content: Object.fromEntries(
                Object.entries(answer.answers).map(([key, value]) => [
                  key,
                  value?.answers.length === 1
                    ? value.answers[0]
                    : value?.answers,
                ]),
              ),
            }
          : {
              type: 'elicitation',
              action: cancelling ? 'cancel' : 'decline',
            },
      );
    }
    if (withheldStartResponse) {
      send(withheldStartResponse);
      withheldStartResponse = null;
    }
    if (concurrentRequests.size === 0 && !cancelling)
      replayRequestFrames(requestFrames, null);
  }
}
