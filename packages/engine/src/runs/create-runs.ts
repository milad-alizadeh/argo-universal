import { randomUUID } from 'node:crypto';
import type { Database } from '@repo/db';
import { type RunCheckout, Runs, type RunsInput } from './runs';

// The Runs of each Engine, found by its database, so a Session archive reaches them without carrying them through every Session.
const enginesRuns = new WeakMap<Database, Runs>();

export const createRuns = (
  input: Omit<RunsInput, 'createId'> & Partial<Pick<RunsInput, 'createId'>>,
): Runs => {
  const runs = new Runs({ createId: randomUUID, ...input });
  enginesRuns.set(input.database, runs);

  return runs;
};

// Blocks new Runs while the Checkout's existing Runs end and Git removes it.
export const removeCheckoutWithRuns = (
  database: Database,
  checkout: RunCheckout,
  remove: () => Promise<void>,
): Promise<void> =>
  enginesRuns.get(database)?.removeCheckout(checkout, remove) ?? remove();
