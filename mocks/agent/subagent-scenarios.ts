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

// The parent transcript's view of its outgoing message, which sets the Subagent's prompt.
const delegation = (messageId: string, text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'session_message',
    messageId,
    recipientSessionId: subagentSessionId,
    content: [{ type: 'text', text }],
  },
});

// The child transcript's own view of the same message, with its own message id (ACP subagents RFD).
const incoming = (messageId: string, text: string): ScriptedStep => ({
  type: 'update',
  sessionId: subagentSessionId,
  update: {
    sessionUpdate: 'session_message',
    messageId: `${messageId}-incoming`,
    senderSessionId: subagentParentSessionId,
    recipientSessionId: subagentSessionId,
    content: [{ type: 'text', text }],
  },
});

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

const foregroundSteps = (view: ScriptedStep[]): ScriptedStep[] => [
  delegation('review', 'Review the change.'),
  state('running'),
  ...view,
  childMessage('I am reviewing the change.'),
  state('requires_action'),
  state('running'),
  childMessage('The review is complete.'),
  reply('The change looks correct.'),
  state('idle'),
  message('The Subagent finished its review.'),
];

export const foregroundSubagent: ScriptedScenario = {
  sessionIds,
  steps: foregroundSteps([incoming('review', 'Review the change.')]),
};

// The Agent reports no incoming view, so the child's Feed starts with its own updates.
export const outgoingOnlySubagent: ScriptedScenario = {
  sessionIds,
  steps: foregroundSteps([]),
};

// The parent completes its Turn while the Subagent still runs.
export const backgroundSubagent: ScriptedScenario = {
  sessionIds,
  steps: [
    delegation('review', 'Review the change in the background.'),
    state('running'),
    incoming('review', 'Review the change in the background.'),
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
          delegation('follow-up', 'Review the follow-up change.'),
          state('running'),
          incoming('follow-up', 'Review the follow-up change.'),
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
  'subagent-outgoing-only': {
    configOptions: acpConfiguration,
    ...outgoingOnlySubagent,
  },
  'subagent-more-work': {
    configOptions: acpConfiguration,
    ...subagentMoreWork,
  },
} satisfies Record<string, ScriptedScenario>;
