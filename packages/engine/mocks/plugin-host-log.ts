import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function pluginHostPids(home: string): Promise<number[]> {
  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');

  return [...log.matchAll(/Plugin host started: (\d+)/g)].map((match) =>
    Number(match[1]),
  );
}

export async function killPluginHost(home: string): Promise<void> {
  const pid = (await pluginHostPids(home)).at(-1);

  if (!pid) throw new Error('Plugin host did not log its pid');
  process.kill(pid, 'SIGKILL');
}
