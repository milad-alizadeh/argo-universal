import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// What one recording holds. Its folder names the CLI version it was recorded from.
export type Recording = {
  version: string;
  recordedAt: string | null;
  payload: unknown;
};

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
    return { version, recordedAt: null, payload };
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
  const { recordedAt, payload } = tagged.data;
  return { version, recordedAt, payload };
}

// The file of the recording called `name` in `recordings/<version>/`, which holds one version.
export function findRecording(recordings: string, name: string): string {
  for (const version of readdirSync(recordings)) {
    for (const extension of ['.json', '.jsonl']) {
      const file = path.join(recordings, version, `${name}${extension}`);
      if (readdirSync(path.dirname(file)).includes(path.basename(file)))
        return file;
    }
  }
  throw new Error(`No recording named ${name} in ${recordings}.`);
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
