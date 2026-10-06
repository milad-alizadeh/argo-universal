import { readFileSync, writeFileSync } from 'node:fs';
import { chmod, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { z } from 'zod';
import { findRecording } from './recording.ts';

export type MockCliOptions = {
  // The recording's file name without its extension, such as `task-plan`.
  recording: string;
  // Exit early in a Turn, as a crashed Agent does.
  exitMidTurn?: boolean;
  availability?: 'available' | 'not_installed' | 'not_signed_in';
};

const RECORDING_VARIABLE = 'MOCK_CLI_RECORDING';
const EXIT_MID_TURN_VARIABLE = 'MOCK_CLI_EXIT_MID_TURN';
const AVAILABILITY_VARIABLE = 'MOCK_CLI_AVAILABILITY';

const MockCliEnvironment = z.object({
  [AVAILABILITY_VARIABLE]: z
    .enum(['available', 'not_signed_in'])
    .default('available'),
  [RECORDING_VARIABLE]: z.string().min(1),
  [EXIT_MID_TURN_VARIABLE]: z.enum(['0', '1']),
});

const quote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

// Writes an executable `name` that runs `script` under this node, replaying a recording beside it.
export async function writeMockCliShim({
  directory,
  name,
  script,
  recording,
  exitMidTurn = false,
  availability = 'available',
}: MockCliOptions & { directory: string; name: string; script: string }) {
  const executable = path.join(directory, name);
  if (availability === 'not_installed') {
    await rm(executable, { force: true });
    return executable;
  }
  const recordingFile = findRecording(
    path.join(path.dirname(script), 'recordings'),
    recording,
  );
  await writeFile(
    executable,
    [
      '#!/bin/sh',
      `export ${AVAILABILITY_VARIABLE}=${quote(availability)}`,
      `export ${RECORDING_VARIABLE}=${quote(recordingFile)}`,
      `export ${EXIT_MID_TURN_VARIABLE}=${exitMidTurn ? '1' : '0'}`,
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
    availability: environment[AVAILABILITY_VARIABLE],
    recordingFile: environment[RECORDING_VARIABLE],
    exitMidTurn: environment[EXIT_MID_TURN_VARIABLE] === '1',
  };
}

// Writes one JSON message per line, as both Agent protocols do on stdout.
export const send = (message: unknown) =>
  process.stdout.write(`${JSON.stringify(message)}\n`);

let crashed = false;

// Reads one JSON message per stdin line, and exits when the caller closes stdin.
export function serveJsonLines<Frame>(handle: (message: Frame) => void) {
  const processFile = process.env.MOCK_CLI_PROCESS_FILE;
  if (processFile) writeFileSync(processFile, String(process.pid));
  createInterface({ input: process.stdin })
    .on('line', (line) => {
      if (!crashed) handle(z.looseObject({}).parse(JSON.parse(line)) as Frame);
    })
    .on('close', () => {
      if (!crashed) process.exit(0);
    });
}

// Sends a recorded Turn, or with `crashAfter` exits with code 1 after the first frame it matches.
export function replayTurn<Frame>(
  frames: Frame[],
  crashAfter: ((frame: Frame) => boolean) | null,
): boolean {
  for (const frame of frames) {
    send(frame);
    if (crashAfter?.(frame)) {
      crashed = true;
      process.stderr.write('Mock CLI exited mid-Turn.\n');
      // Exits once stdout has flushed, since pipe writes are asynchronous on macOS.
      process.stdout.write('', () => process.exit(1));
      return false;
    }
  }
  return true;
}

// The transcript marker belongs to the mock harness, not either vendor protocol.
export function readMockTranscript(file: string) {
  return z
    .object({ vendorSessionId: z.string() })
    .parse(JSON.parse(readFileSync(file, 'utf8')));
}
