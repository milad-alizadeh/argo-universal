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

const SCENARIO_VARIABLE = 'MOCK_CLI_SCENARIO';

// Every test knob of a mock CLI, serialised into one variable. Names say what the mock does, never which vendor.
const MockCliScenario = z.strictObject({
  processFile: z.string().nullable().default(null),
  blockInitialize: z.boolean().default(false),
  malformedLine: z.boolean().default(false),
  concurrentQuestions: z.boolean().default(false),
  otherThreadRequest: z.boolean().default(false),
  blockTurnStart: z.boolean().default(false),
  turnResponseAfterNextStart: z.boolean().default(false),
  requestBeforeStartResponse: z.boolean().default(false),
  completionBeforeResponse: z.boolean().default(false),
  interruptError: z
    .enum(['none', 'beforeCompletion', 'afterCompletion'])
    .default('none'),
  notificationsFirst: z.boolean().default(false),
  account: z.enum(['subscription', 'apiKey']).default('subscription'),
  transcriptFile: z.string().nullable().default(null),
  requestAnswersFile: z.string().nullable().default(null),
});
export type MockCliScenario = z.output<typeof MockCliScenario>;
export type MockCliScenarioInput = z.input<typeof MockCliScenario>;

// Parses the scenario, so a bad field fails where a test writes it, and returns the variable that carries it.
export function mockCliScenarioEnvironment(scenario: MockCliScenarioInput): {
  MOCK_CLI_SCENARIO: string;
} {
  return {
    [SCENARIO_VARIABLE]: JSON.stringify(MockCliScenario.parse(scenario)),
  };
}

const MockCliEnvironment = z.object({
  [SCENARIO_VARIABLE]: z.string().optional(),
  [AVAILABILITY_VARIABLE]: z
    .enum(['available', 'not_signed_in'])
    .default('available'),
  [RECORDING_VARIABLE]: z.string().min(1),
  [EXIT_MID_TURN_VARIABLE]: z.enum(['0', '1']),
});

const quote = (text: string): string => `'${text.replaceAll("'", `'\\''`)}'`;

// Writes an executable `name` that runs `script` under this node, replaying a recording beside it.
export async function writeMockCliShim({
  directory,
  name,
  script,
  recording,
  exitMidTurn = false,
  availability = 'available',
}: MockCliOptions & {
  directory: string;
  name: string;
  script: string;
}): Promise<string> {
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

// The only reader of MOCK_CLI_ settings: the shim's variables and the test scenario.
export function readMockCliEnvironment(): {
  availability: 'available' | 'not_signed_in';
  recordingFile: string;
  exitMidTurn: boolean;
  scenario: MockCliScenario;
} {
  const environment = MockCliEnvironment.parse(process.env);
  return {
    availability: environment[AVAILABILITY_VARIABLE],
    recordingFile: environment[RECORDING_VARIABLE],
    exitMidTurn: environment[EXIT_MID_TURN_VARIABLE] === '1',
    scenario: MockCliScenario.parse(
      JSON.parse(environment[SCENARIO_VARIABLE] ?? '{}'),
    ),
  };
}

// Writes one JSON message per line, as both Agent protocols do on stdout.
export const send = (message: unknown): boolean =>
  process.stdout.write(`${JSON.stringify(message)}\n`);

let crashed = false;

// Reads one JSON message per stdin line, and exits when the caller closes stdin.
export function serveJsonLines<Frame>(handle: (message: Frame) => void): void {
  const { processFile } = readMockCliEnvironment().scenario;
  if (processFile) writeFileSync(processFile, String(process.pid));
  createInterface({ input: process.stdin })
    .on('line', (line): void => {
      if (!crashed) handle(z.looseObject({}).parse(JSON.parse(line)) as Frame);
    })
    .on('close', (): void => {
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
      process.stdout.write('', (): never => process.exit(1));
      return false;
    }
  }
  return true;
}

// The transcript marker belongs to the mock harness, not either vendor protocol.
export function readMockTranscript(file: string): { vendorSessionId: string } {
  return z
    .object({ vendorSessionId: z.string() })
    .parse(JSON.parse(readFileSync(file, 'utf8')));
}
