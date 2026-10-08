import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

let rejectedRecordings = 0;

export function recordingVersion(directory: string): string {
  const versions = readdirSync(directory, { withFileTypes: true })
    .filter((entry): boolean => entry.isDirectory())
    .map((entry): string => entry.name);
  const [version] = versions;
  if (version === undefined || versions.length !== 1) {
    rejectedRecordings += 1;
    console.error(`Rejected recording folders (${rejectedRecordings})`);
    throw new Error(
      `${directory} must hold one version folder, not ${versions.length}.`,
    );
  }
  return version;
}

export function readRecording(directory: string, name: string): string {
  return readFileSync(
    path.join(directory, recordingVersion(directory), `${name}.json`),
    'utf8',
  );
}
