import type { CodexAuth, CodexReading } from '../src/voice/gpt-live/codex-auth';
import { createGptLiveProvider } from '../src/voice/gpt-live/gpt-live-provider';
import type {
  VoiceProviderCall,
  VoiceProviderEvent,
} from '../src/voice/provider';
import {
  startFakeEndpoint,
  type FakeGptLiveEndpoint,
} from './gpt-live-endpoint';

// A Codex that hands out these readings in turn, and counts how often it was asked.
class ScriptedAuth implements CodexAuth {
  public asked = 0;

  public constructor(private readonly readings: CodexReading[]) {}

  public read(): Promise<CodexReading> {
    const last = this.readings.length - 1;
    const reading = this.readings.at(Math.min(this.asked, last));
    this.asked += 1;

    return Promise.resolve(
      reading ?? { signedIn: false, reason: 'No reading' },
    );
  }
}

export const signedIn = (token: string): CodexReading => ({
  signedIn: true,
  token,
});

export const request = {
  offer: 'v=0 offer',
  briefing: 'Session: Fix the build',
};

export type GptLiveFixture = {
  endpoint: FakeGptLiveEndpoint;
  auth: ScriptedAuth;
  provider: ReturnType<typeof createGptLiveProvider>;
};

// A provider wired to a local fake of the service that accepts `accepts`, and to a Codex that answers `readings`.
export async function fixtureOf(
  readings: CodexReading[],
  accepts: string[],
): Promise<GptLiveFixture> {
  const endpoint = await startFakeEndpoint({ accepts });

  const auth = new ScriptedAuth(readings);

  const provider = createGptLiveProvider({
    auth,
    callsUrl: `${endpoint.httpBase}/backend-api/codex/realtime/calls`,
    linkUrl: `${endpoint.linkBase}/v1/live`,
    lostLinkMs: 150,
  });

  return { endpoint, auth, provider };
}

// Everything the call reports from now on.
export function heard(call: VoiceProviderCall): VoiceProviderEvent[] {
  const events: VoiceProviderEvent[] = [];
  call.listen((event) => events.push(event));

  return events;
}

type StartedCall = Awaited<ReturnType<GptLiveFixture['provider']['start']>>;

// A fixture that accepts the token `t1`, with a call already started on it.
export async function startedCall(): Promise<
  GptLiveFixture & { call: StartedCall }
> {
  const fixture = await fixtureOf([signedIn('t1')], ['t1']);

  return { ...fixture, call: await fixture.provider.start(request) };
}
