import { expect, onTestFinished } from 'vitest';
import { awaitSettledReadiness } from './engine';
import type { startInstallEngine } from './installation';
type Host = Awaited<ReturnType<typeof startInstallEngine>>;
const removeRejection = 'DROP TRIGGER IF EXISTS reject_configuration';
export const rejectInstallationWrites = (host: Host): void => {
  host.database.$client.exec(
    "CREATE TEMP TRIGGER reject_configuration BEFORE INSERT ON agents WHEN NEW.configuration IS NOT NULL BEGIN SELECT RAISE(ABORT, 'configuration storage failed'); END",
  );
  onTestFinished(() => {
    if (host.database.$client.isOpen)
      host.database.$client.exec(removeRejection);
  });
};
export const waitForInstalledSelection = async (host: Host): Promise<void> => {
  await expect
    .poll(
      async () =>
        (await host.caller.agents.installStatus({ agentId: host.agentId }))
          .operation?.status,
      { timeout: 5000 },
    )
    .toBe('installed');
  // The install's own Readiness check holds setup ownership until it settles.
  await awaitSettledReadiness(host.caller);
};
