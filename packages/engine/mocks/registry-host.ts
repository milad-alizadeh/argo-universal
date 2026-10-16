import { waitFor } from 'xstate';
import type { RegistryActor } from '../src/agents';
import { startEngineTestHost, type EngineTestOptions } from './engine';

type SettledHost = Awaited<ReturnType<typeof startEngineTestHost>> & {
  actor: RegistryActor;
};

// The Engine fetches the Registry at start when no row is stored; this waits for that fetch to settle.
export const startSettledRegistryHost = async (
  options: EngineTestOptions = {},
): Promise<SettledHost> => {
  const host = await startEngineTestHost(options);
  const actor: RegistryActor = host.engine.system.get('registry');
  await waitFor(actor, (snapshot) => snapshot.matches('idle'));

  return { ...host, actor };
};
