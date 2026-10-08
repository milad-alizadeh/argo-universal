import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach } from 'vitest';

const roots: string[] = [];
afterEach((): void => {
  roots.splice(0).map((root): void => rmSync(root, { recursive: true }));
});

export function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'hoisting-report-'));
  roots.push(root);
  Object.entries(files).map(([file, source]): void => {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), source);
  });
  return root;
}
