import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import {
  startConversationWork,
  type ConversationWork,
} from '#mocks/conversation-work';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import type { FakeVoiceMessage } from './fake-provider';

const chunk = (text: string): ScriptedStep => ({
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    messageId: 'hand-back-reply',
    content: { type: 'text', text },
  },
});

// The Agent says something with no Turn running, as a reply to a background Agent's hand-back does, in pieces.
async function saysOutsideATurn(
  work: ConversationWork,
  pieces: readonly string[],
): Promise<void> {
  const steps = pieces.flatMap((piece): ScriptedStep[] => [
    chunk(piece),
    { type: 'yield' },
  ]);

  await requireScriptedProcessAt(work.host.agent.processes).play(
    steps,
    'owned-1',
  );
}

const told = (work: ConversationWork, text: string) => (): FakeVoiceMessage[] =>
  work.provider.call.sent.filter(
    (say) => say.kind === 'tell' && say.text === text,
  );

async function callingWork(): Promise<ConversationWork> {
  const work = await startConversationWork([]);

  await work.start();

  return work;
}

describe(
  'an Agent message outside any Turn during a call (#2506)',
  { timeout: 20000 },
  () => {
    it('is kept as background when unmarked, as progress is, and read whole once it stops growing', async () => {
      const work = await callingWork();

      await saysOutsideATurn(work, ['The research is', ' done: three options']);

      await expect
        .poll(told(work, 'The research is done: three options'), {
          timeout: 5000,
        })
        .toEqual([
          {
            kind: 'tell',
            text: 'The research is done: three options',
            delivery: 'background',
          },
        ]);
      expect(told(work, 'The research is')()).toEqual([]);
    });

    it('is spoken whole when marked as a result', async () => {
      const work = await callingWork();

      await saysOutsideATurn(work, ['[COMPLETE] Hue', ' works']);

      await expect
        .poll(told(work, 'Hue works'), { timeout: 5000 })
        .toEqual([{ kind: 'tell', text: 'Hue works', delivery: 'speak' }]);
    });

    it('stays quiet when marked as silent analysis', async () => {
      const work = await callingWork();

      await saysOutsideATurn(work, ['[ANALYSIS] Checked', ' three bridges']);
      // Past the 800ms a growing message waits before the voice hears it.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      expect(
        work.provider.call.sent.filter(({ text }) => text.includes('bridges')),
      ).toEqual([]);
    });
  },
);
