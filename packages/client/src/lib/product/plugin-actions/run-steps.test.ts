import { expect, it } from 'vitest';
import { runSteps } from './run-steps';

it('runs every step in order', async () => {
  const ran: string[] = [];

  await runSteps(['copy', 'open'], async (step) => {
    ran.push(step);
  });

  expect(ran).toEqual(['copy', 'open']);
});

it('runs the next step after one fails, and then reports the failure', async () => {
  const ran: string[] = [];

  const running = runSteps(['copy', 'open'], async (step) => {
    if (step === 'copy') throw new Error('Not allowed');

    ran.push(step);
  });

  await expect(running).rejects.toThrow('Not allowed');
  expect(ran).toEqual(['open']);
});
