import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { TRPCError } from '@trpc/server';
import { noFollow, stillAtPath } from './run-checkout-file';
import {
  readRunConfigurations,
  runConfigurationsFile,
  type RunConfiguration,
  type RunConfigurations,
} from './run-configurations';

const missing = (error: Error): boolean =>
  'code' in error && error.code === 'ENOENT';

async function readCheckoutConfiguration(
  checkoutPath: string,
): Promise<string> {
  const root = await realpath(checkoutPath);
  const path = await realpath(join(root, runConfigurationsFile));
  const local = relative(root, path);

  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Run Configurations must be inside the Checkout.',
    });

  await using file = await open(path, constants.O_RDONLY | noFollow);

  if (!(await stillAtPath(path, await file.stat())))
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${runConfigurationsFile} must be a regular file in the Checkout.`,
    });

  return await file.readFile('utf8');
}

// The Checkout's Run Configurations; none when it has no file, and a refusal that says where a bad file is wrong.
export async function readRunFile(
  checkoutPath: string,
): Promise<RunConfigurations> {
  let source: string;

  try {
    source = await readCheckoutConfiguration(checkoutPath);
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
  return requireConfiguration(await readRunFile(checkoutPath), name);
}

export function requireConfiguration(
  { configurations }: RunConfigurations,
  name: string,
): RunConfiguration {
  const found = configurations.find((candidate) => candidate.name === name);

  if (found) return found;

  const names = configurations.map((candidate) => candidate.name).join(', ');

  throw new TRPCError({
    code: 'NOT_FOUND',
    message: `No Run Configuration named "${name}" in ${runConfigurationsFile}. It has: ${names || 'none'}.`,
  });
}
