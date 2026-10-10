import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

type LogEntry = { home: string; label: string; line: string };

export function writeLog({ home, label, line }: LogEntry): void {
  const stamped = `${new Date().toISOString()} ${label} ${process.pid}: ${line}`;
  process.stdout.write(`${stamped}\n`);
  const logsFolder = join(home, 'logs');
  mkdirSync(logsFolder, { recursive: true });
  appendFileSync(join(logsFolder, `${label}.log`), `${stamped}\n`);
}
