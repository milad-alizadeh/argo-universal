import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import type { FakeVoiceProvider } from '../src/voice/fake-provider';
import type { startAcpEngine } from './acp-engine';

export type Scenario = NonNullable<Parameters<typeof startAcpEngine>[0]>;

// What the mock Agent does when a Prompt containing `prompt` arrives: says each message, one row apiece, then ends.
export type VoiceAgentReply = {
  prompt: string;
  messages?: readonly string[];
  // A Tool call whose output the Agent produces before its messages; the voice must never hear it.
  toolOutput?: string;
  // Holds the Turn open, after its messages, until the test releases it.
  holdUntil?: Promise<void>;
  // Ends the Turn with an error after its messages.
  fails?: string;
};

const messageSteps = (messages: readonly string[]): ScriptedStep[] =>
  messages.flatMap((text, index): ScriptedStep[] => [
    {
      type: 'update',
      update: {
        sessionUpdate: 'agent_message_chunk',
        messageId: `message-${index}-${text.length}`,
        content: { type: 'text', text },
      },
    },
    { type: 'yield' },
  ]);

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

const stepsOf = (reply: VoiceAgentReply): ScriptedStep[] => [
  ...toolSteps(reply.toolOutput),
  ...messageSteps(reply.messages ?? []),
  ...endingSteps(reply),
];

export const steeringScenario = (
  steered: PromiseWithResolvers<unknown>,
): Partial<Scenario> => ({
  initialize: {
    protocolVersion: 1,
    agentInfo: { name: '@agentclientprotocol/codex-acp', version: '2.4.0' },
    _meta: { steering: { supported: true } },
  },
  steering: { received: steered, result: { outcome: 'injected' } },
});

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
