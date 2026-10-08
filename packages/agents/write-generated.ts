import { randomUUID } from 'node:crypto';
import { renameSync, rmSync, writeFileSync } from 'node:fs';

export function writeGenerated(output: URL, value: unknown): void {
  const temporary = new URL(`${output.href}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
}
