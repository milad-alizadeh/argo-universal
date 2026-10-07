// A stand-in `claude` that the Agent SDK drives over stream-json. Each prompt replays the next recorded Turn.
import { randomUUID } from 'node:crypto';
import type {
  AskUserQuestionInput,
  PermissionResult,
  SDKAssistantMessage,
  SDKControlInitializeResponse,
  SDKControlRequest,
  SDKControlResponse,
  SDKMessage,
  SDKResultMessage,
  SDKSystemMessage,
} from '../../../packages/agents/claude/messages.ts';
import {
  readMockCliEnvironment,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import { readRecording, recordedFrames, splitTurns } from '../recording.ts';
import { recordRequestAnswer } from '../request-answer.ts';

const PRODUCER = 'claude-cli';

type Frame = SDKMessage | SDKControlRequest | typeof INTERRUPT_POINT;
type Output = SDKMessage | SDKControlRequest | SDKControlResponse;
const environment = readMockCliEnvironment();
const recording = readRecording(environment.recordingFile, PRODUCER);

if (process.argv.includes('--version')) {
  process.stdout.write(`${recording.version} (Claude Code)\n`);
  process.exit(0);
}

const pipes = {
  input: Array.isArray(recording.payload)
    ? []
    : recordedFrames<SDKMessage | SDKControlRequest>(
        recording.payload,
        'input',
      ),
  output: recordedFrames<Output>(recording.payload, 'output'),
};
// The recorded answer to each control request, keyed by the request's subtype.
const requestSubtypes = new Map(
  pipes.input.flatMap((input) =>
    input.type === 'control_request'
      ? [[input.request_id, input.request.subtype] as const]
      : [],
  ),
);
const recordedAnswers = new Map<string, unknown>();
const INTERRUPT_POINT = { type: 'mock.interruptPoint' } as const;
const frames: Frame[] = [];
for (const frame of pipes.output) {
  if (frame.type !== 'control_response') {
    frames.push(frame);
    continue;
  }
  const subtype = requestSubtypes.get(frame.response.request_id);
  if (
    frame.response.subtype === 'success' &&
    subtype &&
    !recordedAnswers.has(subtype)
  )
    recordedAnswers.set(subtype, frame.response.response);
  // A Turn pauses where the CLI answered an interrupt, until the mock gets one.
  if (subtype === 'interrupt') frames.push(INTERRUPT_POINT);
}

// Frames after a Turn's `result`, such as the idle state, belong to that Turn.
const turns = splitTurns(frames, (frame) => frame.type === 'result');
const lastTurn = turns.at(-1);
const turnBefore = turns.at(-2);
if (lastTurn && turnBefore && !lastTurn.some((f) => f.type === 'result')) {
  turnBefore.push(...lastTurn);
  turns.pop();
}

// The SDK names the vendor session with `--session-id` or `--resume`.
const flagValue = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};
const sessionId =
  flagValue('--session-id') ??
  flagValue('--resume') ??
  frames.find((frame): frame is SDKMessage => 'session_id' in frame)
    ?.session_id ??
  randomUUID();
const withSession = (frame: Frame) =>
  'session_id' in frame ? { ...frame, session_id: sessionId } : frame;
const assistantFrames = (turnFrames: Frame[]) =>
  turnFrames.filter(
    (frame): frame is SDKAssistantMessage => frame.type === 'assistant',
  );
let turnIndex = 0;

// The CLI's `system/init`, written when a recorded Turn lacks one.
const initFrame = (): SDKSystemMessage => ({
  type: 'system',
  subtype: 'init',
  apiKeySource: 'none',
  claude_code_version: recording.version,
  cwd: process.cwd(),
  tools: [],
  mcp_servers: [],
  model: assistantFrames(frames)[0]?.message.model ?? 'default',
  permissionMode: 'default',
  slash_commands: [],
  output_style: 'default',
  skills: [],
  plugins: [],
  uuid: randomUUID(),
  session_id: sessionId,
});

// The fields every `result` frame carries, zeroed because a mock spends nothing.
const resultFields = () => ({
  type: 'result' as const,
  duration_ms: 0,
  duration_api_ms: 0,
  num_turns: 1,
  total_cost_usd: 0,
  usage: {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation: {
      ephemeral_1h_input_tokens: 0,
      ephemeral_5m_input_tokens: 0,
    },
    fallback_credit: null,
    inference_geo: '',
    iterations: [],
    output_tokens_details: { thinking_tokens: 0 },
    server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 },
    service_tier: 'standard',
    speed: 'standard',
  } satisfies SDKResultMessage['usage'],
  modelUsage: {},
  permission_denials: [],
  uuid: randomUUID(),
  session_id: sessionId,
});

