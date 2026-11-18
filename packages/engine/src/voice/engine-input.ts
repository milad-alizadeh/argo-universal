import type { Database } from '@repo/db';
import { createSessionReader } from '../sessions';
import { briefingOf } from './briefing';
import { FakeVoiceProvider } from './fake-provider';
import type { CodexAuth } from './gpt-live/codex-auth';
import { createGptLiveProvider } from './gpt-live/gpt-live-provider';
import type { VoiceProvider } from './provider';

// How long a Voice call may pass without speech before it ends by itself.
export const defaultVoiceIdleMs = 5 * 60_000;

// The Voice provider a Server uses unless it is given one: the fake for development when asked for, otherwise GPT-Live.
export function defaultVoiceProvider(
  environment: NodeJS.ProcessEnv,
  auth?: CodexAuth,
): VoiceProvider | null {
  return environment.ARGO_VOICE_PROVIDER === 'fake'
    ? new FakeVoiceProvider()
    : createGptLiveProvider(auth && { auth });
}

// What the voice is told about a Session before it speaks: its title, working folder and recent Feed.
export function sessionBriefing(
  database: Database,
): (sessionId: string) => string {
  const read = createSessionReader(database);

  return (sessionId) => {
    const { title, checkout } = read(sessionId);

    return briefingOf(database, {
      id: sessionId,
      title,
      folder: checkout.path,
    });
  };
}
