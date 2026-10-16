import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ShellChild } from './process';
import type { ShellCommandInput } from './shell-command';

const captureSink = (output: ShellCommandInput['output']): Writable =>
  new Writable({
    decodeStrings: false,
    write: (text: string, _encoding, callback): void => {
      Promise.resolve()
        .then(() => output(text))
        .then(() => callback(), callback);
    },
  });

export const captureShellCommandOutput = async (
  child: ShellChild,
  output: ShellCommandInput['output'],
): Promise<void> => {
  await Promise.all([
    pipeline(child.stdout.setEncoding('utf8'), captureSink(output)),
    pipeline(child.stderr.setEncoding('utf8'), captureSink(output)),
  ]);
};
