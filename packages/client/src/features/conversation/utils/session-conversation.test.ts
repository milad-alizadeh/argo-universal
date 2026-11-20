import type { ConversationStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { ComposerConversationMutes } from '#features/composer';
import { sessionConversation, type SessionConversation } from './session-conversation';
import {
  callIn,
  inputOf,
  press,
  statusOf,
  type Asked,
} from './session-conversation.test.mocks';

const mutesOf = ({ composer }: SessionConversation): ComposerConversationMutes | undefined =>
  composer?.kind === 'connected' ? composer.mutes : undefined;

describe("a Session's view of the Conversation", () => {
  it('has no call, and offers the voice button, while none runs', () => {
    const view = sessionConversation(inputOf(statusOf(null), 's1'));

    expect(view.composer?.kind).toBe('start');
    expect(view.band).toBeUndefined();
  });

  it('offers the voice button only while Conversations are on and the provider is usable', () => {
    const off = statusOf(null, { enabled: false });

    const unusable = statusOf(null, {
      availability: { usable: false, reason: 'No' },
    });

    expect(sessionConversation(inputOf(off, 's1')).composer).toBeUndefined();
    expect(sessionConversation(inputOf(unusable, 's1')).composer).toBeUndefined();
  });

  it.each(['connecting', 'connected'] as const)(
    'keeps a %s call in the slot even while the provider is no longer usable',
    (status) => {
      const unusable = statusOf(callIn('s1', { status }), {
        availability: { usable: false, reason: 'No' },
      });

      expect(sessionConversation(inputOf(unusable, 's1')).composer?.kind).toBe(status);
    },
  );

  it('shows a call that is connecting here as connecting, with no mutes and a band that says so', () => {
    const connecting = callIn('s1', {
      status: 'connecting',
      state: 'none',
      startedAt: null,
    });

    const view = sessionConversation(inputOf(statusOf(connecting), 's1'));

    expect(view.composer).toEqual({
      kind: 'connecting',
      onEnd: expect.any(Function),
    });
    expect(view.band).toMatchObject({
      call: { state: 'none', trouble: null },
      elapsed: '0:00',
    });
  });

  it('shows a connected call here with mutes and a band that has its timer', () => {
    const view = sessionConversation(inputOf(statusOf(callIn('s1')), 's1'));

    expect(view.composer).toMatchObject({
      kind: 'connected',
      mutes: { microphone: false, speaker: false },
    });
    expect(view.band).toMatchObject({
      call: { state: 'listening' },
      elapsed: '4:12',
    });
  });

  it('gives the edge band the call, its timer and whether the microphone is muted, only here', () => {
    const input = inputOf(statusOf(callIn('s1', { state: 'talking' })), 's1');
    const muted = { ...input, mutes: { microphone: true, speaker: false } };

    expect(sessionConversation(muted).band).toMatchObject({
      call: { state: 'talking', trouble: null, microphoneMuted: true },
      elapsed: '4:12',
    });
    expect(
      sessionConversation(inputOf(statusOf(callIn('s-call')), 's1')).band,
    ).toBeUndefined();
  });

  it('points a Session at the call in another Session, with that Session’s title, and draws no band', () => {
    const asked: Asked = [];
    const view = sessionConversation(inputOf(statusOf(callIn('s-call')), 's1', asked));

    expect(view.composer).toEqual({
      kind: 'elsewhere',
      title: 'Fix the build',
      onOpen: expect.any(Function),
    });
    press(view.composer);

    expect(asked).toEqual(['open:s-call']);
  });

  it('names the other Session plainly until its title is known', () => {
    const view = sessionConversation(inputOf(statusOf(callIn('s-unknown')), 's1'));

    expect(view.composer).toMatchObject({ title: 'another Session' });
  });

  it('asks the connection to flip a mute, from what the connection holds', () => {
    const asked: Asked = [];

    const muted = {
      ...inputOf(statusOf(callIn('s1')), 's1', asked),
      mutes: { microphone: true, speaker: false },
    };

    const mutes = mutesOf(sessionConversation(muted));
    mutes?.onMicrophone();
    mutes?.onSpeaker();
    expect(mutes).toMatchObject({ microphone: true, speaker: false });
    expect(asked).toEqual(['microphone:false', 'speaker:true']);
  });

  it('draws the same mutes in another Session as in this one, because the connection holds them', () => {
    const muted = { microphone: true, speaker: true };

    const call = statusOf(callIn('s1'));
    const here = sessionConversation({ ...inputOf(call, 's1'), mutes: muted });
    const away = sessionConversation({ ...inputOf(call, 's2'), mutes: muted });
    const back = sessionConversation({ ...inputOf(call, 's1'), mutes: muted });

    expect(mutesOf(here)).toMatchObject(muted);
    expect(away.composer?.kind).toBe('elsewhere');
    expect(mutesOf(back)).toMatchObject(muted);
  });

  it('starts and ends the call as the person asks', () => {
    const asked: Asked = [];
    const idle = sessionConversation(inputOf(statusOf(null), 's1', asked)).composer;
    press(idle);
    const running = sessionConversation(inputOf(statusOf(callIn('s1')), 's1', asked));
    press(running.composer);

    expect(asked).toEqual(['start', 'end']);
  });

  it('hands over what is being said only for the Session the call is in', () => {
    const partials: ConversationStatus['partials'] = [
      { speaker: 'person', id: 'p1', rowId: 'call-1:person:p1', text: 'Hello' },
    ];

    const call = statusOf(callIn('s1'), { partials });

    expect(sessionConversation(inputOf(call, 's1')).partials).toBe(partials);
    expect(sessionConversation(inputOf(call, 's2')).partials).toEqual([]);
  });
});
