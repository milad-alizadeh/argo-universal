import { chmod, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { findRecording } from './recording.ts';

export type MockCliOptions = {
  // The recording's file name without its extension, such as `task-plan`.
  recording: string;
  // Exit after the first recorded frame of a Turn, as a crashed Agent does.
  exitMidTurn?: boolean;
};

const RECORDING_ENV = 'MOCK_CLI_RECORDING';
const EXIT_MID_TURN_ENV = 'MOCK_CLI_EXIT_MID_TURN';

const MockCliEnvironment = z.object({
  [RECORDING_ENV]: z.string().min(1),
  [EXIT_MID_TURN_ENV]: z.enum(['0', '1']),
});

const quote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

// Writes an executable `name` that runs `script` under this node, replaying a recording beside it.
export async function writeMockCliShim({
  directory,
  name,
  script,
  recording,
  exitMidTurn = false,
}: MockCliOptions & { directory: string; name: string; script: string }) {
  const recordingFile = findRecording(
    path.join(path.dirname(script), 'recordings'),
    recording,
  );
  const executable = path.join(directory, name);
  await writeFile(
    executable,
    [
      '#!/bin/sh',
      `export ${RECORDING_ENV}=${quote(recordingFile)}`,
      `export ${EXIT_MID_TURN_ENV}=${exitMidTurn ? '1' : '0'}`,
      `exec ${quote(process.execPath)} --no-warnings ${quote(script)} "$@"`,
      '',
    ].join('\n'),
  );
  await chmod(executable, 0o755);
  return executable;
}

// The recording and crash switch that the shim hands the mock CLI.
export function readMockCliEnvironment() {
  const environment = MockCliEnvironment.parse(process.env);
  return {
    recordingFile: environment[RECORDING_ENV],
    exitMidTurn: environment[EXIT_MID_TURN_ENV] === '1',
  };
}

// Writes one JSON message per line, as both Agent protocols do on stdout.
export const send = (message: unknown) =>
  process.stdout.write(`${JSON.stringify(message)}\n`);

// Reads one JSON message per stdin line, and exits when the client closes stdin.
export function serveJsonLines(handle: (message: unknown) => void) {
  createInterface({ input: process.stdin })
    .on('line', (line) => handle(JSON.parse(line)))
    .on('close', () => process.exit(0));
}

export function exitMidTurn(): never {
  process.stderr.write('Mock CLI exited mid-Turn.\n');
  process.exit(1);
}
