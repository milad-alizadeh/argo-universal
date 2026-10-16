import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ShellChild } from './process';
import type { ShellCommandInput } from './shell-command';

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
