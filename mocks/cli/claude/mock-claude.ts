// A stand-in `claude` that the Agent SDK drives over stream-json. Each prompt replays the next recorded Turn.
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  readMockCliEnvironment,
  replayTurn,
  send,
  serveJsonLines,
} from '../mock-cli.ts';
import { readRecording, splitTurns } from '../recording.ts';

const PRODUCER = 'claude-cli';

const Frame = z.looseObject({
  type: z.string(),
  subtype: z.string().optional(),
  session_id: z.string().optional(),
});
type Frame = z.infer<typeof Frame>;

const AssistantFrame = z.looseObject({
  type: z.literal('assistant'),
  message: z.looseObject({
    model: z.string(),
    content: z.array(
      z.looseObject({ type: z.string(), text: z.string().optional() }),
    ),
  }),
});

const Input = z.looseObject({
  type: z.string(),
  request_id: z.string().optional(),
  request: z.looseObject({ subtype: z.string() }).optional(),
});

const ControlResponse = z.looseObject({
  type: z.literal('control_response'),
  response: z.looseObject({ request_id: z.string(), response: z.unknown() }),
});

// A `.jsonl` recording holds stdout frames; a `.json` one may hold both pipes.
const Payload = z.union([
  z.array(Frame),
  z.object({ input: z.array(Input), output: z.array(Frame) }),
]);

const environment = readMockCliEnvironment();
const recording = readRecording(environment.recordingFile, PRODUCER);

if (process.argv.includes('--version')) {
  process.stdout.write(`${recording.version} (Claude Code)\n`);
  process.exit(0);
}

const payload = Payload.parse(recording.payload);
const pipes = Array.isArray(payload) ? { input: [], output: payload } : payload;

// The recorded answer to each control request, keyed by the request's subtype.
const requestSubtypes = new Map(
  pipes.input.flatMap((input) =>
    input.request_id && input.request
      ? [[input.request_id, input.request.subtype] as const]
      : [],
  ),
);
const recordedAnswers = new Map<string, unknown>();
const INTERRUPT_POINT = { type: 'mock.interruptPoint' } as const;
const frames: Frame[] = [];
for (const frame of pipes.output) {
  const response = ControlResponse.safeParse(frame);
  if (!response.success) {
    frames.push(frame);
    continue;
  }
  const subtype = requestSubtypes.get(response.data.response.request_id);
  if (subtype && !recordedAnswers.has(subtype))
    recordedAnswers.set(subtype, response.data.response.response);
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
  frames.find((frame) => frame.session_id)?.session_id ??
  randomUUID();
const withSession = (frame: Frame) =>
  frame.session_id === undefined ? frame : { ...frame, session_id: sessionId };
const assistantFrames = (turnFrames: Frame[]) =>
  turnFrames.flatMap((frame) => {
    const assistant = AssistantFrame.safeParse(frame);
    return assistant.success ? [assistant.data] : [];
  });
let turnIndex = 0;

// The CLI's `system/init`, written when a recorded Turn lacks one.
const initFrame = () => ({
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
  type: 'result',
  duration_ms: 0,
  duration_api_ms: 0,
  num_turns: 1,
  total_cost_usd: 0,
  usage: {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  },
  modelUsage: {},
  permission_denials: [],
  uuid: randomUUID(),
  session_id: sessionId,
});

// The CLI's `result`, written when a recorded Turn lacks one.
const resultFrame = (turn: Frame[]) => ({
  ...resultFields(),
  subtype: 'success',
  is_error: false,
  result:
    assistantFrames(turn)
      .flatMap((frame) => frame.message.content)
      .findLast((block) => block.text !== undefined)?.text ?? '',
  stop_reason: 'end_turn',
});

// Ends a prompt past the recording's last Turn as a failed Turn, which a crash never writes.
const noTurnFrame = (turnNumber: number) => ({
  ...resultFields(),
  subtype: 'error_during_execution',
  is_error: true,
  errors: [`The recording has no Turn ${turnNumber}.`],
  stop_reason: null,
});

// The answer to the SDK's `initialize`, with no commands, agents or models of its own.
const initializeResponse = {
  commands: [],
  agents: [],
  output_style: 'default',
  available_output_styles: ['default'],
  models: [],
  account: { subscriptionType: 'Claude Max', apiProvider: 'firstParty' },
  pending_permission_requests: [],
  pending_user_dialog_requests: [],
};

const isInit = (frame: Frame) =>
  frame.type === 'system' && frame.subtype === 'init';
const crashAfter = environment.exitMidTurn
  ? (frame: Frame) => !isInit(frame)
  : null;

// The frames of the running Turn held back until an interrupt arrives.
let heldFrames: Frame[] = [];

function replay(turn: Frame[]) {
  const pause = turn.indexOf(INTERRUPT_POINT);
  const now = pause === -1 ? turn : turn.slice(0, pause);
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
  if (subtype === undefined) return undefined;
  if (subtype !== 'initialize') return recordedAnswers.get(subtype);
  const response = recordedAnswers.get(subtype) ?? initializeResponse;
  // A CLI nobody signed in to still starts, with an account that has no subscription.
  if (environment.availability !== 'not_signed_in') return response;
  return { ...(response as Record<string, unknown>), account: {} };
}

serveJsonLines((line) => {
  const input = Input.parse(line);
  if (input.type === 'user') return playTurn();
  if (input.type !== 'control_request') return;
  const subtype = input.request?.subtype;
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
