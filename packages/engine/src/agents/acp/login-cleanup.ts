import type { AcpProcess } from './resource-types';

const cleanupError = (): Error =>
  new Error('Login cleanup failed: Agent process exit was not observed');

const loginCloseTimeoutMs = 5000;

const observeExit = async (process: AcpProcess): Promise<void> => {
  await Promise.all([process.terminate(), process.exited]);
};

export const closeLoginProcess = async (
  process: AcpProcess,
  timeoutMs = loginCloseTimeoutMs,
): Promise<void> => {
  const expired = Promise.withResolvers<never>();
  const timeout = setTimeout(() => expired.reject(cleanupError()), timeoutMs);
  timeout.unref();

  try {
    await Promise.race([observeExit(process), expired.promise]);
  } finally {
    clearTimeout(timeout);
  }
};
