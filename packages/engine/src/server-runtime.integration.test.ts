import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readServerAddress, writeServerAddress } from './server-runtime';

// The Supervisor, desktop and dev-server suites prove writing, removing and a missing file through their own callers.
let home: string;

beforeEach((): void => {
  home = mkdtempSync(join(tmpdir(), 'server-runtime-'));
});

afterEach((): void => {
  vi.restoreAllMocks();
  rmSync(home, { recursive: true, force: true });
});

describe('server address', (): void => {
  it('creates a missing home', (): void => {
    const nested = join(home, 'argo');
    const address = {
      pid: 4242,
      port: 7337,
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
    };

    writeServerAddress(nested, address);

    expect(readServerAddress(nested)).toEqual(address);
  });

  it.each([
    ['is not JSON', '{'],
    ['has an unrecognised shape', JSON.stringify({ port: 7337, home })],
  ])('rejects and reports a server.json that %s', (_, text): void => {
    const report = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    writeFileSync(join(home, 'server.json'), text);

    expect(readServerAddress(home)).toBeNull();
    expect(report).toHaveBeenCalledOnce();
  });

  it('reports the same damaged server.json once however often it is read', (): void => {
    const report = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {});
    writeFileSync(join(home, 'server.json'), `{"damaged": "${home}"`);

    readServerAddress(home);
    readServerAddress(home);

    expect(report).toHaveBeenCalledOnce();
  });
});
