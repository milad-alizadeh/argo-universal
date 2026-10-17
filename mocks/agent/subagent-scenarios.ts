import type { SessionUpdate } from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration.ts';
import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

export const subagentSessionId = 'subagent-review';

// The parent's ACP id, so the child can address its explicit reply to it.
const subagentParentSessionId = 'subagent-parent';

const sessionIds = [subagentParentSessionId];

const state = (
  value: 'running' | 'idle' | 'requires_action',
): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: subagentSessionId,
    title: 'Review the change',
    state: { state: value },
  } satisfies SessionUpdate,
});

const message = (text: string): Extract<ScriptedStep, { type: 'update' }> => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text },
  },
});

const childMessage = (text: string): ScriptedStep => ({
  ...message(text),
  sessionId: subagentSessionId,
});

// The parent transcript's outgoing view of a delegation (ACP subagents RFD).
const delegation = (messageId: string, text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'session_message',
    messageId,
    senderSessionId: subagentParentSessionId,
    recipientSessionId: subagentSessionId,
    content: [{ type: 'text', text }],
  },
});

// The child transcript's incoming view of the same delegation, with its own message id.
const received = (messageId: string, text: string): ScriptedStep => ({
  type: 'update',
  sessionId: subagentSessionId,
  update: {
    sessionUpdate: 'session_message',
    messageId: `${messageId}-received`,
    senderSessionId: subagentParentSessionId,
    recipientSessionId: subagentSessionId,
    content: [{ type: 'text', text }],
  },
});

// The child is announced before any message names it.
const delegate = (messageId: string, text: string): ScriptedStep[] => [
  state('running'),
  delegation(messageId, text),
  received(messageId, text),
];

// The parent transcript's view of the child's explicit reply (ACP subagents RFD).
const reply = (text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'session_message',
    messageId: 'review-reply',
    senderSessionId: subagentSessionId,
    recipientSessionId: subagentParentSessionId,
    content: [{ type: 'text', text }],
  },
});

export const foregroundSubagent: ScriptedScenario = {
  sessionIds,
  steps: [
    ...delegate('review', 'Review the change.'),
    childMessage('I am reviewing the change.'),
    state('requires_action'),
    state('running'),
    childMessage('The review is complete.'),
    reply('The change looks correct.'),
    state('idle'),
    message('The Subagent finished its review.'),
  ],
};

/*
 * The parent completes its Turn while the Subagent still runs.
 * Only the outgoing view is sent, so the child Feed starts with its own updates.
 */
export const backgroundSubagent: ScriptedScenario = {
  sessionIds,
  steps: [
    state('running'),
    delegation('review', 'Review the change in the background.'),
    childMessage('The background review has started.'),
    message('The Subagent is reviewing in the background.'),
  ],
};

export const subagentMoreWork: ScriptedScenario = {
  sessionIds,
  steps: [],
  responses: {
    'session/prompt': [
      { steps: foregroundSubagent.steps },
      {
        steps: [
          ...delegate('follow-up', 'Review the follow-up change.'),
          childMessage('The follow-up review is complete.'),
          state('idle'),
          message('The same Subagent finished the follow-up.'),
        ],
      },
    ],
  },
};

export const subagentScenarios = {
  'subagent-foreground': {
    configOptions: acpConfiguration,
    ...foregroundSubagent,
  },
  'subagent-background': {
    configOptions: acpConfiguration,
    ...backgroundSubagent,
  },
  'subagent-more-work': {
    configOptions: acpConfiguration,
    ...subagentMoreWork,
  },
} satisfies Record<string, ScriptedScenario>;
