import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  file,
  fixture,
  invalid,
  run,
  valid,
  write,
} from './measure-allowlist.mocks.mts';
import { measureFindings } from './measure-allowlist.mts';

const unlisted = 'packages/client/src/unlisted.tsx';

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

    // The same run is the lint gate: a finding outside the allowlist fails it.
    write(root, file, invalid);
    write(root, unlisted, invalid);

    const unwaived = check();

    expect(unwaived.status).toBe(1);
    expect(unwaived.output).toContain(`${unlisted}:3:`);
    expect(unwaived.output).toContain(
      'oxlint: 1 findings outside the allowlists',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 120_000);
