// A stand-in `claude` that the Agent SDK drives over stream-json. Each prompt replays the next recorded Turn.
import { randomUUID } from 'node:crypto';
import type {
  AccountInfo,
  SDKAssistantMessage,
  SDKControlRequest,
  VendorMessage,
  SDKControlInitializeResponse,
  SDKMessage,
  SDKResultMessage,
  SDKSystemMessage,
} from '../../../packages/agents/claude/messages.ts';
import {
  isControlRequest,
  type SDKControlResponse,
  isControlResponse,
  isInitializeResponse,
  isAssistantMessage,
  isRecordedFrame,
} from '../../../packages/agents/claude/wire.ts';
import { isVendorMessage } from '../../../packages/agents/claude/wire.ts';
import {
  readMockCliEnvironment,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import {
  isRecordedFrame as isWireFrame,
  type RecordedFrame as WireFrame,
} from '../recording.ts';
import { readRecording, recordedFrames, splitTurns } from '../recording.ts';
import {
  createRequestAnswerReader,
  recordRequestAnswer,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { readPermissionResult, toRequestAnswer } from './request-answer.ts';

type ResultUsage = {
  [
    Key in keyof Omit<
      SDKResultMessage['usage'],
      'fallback_credit' | 'iterations' | 'service_tier' | 'speed'
    >
  ]: NonNullable<SDKResultMessage['usage'][Key]>;
} & {
  fallback_credit: null;
  iterations: never[];
  service_tier: 'standard';
  speed: 'standard';
};

const PRODUCER = 'claude-cli';

type Frame =
  | VendorMessage
  | SDKMessage
  | SDKControlRequest
  | WireFrame
  | typeof INTERRUPT_POINT;
type Output = VendorMessage | SDKControlResponse;
const environment = readMockCliEnvironment();
const readRequestAnswer = createRequestAnswerReader();
const recording = readRecording(environment.recordingFile, PRODUCER);

if (process.argv.includes('--version')) {
  process.stdout.write(`${recording.version} (Claude Code)\n`);
  process.exit(0);
}

const pipes = {
  input: Array.isArray(recording.payload)
    ? []
    : recordedFrames(recording.payload, 'input', isWireFrame),
  output: recordedFrames(recording.payload, 'output', isWireFrame),
};
// The recorded answer to each control request, keyed by the request's subtype.
const requestSubtypes = new Map(
  pipes.input.flatMap(
    (
      input,
    ): [] | [readonly [string, SDKControlRequest['request']['subtype']]] =>
      isControlRequest(input)
        ? [[input.request_id, input.request.subtype] as const]
        : [],
  ),
);
const recordedAnswers = new Map<string, unknown>();
const INTERRUPT_POINT = { type: 'mock.interruptPoint' } as const;
const frames: Frame[] = [];
for (const frame of pipes.output) {
  if (!isControlResponse(frame)) {
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
const turns = splitTurns(
  frames,
  (frame): frame is Extract<Frame, { type: 'result' }> =>
    frame.type === 'result',
);
const lastTurn = turns.at(-1);
const turnBefore = turns.at(-2);
if (
  lastTurn &&
  turnBefore &&
  !lastTurn.some(
    (f): f is Extract<Frame, { type: 'result' }> => f.type === 'result',
  )
) {
  turnBefore.push(...lastTurn);
  turns.pop();
}

// The SDK names the vendor session with `--session-id` or `--resume`.
const flagValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
};
const sessionId =
  flagValue('--session-id') ??
  flagValue('--resume') ??
  frames.flatMap((frame): string[] =>
    'session_id' in frame && typeof frame.session_id === 'string'
      ? [frame.session_id]
      : [],
  )[0] ??
  randomUUID();
const withSession = (frame: Frame): Frame =>
  'session_id' in frame ? { ...frame, session_id: sessionId } : frame;
const assistantFrames = (turnFrames: Frame[]): SDKAssistantMessage[] =>
  turnFrames.filter((frame): frame is Extract<Frame, { type: 'assistant' }> =>
    isAssistantMessage(frame),
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
const resultFields = (): Pick<
  SDKResultMessage,
  | 'type'
  | 'duration_ms'
  | 'duration_api_ms'
  | 'num_turns'
  | 'total_cost_usd'
  | 'uuid'
  | 'session_id'
> & {
  usage: ResultUsage;
  modelUsage: Record<string, never>;
  permission_denials: never[];
} => ({
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
      .flatMap((frame): typeof frame.message.content => frame.message.content)
      .filter(
        (
          block,
        ): block is Extract<
          SDKAssistantMessage['message']['content'][number],
          { type: 'text' }
        > => block.type === 'text',
      )
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

const apiKeyAccount: AccountInfo = {
  apiKeySource: 'ANTHROPIC_API_KEY',
  apiProvider: 'firstParty',
};

const isInit = (
  frame: Frame,
): frame is Extract<VendorMessage, { type: 'system'; subtype: 'init' }> =>
  isVendorMessage(frame) && frame.type === 'system' && frame.subtype === 'init';
const crashAfter = environment.exitMidTurn
  ? (frame: Frame): frame is Exclude<Frame, SDKSystemMessage> => !isInit(frame)
  : null;

// The frames of the running Turn held back until an interrupt arrives.
let heldFrames: Frame[] = [];
let pendingRequestId: string | null = null;
let pendingRequest: SDKControlRequest | null = null;
const concurrentRequests = new Map<string, SDKControlRequest>();

function replay(turn: Frame[]): void {
  const pause = turn.findIndex(
    (frame): boolean =>
      frame === INTERRUPT_POINT ||
      (isControlRequest(frame) && frame.request.subtype === 'can_use_tool'),
  );
  const request = turn[pause];
  pendingRequestId = isControlRequest(request) ? request.request_id : null;
  pendingRequest = isControlRequest(request) ? request : null;
  const now =
    pause === -1 ? turn : turn.slice(0, pause + (pendingRequestId ? 1 : 0));
  heldFrames = pause === -1 ? [] : turn.slice(pause + 1);
  if (
    environment.scenario.concurrentQuestions &&
    pendingRequest?.request.subtype === 'can_use_tool' &&
    pendingRequest.request.tool_name === 'AskUserQuestion'
  ) {
    const second: SDKControlRequest = {
      ...pendingRequest,
      request_id: `${pendingRequest.request_id}-second`,
      request: {
        ...pendingRequest.request,
        tool_use_id: `${pendingRequest.request.tool_use_id}-second`,
      },
    };
    concurrentRequests.set(pendingRequest.request_id, pendingRequest);
    concurrentRequests.set(second.request_id, second);
    replayTurn([...now, second].map(withSession), crashAfter);
    return;
  }
  const finished = replayTurn(now.map(withSession), crashAfter);
  if (
    finished &&
    pause === -1 &&
    !turn.some(
      (f): f is Extract<Frame, { type: 'result' }> => f.type === 'result',
    )
  )
    send(withSession(resultFrame(turn)));
}

function playTurn(): void {
  const turn = turns[turnIndex++];
  if (turn === undefined) {
    send(noTurnFrame(turnIndex));
    return;
  }
  // A CLI that has sent no frame of the Turn yet sends all of them after it answers `interrupt`.
  if (environment.scenario.blockTurnStart) {
    heldFrames = [
      ...(turn.some(isInit) ? [] : [initFrame()]),
      ...turn.filter((frame): boolean => frame !== INTERRUPT_POINT),
    ];
    return;
  }
  if (!turn.some(isInit)) send(initFrame());
  if (environment.scenario.malformedPayload) {
    send({ type: 'future_message' });
    send({ type: 'http' });
  }
  replay(turn);
}

function answer(
  subtype: string | undefined,
): NonNullable<ReturnType<typeof recordedAnswers.get>> | undefined {
  if (subtype === undefined) return;
  if (subtype === 'set_model') return {};
  if (subtype !== 'initialize')
    return (
      recordedAnswers.get(subtype) ?? (subtype === 'interrupt' ? {} : undefined)
    );
  // The recording's answer to `initialize` is the CLI's own, matched by request id.
  const recorded = recordedAnswers.get(subtype);
  const response = isInitializeResponse(recorded)
    ? recorded
    : initializeResponse;
  return {
    ...response,
    account: signedInAccount(response.account),
  } satisfies Pick<SDKControlInitializeResponse, 'models' | 'account'>;
}

function signedInAccount(recorded: AccountInfo): AccountInfo {
  // A CLI nobody signed in to still starts, with an account that has no subscription.
  if (environment.availability === 'not_signed_in') return {};
  // A key that reaches the CLI, or a scenario that fakes one, replaces the subscription.
  if (
    process.env.ANTHROPIC_API_KEY ||
    environment.scenario.account === 'apiKey'
  )
    return apiKeyAccount;
  return recorded;
}

serveJsonLines<Output>((input): void => {
  if (input.type === 'control_response') {
    if (concurrentRequests.has(input.response.request_id)) {
      pendingRequest =
        concurrentRequests.get(input.response.request_id) ?? null;
      pendingRequestId = input.response.request_id;
      concurrentRequests.delete(input.response.request_id);
    }
    if (
      input.response.request_id === pendingRequestId &&
      input.response.subtype === 'success'
    ) {
      const request = pendingRequest?.request;
      const response = input.response.response;
      if (request?.subtype === 'can_use_tool')
        recordRequestAnswer(
          readRequestAnswer((): RecordedRequestAnswer =>
            toRequestAnswer(request, readPermissionResult(response)),
          ),
        );
      if (concurrentRequests.size === 0) replay(heldFrames);
    }
    return;
  }
  if (input.type === 'user') return playTurn();
  if (input.type !== 'control_request') return;
  const subtype = input.request.subtype;
  if (subtype === 'initialize' && environment.scenario.blockInitialize) return;
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
}, isRecordedFrame);
