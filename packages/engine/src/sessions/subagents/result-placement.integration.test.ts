import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import {
  associate,
  onTranscript,
  played,
  sessionMessage,
  sessionMessageChunk,
  subagentRowFacts,
  text,
} from '#mocks/subagent-steps';

const childOutput = (value: string): ScriptedStep =>
  onTranscript(
    {
      sessionUpdate: 'agent_message_chunk',
      messageId: value,
      content: text(value),
    },
    'child',
  );

const fromChild = { senderSessionId: 'child', recipientSessionId: 'parent' };

// Parent and child positions are separate, so a result records where in the child's Feed it arrived (#1981).
it("places a result at the child's Feed position when it first arrives, through later revisions", async () => {
  const subagents = await played([
    associate('child'),
    childOutput('Reading'),
    childOutput('Testing'),
    sessionMessage('reply', { ...fromChild, content: [text('Done')] }),
    childOutput('Checking'),
    sessionMessageChunk('reply', ' and checked'),
    sessionMessage('reply', { content: [text('Revised')] }),
  ]);

  expect(subagentRowFacts(subagents)).toEqual([
    { action: 'spawn' },
    { result: [text('Revised')], childPosition: 2 },
  ]);
});
