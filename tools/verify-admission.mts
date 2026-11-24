import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { acquireBrowserSuiteLock } from '@repo/browser-suite-lock';

const verificationPort = 47_292;

const secondVerificationPort = 47_293;

// Three concurrent runs crossed the load guard on the 18-core Server Device.
const coresForTwoRuns = 18;

function backgroundVerify(): void {
  const priority = spawnSync('/usr/sbin/taskpolicy', [
    '-b',
    '-p',
    String(process.pid),
  ]);

  if (priority.status !== 0)
    process.stderr.write(
      'verify: could not set background priority. The Verify slot limit still applies.\n',
    );
}

export async function admitVerify(): Promise<void> {
  if (process.platform !== 'darwin' || process.env.CI) return;

  if (availableParallelism() < coresForTwoRuns) return;

  const release = await acquireBrowserSuiteLock({
    port: verificationPort,
    additionalPorts: [secondVerificationPort],
    sharedQueue: true,
    onWait: (holder): void => {
      const owner = holder
        ? ` A slot is held by pid ${holder.pid} in ${holder.cwd}.`
        : '';

      process.stdout.write(
        `verify: waiting for a local Verify slot.${owner}\n`,
      );
    },
  });

  process.once('exit', release);
  backgroundVerify();
}
