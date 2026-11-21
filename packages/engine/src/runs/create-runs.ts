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

// Ends the Runs of a Checkout the Engine is removing; a Checkout with none, or an Engine without Runs, is left alone.
export const endCheckoutRuns = (
  database: Database,
  checkout: RunCheckout,
): Promise<void> =>
  enginesRuns.get(database)?.endCheckout(checkout) ?? Promise.resolve();
