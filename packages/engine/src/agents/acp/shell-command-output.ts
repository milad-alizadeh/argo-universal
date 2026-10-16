import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ShellChild } from './process';
import type { ShellCommandInput } from './shell-command';

const outputDrainLimitMs = 1000;

const captureSink = (output: ShellCommandInput['output']): Writable =>
  new Writable({
    write: (chunk: Buffer, _encoding, callback): void => {
      Promise.resolve()
        .then(() => output(chunk))
        .then(() => callback(), callback);
    },
  });

// Stored as produced; stdout and stderr may interleave inside a character.
export const captureShellCommandOutput = async (
  child: ShellChild,
  output: ShellCommandInput['output'],
): Promise<void> => {
  await Promise.all([
    pipeline(child.stdout, captureSink(output)),
    pipeline(child.stderr, captureSink(output)),
  ]);
};

// Once its group is gone, a descendant that left the group cannot hold the output open.
export const endShellCommandOutput = async (
  child: ShellChild,
  output: Promise<void>,
): Promise<void> => {
  const limit = Promise.withResolvers<void>();
  const timer = setTimeout(limit.resolve, outputDrainLimitMs);

  try {
    await Promise.race([output, limit.promise]);
  } finally {
    clearTimeout(timer);
    child.stdout.destroy();
    child.stderr.destroy();
  }
};
