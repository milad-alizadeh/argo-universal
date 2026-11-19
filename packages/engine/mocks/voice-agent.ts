import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import type { FakeVoiceProvider } from '../src/voice/fake-provider';
import type { startAcpEngine } from './acp-engine';

export type Scenario = NonNullable<Parameters<typeof startAcpEngine>[0]>;

// What the mock Agent does when a Prompt containing `prompt` arrives: says each message, one row apiece, then ends.
export type VoiceAgentReply = {
  prompt: string;
  messages?: readonly string[];
  // Streams each message in chunks of this many characters; whole in one chunk without it.
  chunkSize?: number;
  // A Tool call whose output the Agent produces before its messages; the voice must never hear it.
  toolOutput?: string;
  // Holds the Turn open, after its messages, until the test releases it.
  holdUntil?: Promise<void>;
  // Ends the Turn with an error after its messages.
  fails?: string;
  // Asks permission for a Tool call with this title before its messages, and waits for the answer.
  asksPermission?: string;
};

// The text in pieces of `size` characters; whole without a size.
const piecesOf = (text: string, size: number | undefined): string[] =>
  size === undefined
    ? [text]
    : Array.from({ length: Math.ceil(text.length / size) }, (_, index) =>
        text.slice(index * size, (index + 1) * size),
      );

const chunkSteps = (messageId: string, text: string): ScriptedStep[] => [
  {
    type: 'update',
    update: {
      sessionUpdate: 'agent_message_chunk',
      messageId,
      content: { type: 'text', text },
    },
  },
  { type: 'yield' },
];

const messageSteps = (
  messages: readonly string[],
  chunkSize: number | undefined,
): ScriptedStep[] =>
  messages.flatMap((text, index) =>
    piecesOf(text, chunkSize).flatMap((piece) =>
      chunkSteps(`message-${index}-${text.length}`, piece),
    ),
  );

const toolCall = (output: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: 'tool-1',
    title: 'Run tests',
    kind: 'execute',
    status: 'completed',
    content: [{ type: 'content', content: { type: 'text', text: output } }],
  },
});

const toolSteps = (output: string | undefined): ScriptedStep[] =>
  output === undefined ? [] : [toolCall(output), { type: 'yield' }];

const endingSteps = (reply: VoiceAgentReply): ScriptedStep[] => {
  if (reply.holdUntil) return [{ type: 'gate', waitFor: reply.holdUntil }];

  return reply.fails ? [{ type: 'fail', message: reply.fails }] : [];
};

const askedToolCall = (title: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'tool_call',
    toolCallId: 'asked',
    title,
    kind: 'execute',
    status: 'pending',
  },
});

const permissionRequest = (title: string): ScriptedStep => ({
  type: 'permission',
  request: {
    toolCall: { toolCallId: 'asked', title },
    options: [
      { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
      { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
    ],
  },
});

const permissionSteps = (title: string | undefined): ScriptedStep[] =>
  title === undefined ? [] : [askedToolCall(title), permissionRequest(title)];

const stepsOf = (reply: VoiceAgentReply): ScriptedStep[] => [
  ...permissionSteps(reply.asksPermission),
  ...toolSteps(reply.toolOutput),
  ...messageSteps(reply.messages ?? [], reply.chunkSize),
  ...endingSteps(reply),
];

const steeringAgent = (
  steered: PromiseWithResolvers<unknown>,
  outcome: 'injected' | 'failed',
): Partial<Scenario> => ({
  initialize: {
    protocolVersion: 1,
    agentInfo: { name: '@agentclientprotocol/codex-acp', version: '2.4.0' },
    _meta: { steering: { supported: true } },
  },
  steering: { received: steered, result: { outcome } },
});

// An Agent that takes each steer, refuses each one, or does not support steering at all.
export const steeringScenario = (
  steered: PromiseWithResolvers<unknown>,
  steering: boolean | 'refused' | undefined,
): Partial<Scenario> => {
  if (!steering) return {};

  return steeringAgent(steered, steering === 'refused' ? 'failed' : 'injected');
};

type Recording = { prompts: PromptRequest[]; provider: FakeVoiceProvider };

type PromptResponse = {
  prompt: string;
  requests: PromptRequest[];
  steps: ScriptedStep[];
};

const responseOf = (
  reply: VoiceAgentReply,
  prompts: PromptRequest[],
): PromptResponse => ({
  prompt: reply.prompt,
  requests: prompts,
  steps: stepsOf(reply),
});

// A mock Agent that answers the Prompts the replies name, and records every Prompt it receives.
export const scenarioOf = (
  replies: readonly VoiceAgentReply[],
  { prompts, provider }: Recording,
): Scenario => ({
  steps: [],
  voiceProvider: provider,
  responses: {
    'session/prompt': [
      ...replies.map((reply) => responseOf(reply, prompts)),
      { requests: prompts },
    ],
  },
});
