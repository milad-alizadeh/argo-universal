import type { VoiceStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { sessionVoice } from './session-voice';
import {
  callIn,
  inputOf,
  statusOf,
  type Asked,
} from './session-voice.test.mocks';

describe("a Session's view of the Voice call", () => {
  it('has no call, and offers the voice button, while none runs', () => {
    const view = sessionVoice(inputOf(statusOf(null), 's1'));

    expect(view.composer).toMatchObject({ usable: true, call: 'none' });
    expect(view.composer.mutes).toBeUndefined();
    expect(view.composer.elsewhere).toBeUndefined();
    expect(view.stage).toBeUndefined();
  });

  it('offers the voice button only while Voice calls are on and the provider is usable', () => {
    const off = statusOf(null, { enabled: false });

    const unusable = statusOf(null, {
      availability: { usable: false, reason: 'No' },
    });

    expect(sessionVoice(inputOf(off, 's1')).composer.usable).toBe(false);
    expect(sessionVoice(inputOf(unusable, 's1')).composer.usable).toBe(false);
  });

  it('shows a call that is connecting here as connecting, with no mutes and a stage that says so', () => {
    const connecting = callIn('s1', {
      status: 'connecting',
      orb: 'none',
      startedAt: null,
    });

    const view = sessionVoice(inputOf(statusOf(connecting), 's1'));

    expect(view.composer.call).toBe('connecting');
    expect(view.composer.mutes).toBeUndefined();
    expect(view.stage).toMatchObject({
      state: 'none',
      label: { headline: 'Connecting…' },
    });
  });

  it('shows a connected call here with mutes, a stage and the call timer', () => {
    const view = sessionVoice(inputOf(statusOf(callIn('s1')), 's1'));

    expect(view.composer.call).toBe('connected');
    expect(view.composer.mutes).toMatchObject({
      microphone: false,
      speaker: false,
    });
    expect(view.stage).toMatchObject({
      state: 'listening',
      label: { headline: 'Listening', detail: 'Voice · 4:12' },
    });
  });

  it('points a Session at the call in another Session, with that Session’s title, and draws no stage', () => {
    const asked: Asked = [];
    const view = sessionVoice(inputOf(statusOf(callIn('s-call')), 's1', asked));

    expect(view.composer.call).toBe('elsewhere');
    expect(view.composer.mutes).toBeUndefined();
    expect(view.composer.elsewhere?.title).toBe('Fix the build');
    expect(view.stage).toBeUndefined();
    view.composer.elsewhere?.onOpen();
    expect(asked).toEqual(['open:s-call']);
  });

  it('names the other Session plainly until its title is known', () => {
    const view = sessionVoice(inputOf(statusOf(callIn('s-unknown')), 's1'));

    expect(view.composer.elsewhere?.title).toBe('another Session');
  });

  it('asks the connection to flip a mute, from what the connection holds', () => {
    const asked: Asked = [];

    const muted = {
      ...inputOf(statusOf(callIn('s1')), 's1', asked),
      mutes: { microphone: true, speaker: false },
    };

    const { mutes } = sessionVoice(muted).composer;
    mutes?.onMicrophone();
    mutes?.onSpeaker();
    expect(mutes).toMatchObject({ microphone: true, speaker: false });
    expect(asked).toEqual(['microphone:false', 'speaker:true']);
  });

  it('draws the same mutes in another Session as in this one, because the connection holds them', () => {
    const muted = { microphone: true, speaker: true };

    const call = statusOf(callIn('s1'));
    const here = sessionVoice({ ...inputOf(call, 's1'), mutes: muted });
    const away = sessionVoice({ ...inputOf(call, 's2'), mutes: muted });
    const back = sessionVoice({ ...inputOf(call, 's1'), mutes: muted });

    expect(here.composer.mutes).toMatchObject(muted);
    expect(away.composer.mutes).toBeUndefined();
    expect(back.composer.mutes).toMatchObject(muted);
  });

  it('starts and ends the call as the person asks', () => {
    const asked: Asked = [];
    const view = sessionVoice(inputOf(statusOf(null), 's1', asked));
    view.composer.onStart();
    view.composer.onEnd();

    expect(asked).toEqual(['start', 'end']);
  });

  it('hands over what is being said only for the Session the call is in', () => {
    const partials: VoiceStatus['partials'] = [
      { speaker: 'person', id: 'p1', text: 'Hello' },
    ];

    const call = statusOf(callIn('s1'), { partials });

    expect(sessionVoice(inputOf(call, 's1')).partials).toBe(partials);
    expect(sessionVoice(inputOf(call, 's2')).partials).toEqual([]);
  });

  it('says trouble and the allowance in the stage label', () => {
    const troubled = callIn('s1', {
      trouble: 'microphone-blocked',
      limit: { remaining: 0.1 },
    });

    const { label } =
      sessionVoice(inputOf(statusOf(troubled), 's1')).stage ?? {};

    expect(label).toEqual({
      headline: 'Microphone blocked',
      detail: 'Voice · 4:12 · 10% left',
    });
  });
});
