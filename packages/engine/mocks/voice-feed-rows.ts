import type { SessionUpdate } from '@repo/contracts';
import { expect } from 'vitest';
import { startVoiceWork, type VoiceWork } from './voice-work';

const shown = new Set([
  'person_transcript',
  'voice_transcript',
  'agent_message',
]);

const textOf = (row: SessionUpdate): string =>
  'content' in row && Array.isArray(row.content)
    ? row.content
        .map((block: { type: string; text?: string }) =>
          block.type === 'text' ? (block.text ?? '') : '',
        )
        .join('')
    : '';

// The rows the Feed draws as messages, after the Session's opening Turn: who said them and what.
export async function messageRows(work: VoiceWork): Promise<string[]> {
  const rows = (await work.feed()).filter((row) =>
    shown.has(row.sessionUpdate),
  );

  return rows
    .map((row) => `${row.sessionUpdate}: ${textOf(row)}`)
    .filter((row) => !row.startsWith('agent_message: Hello'));
}

// Waits until the Feed draws `count` message rows.
export const rowsDrawn = async (
  work: VoiceWork,
  count: number,
): Promise<void> => {
  await expect.poll(async () => (await messageRows(work)).length).toBe(count);
};

const handedOver = (work: VoiceWork, text: string): boolean =>
  work.provider.call.sent.some(
    (message) => message.kind === 'tell' && message.text === text,
  );

// A started call whose Agent answers `prompt` with `answer` as its result.
export async function callAnswering(
  prompt: string,
  answer: string,
): Promise<VoiceWork> {
  const work = await startVoiceWork([
    { prompt, messages: [`[COMPLETE] ${answer}`] },
  ]);

  await work.start();

  return work;
}

// The person's request, sent as a Prompt, until the voice is handed the Agent's answer.
export async function untilHandedOver(
  work: VoiceWork,
  request: string,
  answer: string,
): Promise<void> {
  work.provider.call.requestWork('r1', request);
  await expect.poll(work.turnEnds).toHaveLength(2);
  await expect.poll(() => handedOver(work, answer)).toBe(true);
}
