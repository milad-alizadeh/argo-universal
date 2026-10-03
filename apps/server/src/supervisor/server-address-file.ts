import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ServerAddress } from '@repo/contracts';

const fileName = 'server.json';

// Writes a temp file and renames it, so a reader never sees half a file.
export function writeServerAddress(home: string, address: ServerAddress) {
  const filePath = join(home, fileName);
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(ServerAddress.parse(address), null, 2)}\n`,
  );
  renameSync(temporaryPath, filePath);
}

// Removes server.json only when it names this pid, so a failed second supervisor leaves the running Server's file.
export function removeServerAddress(home: string, pid: number) {
  const filePath = join(home, fileName);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return;
  }
  const address = ServerAddress.safeParse(json);
  if (address.success && address.data.pid === pid)
    rmSync(filePath, { force: true });
}
