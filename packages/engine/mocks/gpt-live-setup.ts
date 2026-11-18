import type { CodexReading } from '../src/voice/gpt-live/codex-auth';
import type { GptLiveCall } from '../src/voice/gpt-live/gpt-live-call';
import { createGptLiveProvider } from '../src/voice/gpt-live/gpt-live-provider';
import type {
  VoiceProviderCall,
  VoiceProviderEvent,
  VoiceStartRequest,
} from '../src/voice/provider';
import {
  startFakeEndpoint,
  type FakeGptLiveEndpoint,
} from './gpt-live-endpoint';
import { ScriptedAuth } from './scripted-auth';

export const signedIn = (token: string): CodexReading => ({
  signedIn: true,
  token,
});

export const request = {
  offer: 'v=0 offer',
  briefing: 'Session: Fix the build',
};

type FixtureOptions = {
  // Tokens the control link accepts when they differ from the ones that create a call.
  linkAccepts?: string[];
  // How long a lost control link may stay down; generous unless a test is about the loss.
  lostLinkMs?: number;
};

const generousGraceMs = 30_000;

export type GptLiveFixture = {
  endpoint: FakeGptLiveEndpoint;
  auth: ScriptedAuth;
  provider: ReturnType<typeof createGptLiveProvider>;
  // Starts a call that the fixture ends when it closes.
  start: (request: VoiceStartRequest) => Promise<GptLiveCall>;
  // Ends every call it started, then the fake service, and waits until both are gone.
  close: () => Promise<void>;
};

const providerFor = (
  endpoint: FakeGptLiveEndpoint,
  auth: ScriptedAuth,
  lostLinkMs: number,
): GptLiveFixture['provider'] =>
  createGptLiveProvider({
    auth,
    callsUrl: `${endpoint.httpBase}/backend-api/codex/realtime/calls`,
    linkUrl: `${endpoint.linkBase}/v1/live`,
    lostLinkMs,
  });

class Fixture implements GptLiveFixture {
  private readonly calls: GptLiveCall[] = [];

  public constructor(
    public readonly endpoint: FakeGptLiveEndpoint,
    public readonly auth: ScriptedAuth,
    public readonly provider: GptLiveFixture['provider'],
  ) {}

  public readonly start = async (
    started: VoiceStartRequest,
  ): Promise<GptLiveCall> => {
    const call = await this.provider.start(started);
    this.calls.push(call);

    return call;
  };

  public readonly close = async (): Promise<void> => {
    for (const call of this.calls) call.end();
    await this.endpoint.close();
  };
}

// A provider wired to a local fake of the service that accepts `accepts`, and to a Codex that answers `readings`.
export async function fixtureOf(
  readings: CodexReading[],
  accepts: string[],
  options: FixtureOptions = {},
): Promise<GptLiveFixture> {
  const { linkAccepts, lostLinkMs = generousGraceMs } = options;
  const endpoint = await startFakeEndpoint({ accepts, linkAccepts });
  const auth = new ScriptedAuth(readings);

  return new Fixture(endpoint, auth, providerFor(endpoint, auth, lostLinkMs));
}

// Everything the call reports from now on.
export function heard(call: VoiceProviderCall): VoiceProviderEvent[] {
  const events: VoiceProviderEvent[] = [];
  call.listen((event) => events.push(event));

  return events;
}

// A fixture that accepts the token `t1`, with a call already started on it.
export async function startedCall(
  options: FixtureOptions = {},
): Promise<GptLiveFixture & { call: GptLiveCall }> {
  const fixture = await fixtureOf([signedIn('t1')], ['t1'], options);

  return { ...fixture, call: await fixture.start(request) };
}
