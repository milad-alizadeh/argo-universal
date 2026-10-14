import { existsSync } from 'node:fs';
import type { ScriptedScenario } from './scripted-scenario.ts';

const releasePollMs = 100;

// Holds until the E2E Server's stop writes the release file, so a held readiness check never blocks shutdown; with no release file named, it holds for good.
function untilHeldCheckReleased(): Promise<void> {
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

// Only the stdio process reads the release file, so the scenarios stay free of the filesystem.
export function releasingHeldCheck(
  name: string,
  scenario: ScriptedScenario,
): ScriptedScenario {
  if (name !== 'check-held') return scenario;

  const initialize = [
    {
      get waitFor(): Promise<void> {
        return untilHeldCheckReleased();
      },
    },
  ];

  return { ...scenario, responses: { ...scenario.responses, initialize } };
}