// The CLI's `result`, written when a recorded Turn lacks one.
const resultFrame = (turn: Frame[]): SDKResultMessage => ({
  ...resultFields(),
  subtype: 'success' as const,
  is_error: false,
  result:
    assistantFrames(turn)
      .flatMap((frame) => frame.message.content)
      .filter((block) => block.type === 'text')
      .at(-1)?.text ?? '',
  stop_reason: 'end_turn',
});

// Ends a prompt past the recording's last Turn as a failed Turn, which a crash never writes.
const noTurnFrame = (turnNumber: number): SDKResultMessage => ({
  ...resultFields(),
  subtype: 'error_during_execution' as const,
  is_error: true,
  errors: [`The recording has no Turn ${turnNumber}.`],
  stop_reason: null,
});

// The answer to the SDK's `initialize`, with no commands, agents or models of its own.
const initializeResponse: SDKControlInitializeResponse = {
  commands: [],
  agents: [],
  output_style: 'default',
  available_output_styles: ['default'],
  models: [],
  account: { subscriptionType: 'Claude Max', apiProvider: 'firstParty' },
};

const isInit = (frame: Frame) =>
  frame.type === 'system' && frame.subtype === 'init';
const crashAfter = environment.exitMidTurn
  ? (frame: Frame) => !isInit(frame)
  : null;

// The frames of the running Turn held back until an interrupt arrives.
let heldFrames: Frame[] = [];
let pendingRequestId: string | null = null;
let pendingRequest: SDKControlRequest | null = null;

function replay(turn: Frame[]) {
  const pause = turn.findIndex(
    (frame) =>
      frame === INTERRUPT_POINT ||
      (frame.type === 'control_request' &&
        frame.request.subtype === 'can_use_tool'),
  );
  const request = turn[pause];
  pendingRequestId =
    request?.type === 'control_request' ? request.request_id : null;
  pendingRequest = request?.type === 'control_request' ? request : null;
  const now =
    pause === -1 ? turn : turn.slice(0, pause + (pendingRequestId ? 1 : 0));
  heldFrames = pause === -1 ? [] : turn.slice(pause + 1);
  const finished = replayTurn(now.map(withSession), crashAfter);
  if (finished && pause === -1 && !turn.some((f) => f.type === 'result'))
    send(withSession(resultFrame(turn)));
}

function playTurn() {
  const turn = turns[turnIndex++];
  if (turn === undefined) {
    send(noTurnFrame(turnIndex));
    return;
  }
  if (!turn.some(isInit)) send(initFrame());
  replay(turn);
}

function answer(subtype: string | undefined) {
  if (subtype === undefined) return;
  if (subtype !== 'initialize') return recordedAnswers.get(subtype);
  const response = recordedAnswers.get(subtype) ?? initializeResponse;
  // A CLI nobody signed in to still starts, with an account that has no subscription.
  if (environment.availability !== 'not_signed_in') return response;
  return { ...(response as Record<string, unknown>), account: {} };
}

serveJsonLines<Output>((input) => {
  if (input.type === 'control_response') {
    if (
      input.response.request_id === pendingRequestId &&
      input.response.subtype === 'success'
    ) {
      const result = input.response.response as PermissionResult;
      if (
        pendingRequest?.request.subtype === 'can_use_tool' &&
        pendingRequest.request.tool_name !== 'AskUserQuestion'
      )
        recordRequestAnswer(
          result.behavior === 'allow'
            ? { type: 'permission', optionId: 'allow_once' }
            : {
                type: 'permission',
                optionId: 'reject_once',
                message: result.message,
              },
        );
      if (
        pendingRequest?.request.subtype === 'can_use_tool' &&
        pendingRequest.request.tool_name === 'AskUserQuestion'
      ) {
        const deniedAction =
          result.behavior === 'deny' && result.interrupt ? 'cancel' : 'decline';
        recordRequestAnswer({
          type: 'elicitation',
          action: result.behavior === 'allow' ? 'accept' : deniedAction,
          ...(result.behavior === 'allow'
            ? {
                content: result.updatedInput
                  ?.answers as AskUserQuestionInput['answers'],
              }
            : {}),
        });
      }
      replay(heldFrames);
    }
    return;
  }
  if (input.type === 'user') return playTurn();
  if (input.type !== 'control_request') return;
  const subtype = input.request.subtype;
  if (subtype === 'initialize' && process.env.MOCK_CLI_BLOCK_INITIALIZE === '1')
    return;
  const response = answer(subtype);
  send({
    type: 'control_response',
    response:
      response === undefined
        ? {
            subtype: 'error',
            request_id: input.request_id,
            error: `The recording does not answer ${subtype}.`,
          }
        : { subtype: 'success', request_id: input.request_id, response },
  });
  if (subtype === 'interrupt' && heldFrames.length > 0) replay(heldFrames);
});
