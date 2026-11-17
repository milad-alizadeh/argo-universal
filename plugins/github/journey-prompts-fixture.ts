import type { PluginTestOptions } from '@argo/plugin-kit/testing';
import type { GitHubFixture } from './github-fixture';
import type { Journey } from './journey-fixture';

// One Prompt the Plugin sent a Session through `argo.sessions.prompt`, with the sender the Server would show.
export type SentPrompt = {
  sessionId: string;
  text: string;
  sender: { pluginId: string; title: string };
};

const sentBy = new WeakMap<GitHubFixture, SentPrompt[]>();

// The Server's prompt queue as the Plugin meets it: every Prompt is taken and recorded, as queued behind other work.
export function promptRecorder(
  github: GitHubFixture,
): NonNullable<PluginTestOptions['promptSession']> {
  const sent = sentBy.get(github) ?? [];

  sentBy.set(github, sent);

  return async (sessionId, text, sender) => {
    sent.push({ sessionId, text, sender });

    return { status: 'queued' };
  };
}

// The Prompts sent so far, in order, surviving a restart of the Plugin.
export const promptsSent = ({
  github,
}: Pick<Journey, 'github'>): SentPrompt[] => sentBy.get(github) ?? [];
