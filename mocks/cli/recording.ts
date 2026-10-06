import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// What one recording holds. Its folder names the CLI version it was recorded from.
export type Recording = { version: string; payload: unknown };

// Validate the recording envelope here; vendor converters use their SDK's frame types (ADR-0015).
export function recordedFrames<Frame>(payload: unknown, pipe: string): Frame[] {
  const frames = Array.isArray(payload)
    ? payload
    : z.record(z.string(), z.unknown()).parse(payload)[pipe];
  return z.array(z.looseObject({})).parse(frames) as Frame[];
}

const envelope = (producer: string, version: string) =>
  z.object({
    producer: z.literal(producer),
    version: z.literal(version),
    recordedAt: z.union([z.iso.date(), z.iso.datetime()]).nullable(),
    payload: z.unknown(),
  });

// Reads `recordings/<version>/<name>.json` as tagged by its producer, or `.jsonl` as raw frames.
export function readRecording(file: string, producer: string): Recording {
  const version = path.basename(path.dirname(file));
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.jsonl')) {
    const payload = text
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    return { version, payload };
  }
  const tagged = envelope(producer, version).safeParse(JSON.parse(text));
  if (!tagged.success) {
    const fields = tagged.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid recording ${file}: ${fields.join('; ')}`, {
      cause: tagged.error,
    });
  }
  return { version, payload: tagged.data.payload };
}

const RECORDING_FILE = /\.jsonl?$/;

// The one version folder in `recordings/`; new recordings replace the old version rather than join it.
export function recordingVersion(recordings: string): string {
  const versions = readdirSync(recordings, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const [version] = versions;
  if (version === undefined || versions.length > 1)
    throw new Error(
      `${recordings} must hold one version folder, not ${versions.length}.`,
    );
  return version;
}

// Every recording file in `recordings/<version>/`.
export function recordingFiles(recordings: string): string[] {
  const folder = path.join(recordings, recordingVersion(recordings));
  return readdirSync(folder)
    .filter((name) => RECORDING_FILE.test(name))
    .map((name) => path.join(folder, name));
}

// The file of the recording called `name` in `recordings/<version>/`.
export function findRecording(recordings: string, name: string): string {
  const file = recordingFiles(recordings).find(
    (candidate) => path.parse(candidate).name === name,
  );
  if (file === undefined)
    throw new Error(`No recording named ${name} in ${recordings}.`);
  return file;
}

// Splits recorded frames into Turns, each ending at the frame that ends a Turn.
export function splitTurns<Frame>(
  frames: Frame[],
  endsTurn: (frame: Frame) => boolean,
): Frame[][] {
  const turns: Frame[][] = [];
  let turn: Frame[] = [];
  for (const frame of frames) {
    turn.push(frame);
    if (endsTurn(frame)) {
      turns.push(turn);
      turn = [];
    }
  }
  if (turn.length > 0) turns.push(turn);
  return turns;
}
