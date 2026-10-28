import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  ScriptedCredentials,
  ScriptedScenario,
} from './scripted-scenario.ts';

function writeCredentials(path: string, value: boolean): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value ? '1' : '0', { mode: 0o600 });
}

function storedCredentials(
  path: string,
  fallback: ScriptedCredentials,
): ScriptedCredentials {
  return {
    get signedIn(): boolean {
      return existsSync(path)
        ? readFileSync(path, 'utf8') === '1'
        : fallback.signedIn;
    },
    set signedIn(value: boolean) {
      writeCredentials(path, value);
    },
  };
}

function credentialPath(
  requestLog: string,
  epoch: string,
  agent: string,
): string {
  const scope = createHash('sha256')
    .update(JSON.stringify([epoch, agent, process.cwd()]))
    .digest('hex');

  return join(dirname(requestLog), 'agent-credentials', scope);
}

function scopedPath(requestLog: string): string | undefined {
  const epoch = process.env.ARGO_E2E_AUTH_EPOCH;
  const agent = process.env.ARGO_E2E_AGENT_ID;

  if (!epoch || !agent) return undefined;

  return credentialPath(requestLog, epoch, agent);
}

function withCredentials(
  scenario: ScriptedScenario,
  path: string,
): ScriptedScenario {
  const authentication = scenario.authentication;

  if (!authentication) return scenario;

  return {
    ...scenario,
    authentication: {
      credentials: storedCredentials(path, authentication.credentials),
    },
  };
}

// App fixtures share a stored sign-in within one Engine, Agent and Project.
export function processCredentials(
  scenario: ScriptedScenario,
  requestLog: string | undefined,
): ScriptedScenario {
  if (!requestLog) return scenario;

  const path = scopedPath(requestLog);

  return path ? withCredentials(scenario, path) : scenario;
}
