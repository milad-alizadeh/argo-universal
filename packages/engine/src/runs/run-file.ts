import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TRPCError } from '@trpc/server';
import {
  readRunConfigurations,
  runConfigurationsFile,
  type RunConfiguration,
  type RunConfigurations,
} from './run-configurations';

const missing = (error: Error): boolean =>
  'code' in error && error.code === 'ENOENT';

// The Checkout's Run Configurations; none when it has no file, and a refusal that says where a bad file is wrong.
export async function readRunFile(
  checkoutPath: string,
): Promise<RunConfigurations> {
  let source: string;

  try {
    source = await readFile(join(checkoutPath, runConfigurationsFile), 'utf8');
  } catch (error) {
    if (error instanceof Error && missing(error))
      return { configurations: [], groups: {} };
    throw error;
  }

  const read = readRunConfigurations(source);

  if (!read.ok)
    throw new TRPCError({ code: 'BAD_REQUEST', message: read.error.message });

  return read;
}

export async function requireRunConfiguration(
  checkoutPath: string,
  name: string,
): Promise<RunConfiguration> {
  const { configurations } = await readRunFile(checkoutPath);
  const found = configurations.find((candidate) => candidate.name === name);

  if (found) return found;

  const names = configurations.map((candidate) => candidate.name).join(', ');

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `No Run Configuration named "${name}" in ${runConfigurationsFile}. It has: ${names || 'none'}.`,
  });
}
