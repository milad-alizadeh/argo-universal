import { randomUUID } from 'node:crypto';
import { Runs, type RunsInput } from './runs';

export const createRuns = (
  input: Omit<RunsInput, 'createId'> & Partial<Pick<RunsInput, 'createId'>>,
): Runs => new Runs({ createId: randomUUID, ...input });
