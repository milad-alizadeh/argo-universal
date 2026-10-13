import { expect, it } from 'vitest';
import { startSessionJourney, newSession } from '#mocks/session-journey';

it('removes a closed Session and resumes its stored Agent identity on the next prompt', async (): Promise<void> => {
  const { caller, openings, resumes, prompts } = await startSessionJourney();
  const { sessionId } = await caller.session.new(newSession);
  const opening = openings[0];
  if (!opening) throw new Error('No opened Agent Session');
  await expect.poll(() => prompts).toHaveLength(1);
  await caller.session.close({ sessionId });
  await caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Continue' }],
  });
  expect(openings).toHaveLength(1);
  expect(resumes).toEqual([
    { sessionId: 'owned-1', cwd: opening.cwd, mcpServers: [] },
  ]);
  await expect
    .poll(() => prompts)
    .toEqual([
      { sessionId: 'owned-1', prompt: newSession.prompt },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Continue' }] },
    ]);
});
