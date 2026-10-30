import { mkdtempSync, realpathSync } from 'node:fs';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/*
 * A Project is registered at the resolved path of its main checkout, so a fixture that seeds a Project under a temporary folder must hand out that folder already resolved.
 * On macOS os.tmpdir() is /var/folders/..., a symlink to /private/var/folders/..., so a raw mkdtemp path never equals the path the Project is stored at.
 * Linux CI has no such symlink and never shows the mismatch. Always create temporary folders through these, never mkdtemp(tmpdir()) directly.
 */
export const makeResolvedTempFolderSync = (prefix: string): string =>
  realpathSync(mkdtempSync(join(tmpdir(), prefix)));

export const makeResolvedTempFolder = async (prefix: string): Promise<string> =>
  realpath(await mkdtemp(join(tmpdir(), prefix)));
