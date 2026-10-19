import { resolve, join } from 'node:path';
import { PaperClient } from './client.mts';
import { enrollCommand, reportCommand } from './commands.mts';
import { syncRegistry } from './run.mts';
import { scan } from './scan.mts';

const [command = 'check', ...args] = process.argv.slice(2);

function option(name: string, fallback: string): string {
  return (
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ??
    fallback
  );
}

const directory = resolve('.paper-sync');

const options = {
  cache: resolve(option('cache', join(directory, 'inventory'))),
  registry: resolve(option('registry', join(directory, 'registry.json'))),
  directory: join(directory, new Date().toISOString().replaceAll(':', '-')),
  rebind: args.includes('--rebind'),
};

async function connectedCommand(client: PaperClient): Promise<void> {
  await client.connect();

  if (command === 'scan')
    return scan(client, {
      cache: options.cache,
      fileId: option('file', ''),
    });

  if (command === 'enroll') return enrollCommand(client, options);
  await syncRegistry(client, options.registry, {
    apply: command === 'apply',
    runDirectory: options.directory,
    cache: options.cache,
  });
}

if (!['scan', 'enroll', 'report', 'check', 'verify', 'apply'].includes(command))
  throw new Error(
    'Usage: pnpm paper:sync scan|enroll|report|check|verify|apply [--file=id] [--rebind] [--registry=path] [--cache=path]',
  );

await (command === 'report'
  ? reportCommand(options)
  : connectedCommand(new PaperClient()));
