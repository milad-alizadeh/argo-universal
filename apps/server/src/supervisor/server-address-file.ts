import { renameSync, rmSync, writeFileSync } from 'node:fs';
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

export function removeServerAddress(home: string) {
  rmSync(join(home, fileName), { force: true });
}
