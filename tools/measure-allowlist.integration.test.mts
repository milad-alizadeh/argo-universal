import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  file,
  fixture,
  run,
  valid,
  write,
} from './measure-allowlist.mocks.mts';
import { measureFindings } from './measure-allowlist.mts';

it('keeps allowed styling quiet while measuring and rejecting stale entries', (): void => {
  const root = fixture();

  try {
    const lint = run(root, join(root, 'node_modules/.bin/oxlint'), [
      '--format=json',
      file,
    ]);

    expect(lint.status).toBe(0);
    expect(lint.output).not.toContain('argo(kit-styling)');
    expect(measureFindings(root)).toContain('argo(kit-styling)');

    const check = (): ReturnType<typeof run> =>
      run(root, process.execPath, ['tools/check-rule-allowlists.mts']);

    expect(check().status).toBe(0);
    write(root, file, valid);

    const stale = check();

    expect(stale.status).toBe(1);
    expect(stale.output).toContain(`${file}: no argo/kit-styling findings`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 120_000);
