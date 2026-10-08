import { mockClis } from '@repo/mocks/cli';
import { z } from 'zod';
import type { MockAgents } from '../mock-agents';

const Availability = z.enum(['not installed', 'not signed in']);
export type Unavailable = z.infer<typeof Availability>;
export const agentIds = Object.keys(mockClis);

export function agentId(ordinal: number): string {
  const id = agentIds[ordinal - 1];
  if (!id) throw new Error(`No Agent at position ${ordinal}`);
  return id;
}

export function availabilityValue(
  state: Unavailable,
): 'not_installed' | 'not_signed_in' {
  return state === 'not installed' ? 'not_installed' : 'not_signed_in';
}

function unavailableAgents(ordinal: string, state: string): MockAgents {
  const availability = availabilityValue(Availability.parse(state));
  const ids = ordinal === 'every' ? agentIds : [agentId(Number(ordinal))];
  return Object.fromEntries(
    ids.map((id): [string, { availability: typeof availability }] => [
      id,
      { availability },
    ]),
  );
}

function unavailableConfiguration(match: RegExpExecArray): MockAgents {
  return unavailableAgents(match[1] ?? 'every', match[2] ?? '');
}

function configurationForStep(step: string): MockAgents {
  const unavailable =
    /^(?:Given|And) (?:Agent (\d+)|(?:every) Agent) is "([^"]+)"$/.exec(step);
  if (unavailable) return unavailableConfiguration(unavailable);
  const image = /^(?:Given|And) Agent (\d+) can inspect image prompts$/.exec(
    step,
  );
  if (image)
    return { [agentId(Number(image[1]))]: { recording: 'image-prompt' } };
  return {};
}

export function scenarioAgents(steps: string[]): MockAgents {
  return Object.assign({}, ...steps.map(configurationForStep));
}
