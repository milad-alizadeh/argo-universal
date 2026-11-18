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
