import type { ScriptedScenario, ScriptedStep } from './scripted-scenario.ts';

const parent = 'reports-parent';

const child = 'reports-child';

const other = 'reports-other';

const association = (id: string, title: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'subagent_update',
    sessionId: id,
    title,
    state: { state: 'idle', stopReason: 'end_turn' },
  },
});

const report = (id: string, text: string, sender = child): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'session_message',
    messageId: id,
    senderSessionId: sender,
    recipientSessionId: parent,
    content: [{ type: 'text', text }],
  },
});

const firstReports: ScriptedStep[] = [
  association(child, 'Report reviewer'),
  association(other, 'Other reviewer'),
  ...Array.from({ length: 181 }, (_, index) =>
    report(`report-${index}`, `Finding ${index}`),
  ),
  report('other-report', 'Other Agent finding', other),
];

export const subagentReports: ScriptedScenario = {
  sessionIds: [parent],
  steps: firstReports,
  responses: {
    'session/prompt': [
      { steps: firstReports },
      { steps: [report('report-180', 'Finding updated')] },
    ],
  },
};
