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

const environment = readMockCliEnvironment();
const recording = readRecording(environment.recordingFile, PRODUCER);

if (process.argv.includes('--version')) {
  process.stdout.write(`${recording.version} (Claude Code)\n`);
  process.exit(0);
}

const frames = z.array(Frame).parse(recording.payload);
const turns = splitTurns(frames, (frame) => frame.type === 'result');
const sessionId =
  frames.find((frame) => frame.session_id)?.session_id ?? randomUUID();
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

// The CLI's `result`, written when a recorded Turn lacks one.
const resultFrame = (turn: Frame[]) => ({
  type: 'result',
  subtype: 'success',
  is_error: false,
  duration_ms: 0,
  duration_api_ms: 0,
  num_turns: 1,
  result:
    assistantFrames(turn)
      .flatMap((frame) => frame.message.content)
      .findLast((block) => block.text !== undefined)?.text ?? '',
  stop_reason: 'end_turn',
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

// The answer to the SDK's `initialize`, with no commands, agents or models of its own.
const initializeResponse = {
  commands: [],
  agents: [],
  output_style: 'default',
  available_output_styles: ['default'],
  models: [],
  account: {},
  pending_permission_requests: [],
  pending_user_dialog_requests: [],
};

const isInit = (frame: Frame) =>
  frame.type === 'system' && frame.subtype === 'init';

function playTurn() {
  const turn = turns[turnIndex++];
  if (turn === undefined) {
    process.stderr.write(`The recording has no Turn ${turnIndex}.\n`);
    process.exit(1);
  }
  if (!turn.some(isInit)) send(initFrame());
  const crashAfter = environment.exitMidTurn
    ? (frame: Frame) => !isInit(frame)
    : null;
  if (replayTurn(turn, crashAfter) && turn.at(-1)?.type !== 'result')
    send(resultFrame(turn));
}

serveJsonLines((line) => {
  const input = Input.parse(line);
  if (input.type === 'user') return playTurn();
  if (input.type !== 'control_request') return;
  send({
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: input.request_id,
      response:
        input.request?.subtype === 'initialize' ? initializeResponse : {},
    },
  });
});
