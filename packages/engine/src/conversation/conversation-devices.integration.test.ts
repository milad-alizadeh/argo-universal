import type {
  VoiceDeviceChange,
  VoiceDeviceReport,
  VoiceDeviceRequest,
} from '@repo/contracts';
import { describe, expect, it, onTestFinished } from 'vitest';
import { operationCaller, runOperation } from '#mocks/operations';
import { offer, openVoiceSession, startVoiceEngine } from '#mocks/conversation-engine';

type Voice = Awaited<ReturnType<typeof startVoiceEngine>>;

const plugged: VoiceDeviceReport = {
  microphones: [
    { id: 'mic-a', label: 'Desk microphone' },
    { id: 'mic-b', label: 'Headset' },
  ],
  speakers: [{ id: 'spk-a', label: 'Speakers' }],
  microphone: null,
  speaker: null,
};

const headset = { microphone: 'mic-b' };

const noApp = /No App/;

interface ListeningApp {
  caller: ReturnType<Voice['host']['createCaller']>;
  // Every choice the Server pushed to this App, in order.
  asked: VoiceDeviceChange[];
}

const choiceOf = (event: VoiceDeviceRequest): VoiceDeviceChange | undefined =>
  event.type === 'choose' ? event.change : undefined;

// An App Connection that reports its devices and keeps what the Server asks it to choose; it resolves once listening.
async function connectApp(voice: Voice): Promise<ListeningApp> {
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const caller = voice.host.createCaller({ signal: controller.signal });
  const asked: VoiceDeviceChange[] = [];
  const ready = Promise.withResolvers<void>();
  const stream = await caller.voice.devices(plugged);

  void (async (): Promise<void> => {
    for await (const event of stream) {
      const change = choiceOf(event);

      if (change) asked.push(change);
      else ready.resolve();
    }
  })();

  await ready.promise;

  return { caller, asked };
}

const chooseFromCli = async (
  voice: Voice,
  change: VoiceDeviceChange,
): Promise<void> => {
  await runOperation((await operationCaller(voice.host)).operations, {
    id: 'voice.chooseDevices',
    params: change,
  });
};

describe('choosing the microphone and speaker from an Agent or the CLI', () => {
  it('lists the devices of the App that would carry a call', async () => {
    const voice = await startVoiceEngine();
    await connectApp(voice);

    const listed = await runOperation(
      (await operationCaller(voice.host)).operations,
      { id: 'voice.listDevices', params: {} },
    );

    expect(listed).toEqual({ ...plugged, carriesCall: false });
  });

  it('refuses when no App that can carry a call is connected', async () => {
    const voice = await startVoiceEngine();

    await expect(voice.host.caller.voice.listDevices({})).rejects.toThrow(
      noApp,
    );
    await expect(chooseFromCli(voice, headset)).rejects.toThrow(noApp);
  });

  it('asks the App carrying the call, not one that connected after it', async () => {
    const voice = await startVoiceEngine();
    const { sessionId } = await openVoiceSession(voice);
    const carrying = await connectApp(voice);
    await carrying.caller.voice.start({ sessionId, offer });
    const later = await connectApp(voice);

    await chooseFromCli(voice, headset);

    await expect.poll(() => carrying.asked).toEqual([headset]);
    expect(later.asked).toEqual([]);
    expect(await voice.host.caller.voice.listDevices({})).toMatchObject({
      microphone: 'mic-b',
      carriesCall: true,
    });
  });

  it('asks the App that started the last call once no call runs', async () => {
    const voice = await startVoiceEngine();
    const { sessionId } = await openVoiceSession(voice);
    const used = await connectApp(voice);
    await used.caller.voice.start({ sessionId, offer });
    await used.caller.voice.end({ sessionId });
    const later = await connectApp(voice);

    await chooseFromCli(voice, { speaker: 'spk-a' });

    await expect.poll(() => used.asked).toEqual([{ speaker: 'spk-a' }]);
    expect(later.asked).toEqual([]);
  });

  it('asks the App that connected last when none has started a call', async () => {
    const voice = await startVoiceEngine();
    const first = await connectApp(voice);
    const last = await connectApp(voice);

    await chooseFromCli(voice, { microphone: null });

    await expect.poll(() => last.asked).toEqual([{ microphone: null }]);
    expect(first.asked).toEqual([]);
  });

  it('refuses a device the App does not have', async () => {
    const voice = await startVoiceEngine();
    const app = await connectApp(voice);

    await expect(chooseFromCli(voice, { microphone: 'mic-z' })).rejects.toThrow(
      /mic-z/,
    );
    expect(app.asked).toEqual([]);
  });
});
