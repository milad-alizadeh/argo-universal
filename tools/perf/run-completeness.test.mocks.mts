import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const runSchema = z.object({
  run: z.object({
    status: z.enum(['complete', 'partial']),
    planned: z.array(z.string()),
    measured: z.array(z.string()),
    notApplicable: z.array(z.string()),
    missing: z.array(z.string()),
  }),
});

export type WrittenRun = z.infer<typeof runSchema>['run'];

// The `run` block a report left on disk, parsed rather than cast.
export const writtenRun = async (
  directory: string,
  file: string,
): Promise<WrittenRun> =>
  runSchema.parse(
    JSON.parse(await readFile(path.join(directory, file), 'utf8')),
  ).run;
