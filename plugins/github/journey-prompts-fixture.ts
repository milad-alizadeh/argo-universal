import type { PluginTestOptions } from '@argo/plugin-kit/testing';
import type { GitHubFixture } from './github-fixture';
import type { Journey } from './journey-fixture';

// One Prompt the Plugin sent a Session through `argo.sessions.prompt`, with the sender the Server would show.
export type SentPrompt = {
  sessionId: string;
  text: string;
  sender: { pluginId: string; title: string };
};

// The Server's queue as the Plugin meets it: every Prompt sent, and the ids of those still waiting.
type Queue = {
  sent: SentPrompt[];
  waiting: Map<string, SentPrompt>;
  withdrawn: SentPrompt[];
  refused: Set<string>;
  // While set, the Server refuses every Prompt, as it does a Session it can no longer prompt; each refusal is kept.
  refusing: boolean;
  refusals: SentPrompt[];
};

const queues = new WeakMap<GitHubFixture, Queue>();

const queueOf = (github: GitHubFixture): Queue => {
  const queue = queues.get(github) ?? {
    sent: [],
    waiting: new Map(),
    withdrawn: [],
    refused: new Set(),
    refusing: false,
    refusals: [],
  };

  queues.set(github, queue);

  return queue;
};

// Every Prompt is taken and recorded as queued behind other work, under an id it waits by until `startPrompts`.
export function promptRecorder(
  github: GitHubFixture,
): NonNullable<PluginTestOptions['promptSession']> {
  const queue = queueOf(github);

  return async (sessionId, text, sender) => {
    const prompt = { sessionId, text, sender };
    const queuedId = `queued-${queue.sent.length + 1}`;

    if (queue.refusing) {
      queue.refusals.push(prompt);
      throw new Error('This Session cannot take Prompts');
    }

    queue.sent.push(prompt);
    queue.waiting.set(queuedId, prompt);

    return { status: 'queued', queuedId };
  };
}

// The Server taking back a Prompt that still waits; one that started is left, and answers not withdrawn.
export function withdrawRecorder(
  github: GitHubFixture,
): NonNullable<PluginTestOptions['withdrawPrompt']> {
  const queue = queueOf(github);

  return async (_sessionId, queuedId) => {
    if (queue.refused.has(queuedId))
      throw new Error(`Withdrawing ${queuedId} was refused`);

    const prompt = queue.waiting.get(queuedId);

    if (!prompt) return { withdrawn: false };

    queue.waiting.delete(queuedId);
    queue.withdrawn.push(prompt);

    return { withdrawn: true };
  };
}

// The Server refuses to withdraw the Prompts sent so far until `allowWithdraw`, as when the Session cannot be reached.
export const refuseWithdraw = ({ github }: Pick<Journey, 'github'>): void => {
  const queue = queueOf(github);

  for (const queuedId of queue.waiting.keys()) queue.refused.add(queuedId);
};

export const allowWithdraw = ({ github }: Pick<Journey, 'github'>): void => {
  queueOf(github).refused.clear();
};

// The Session's Turns take every waiting Prompt, so none can be withdrawn.
export const startPrompts = ({ github }: Pick<Journey, 'github'>): void => {
  queueOf(github).waiting.clear();
};

// The Prompts sent so far, in order, surviving a restart of the Plugin.
export const promptsSent = ({
  github,
}: Pick<Journey, 'github'>): SentPrompt[] => queueOf(github).sent;

// The Prompts taken back so far, in order.
export const promptsWithdrawn = ({
  github,
}: Pick<Journey, 'github'>): SentPrompt[] => queueOf(github).withdrawn;

// The Server refuses every Prompt until `allowPrompts`.
export const refusePrompts = ({ github }: Pick<Journey, 'github'>): void => {
  queueOf(github).refusing = true;
};

export const allowPrompts = ({ github }: Pick<Journey, 'github'>): void => {
  queueOf(github).refusing = false;
};

// The Prompts the Server refused so far, in order.
export const promptsRefused = ({
  github,
}: Pick<Journey, 'github'>): SentPrompt[] => queueOf(github).refusals;
