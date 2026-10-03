import type { ServerAddress } from '@repo/contracts';

export interface ServerHealth {
  version: string;
}

export interface ServerLifecycleDependencies {
  // The version of the Server this app starts.
  version: string;
  // Returns the validated server.json, or null when it is missing or unrecognised.
  readAddress(): Promise<ServerAddress | null>;
  // Returns the Server's /health answer, or null when nothing answers.
  readHealth(port: number): Promise<ServerHealth | null>;
  // Starts the supervisor detached, reports its pid once spawned, and resolves once its server.json and /health agree.
  start(onSpawn: (pid: number) => void): Promise<ServerAddress>;
  // Asks the process to stop and resolves once it has exited.
  stop(pid: number): Promise<void>;
}

export interface ServerLifecycle {
  connect(): Promise<ServerAddress>;
  release(): Promise<void>;
}

// Reuses a Server with the same version, restarts one with another, starts one when none answers (spec section 9).
export function createServerLifecycle(
  dependencies: ServerLifecycleDependencies,
): ServerLifecycle {
  let startedPid: number | null = null;

  const stopStarted = async () => {
    if (startedPid === null) return;
    const pid = startedPid;
    startedPid = null;
    await dependencies.stop(pid);
  };

  return {
    async connect() {
      const address = await dependencies.readAddress();
      const health = address
        ? await dependencies.readHealth(address.port)
        : null;
      if (address && health?.version === dependencies.version) return address;
      if (address && health) await dependencies.stop(address.pid);
      try {
        return await dependencies.start((pid) => {
          startedPid = pid;
        });
      } catch (error) {
        await stopStarted();
        throw error;
      }
    },
    release: stopStarted,
  };
}

export const serverUrl = (address: ServerAddress) =>
  `ws://127.0.0.1:${address.port}`;
