import type { Database } from '@repo/db';
import { createSessionReader } from '../sessions';
import { FakeVoiceProvider } from './fake-provider';
import { createGptLiveProvider } from './gpt-live/gpt-live-provider';
import type { VoiceProvider } from './provider';

// The Voice provider a Server uses unless it is given one: the fake for development when asked for, otherwise GPT-Live.
export function defaultVoiceProvider(
  environment: NodeJS.ProcessEnv,
): VoiceProvider | null {
  return environment.ARGO_VOICE_PROVIDER === 'fake'
    ? new FakeVoiceProvider()
    : createGptLiveProvider();
}

// What the voice is told about a Session before it speaks: its title and working folder.
export function sessionBriefing(
  database: Database,
): (sessionId: string) => string {
  const read = createSessionReader(database);

  return (sessionId) => {
    const { title, checkout } = read(sessionId);

    return `Session: ${title}\nWorking folder: ${checkout.path}`;
  };
}
