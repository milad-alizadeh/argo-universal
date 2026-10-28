import { scenarios } from '@repo/mocks/agent/scenarios';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import {
  onTranscript,
  played,
  sessionMessage,
  sessionMessageChunk,
  subagentRowFacts,
  text,
} from '#mocks/subagent-steps';

// The parent revises its delegation by patch and chunk, then the child ends its Turn.
const revisedDelegation: ScriptedStep[] = [
  sessionMessage('unrelated', {
    recipientSessionId: 'unassociated',
    content: [text('No parentage')],
  }),
  onTranscript({
    sessionUpdate: 'subagent_update',
    sessionId: 'review',
    state: { state: 'running' },
  }),
  sessionMessage('delegation', {
    senderSessionId: 'parent',
    recipientSessionId: 'review',
    content: [text('Original')],
  }),
  sessionMessage('delegation', { content: [text('Revised')] }),
  sessionMessage('delegation', { recipientSessionId: 'review' }),
  sessionMessageChunk('delegation', ' instruction'),
  onTranscript(
    { sessionUpdate: 'agent_message_chunk', content: text('Done') },
    'review',
  ),
  onTranscript({
    sessionUpdate: 'subagent_update',
    sessionId: 'review',
    state: { state: 'idle', stopReason: 'end_turn' },
  }),
];

const outgoingOnly = scenarios['subagent-outgoing-only'];

it.each([
  {
    claim: 'its patches and chunks',
    steps: revisedDelegation,
    parent: 'parent',
    child: 'review',
  },
  {
    claim: 'the Agent reports no incoming view',
    steps: outgoingOnly.steps,
    parent: 'subagent-parent',
    child: 'subagent-review',
  },
])(
  "keeps the parent's outgoing message out of the child Feed when $claim",
  async ({ steps, parent, child }) => {
    const subagents = await played(steps, parent);

    expect(subagents.rows(child).map((row) => row.sessionUpdate)).toEqual([
      'agent_message',
    ]);
  },
);

it("revises one parent prompt from patches and chunks of the parent's outgoing message", async () => {
  const subagents = await played(revisedDelegation);

  expect(
    subagentRowFacts(subagents).flatMap((row) =>
      row.action === 'message' ? [row.prompt] : [],
    ),
  ).toEqual([[text('Revised'), text(' instruction')]]);
});
