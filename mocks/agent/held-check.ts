import { existsSync } from 'node:fs';

const releasePollMs = 100;

// Holds until the E2E Server's stop writes the release file, so a held readiness check never blocks shutdown; with no release file named, it holds for good.
export function untilHeldCheckReleased(): Promise<void> {
  const release = process.env.ARGO_E2E_HELD_CHECK_RELEASE;
  if (!release) return new Promise<void>(() => {});
  return new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      if (!existsSync(release)) return;
      clearInterval(poll);
      resolve();
    }, releasePollMs);
  });
}
