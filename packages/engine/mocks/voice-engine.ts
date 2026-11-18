import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { VoiceCall, VoiceStatus } from '@repo/contracts';
import { FakeVoiceProvider } from '../src/voice/fake-provider';
import { startAcpEngine } from './acp-engine';
import { openAccessSession, sessionIdentityStep } from './session-access';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export type VoiceSession = Awaited<ReturnType<typeof openAccessSession>>;

export const offer = 'offer-sdp';

// The Engine with the mock ACP Agent and a fake Voice provider whose call connects only when a test says so.
export async function startVoiceEngine(
  provider: FakeVoiceProvider = new FakeVoiceProvider({ connect: 'manual' }),
): Promise<{
  host: Host;
  provider: FakeVoiceProvider;
  outputs: TerminalOutputResponse[];
}> {
  const outputs: TerminalOutputResponse[] = [];

  const host = await startAcpEngine({
    steps: [sessionIdentityStep(outputs)],
    voiceProvider: provider,
  });

  return { host, provider, outputs };
}

// A settled Session, with the caller its Agent has.
export const openVoiceSession = (
  voice: Awaited<ReturnType<typeof startVoiceEngine>>,
  text = 'Hello',
): Promise<VoiceSession> => openAccessSession(voice, text);

export const callOf = async (host: Host): Promise<VoiceCall | null> =>
  (await host.caller.voice.status()).call;

export const endedOf = async (host: Host): Promise<VoiceStatus['ended']> =>
  (await host.caller.voice.status()).ended;

type VoiceEngine = Awaited<ReturnType<typeof startVoiceEngine>>;

// What a speaker says on the call; words not `final` may still change.
export const say = (
  voice: VoiceEngine,
  speaker: 'person' | 'voice',
  id: string,
  text: string,
  final: boolean,
): void =>
  voice.provider.call.emit({ type: `${speaker}.transcript`, id, text, final });

export const partialsOf = async (
  host: Host,
): Promise<VoiceStatus['partials']> =>
  (await host.caller.voice.status()).partials;

// A Session with a running, connected call.
export async function startedCall(voice: VoiceEngine): Promise<string> {
  const { sessionId } = await openVoiceSession(voice);
  await voice.host.caller.voice.start({ sessionId, offer });
  voice.provider.call.connect();

  return sessionId;
}

// The Session's newest stored Feed rows, oldest first.
export const storedRows = async (
  host: Host,
  sessionId: string,
): Promise<{ sessionUpdate: string; state: string; content?: unknown }[]> =>
  (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows;

// Only the transcript rows, as a test reads them.
export const transcriptsOf = async (
  host: Host,
  sessionId: string,
): Promise<{ kind: string; text: unknown }[]> =>
  (await storedRows(host, sessionId))
    .filter((row) => row.sessionUpdate.endsWith('_transcript'))
    .map((row) => ({ kind: row.sessionUpdate, text: row.content }));
