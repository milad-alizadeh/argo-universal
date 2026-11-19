import { fromCallback } from 'xstate';
import type { VoiceCallEvent, VoiceCallInput } from '../src/voice/call-types';
import type { ConnectionWatch, SessionWatch } from '../src/voice/call-watchers';
import { voiceCallMachine } from '../src/voice/call.machine';
import { FakeVoiceProvider } from '../src/voice/fake-provider';
import type { ProviderCallInput } from '../src/voice/provider-call';

const stub = <Input>(): ReturnType<
  typeof fromCallback<VoiceCallEvent, Input>
> => fromCallback<VoiceCallEvent, Input>((): (() => void) => (): void => {});

// The Voice call machine with the actors that would send events back stubbed, so a test sends every event itself.
export const modelMachine = voiceCallMachine.provide({
  actors: {
    providerCall: stub<ProviderCallInput>(),
    watchSession: stub<SessionWatch>(),
    watchConnection: stub<ConnectionWatch>(),
  },
});

export const voiceModelIdleMs = 60_000;

// A fresh input for each actor, so no two tests share one provider.
export const voiceModelInput = (): VoiceCallInput => ({
  provider: new FakeVoiceProvider(),
  briefing: () => '',
  idleMs: voiceModelIdleMs,
  log: () => {},
  now: Date.now,
});
