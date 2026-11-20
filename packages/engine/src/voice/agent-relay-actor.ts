import { fromCallback } from 'xstate';
import { AgentRelay, type RelayReports } from './agent-relay';
import type { SendBack, VoiceCallEvent, VoiceSay } from './call-types';
import type { VoiceProviderEvent } from './provider';
import { ScreenLook } from './screen-look';
import type { VoiceSessions } from './session-link';
import { isTranscript, type TranscriptEvent } from './transcript';

export type RelayInput = {
  sessions: VoiceSessions;
  sessionId: string;
  // Whether the call's provider can be given an image.
  images: boolean;
};

const personSpoke = (words: TranscriptEvent): boolean =>
  words.type === 'person.transcript';

const finalWords = (heard: VoiceProviderEvent): TranscriptEvent | null =>
  isTranscript(heard) && heard.final ? heard : null;

// What each side said once it is final: the voice's own words reset the person's ask for a picture.
function listen(look: ScreenLook, heard: VoiceProviderEvent): void {
  const words = finalWords(heard);

  if (!words) return;

  if (personSpoke(words)) look.personSpoke();
  else look.voiceSpoke();
}

type Hearers = { relay: AgentRelay; look: ScreenLook };

function hear({ relay, look }: Hearers, heard: VoiceProviderEvent): void {
  if (heard.type === 'work.requested')
    void relay.request(heard.requestId, heard.text);

  if (heard.type === 'frame.requested') void look.answer(heard.requestId);
  listen(look, heard);
}

// What the machine forwards: the person's requests for work, the voice's for a picture, and what each side said.
function route(hearers: Hearers, event: VoiceCallEvent): void {
  if (event.type === 'provider.event') hear(hearers, event.event);
}

const reportsTo = (sendBack: SendBack): RelayReports => ({
  speak: (say: VoiceSay): void => sendBack({ type: 'voice.say', say }),
  turnsRunning: (running: boolean): void =>
    sendBack({ type: 'call.turns', running }),
});

/*
 * The go-between of one Voice call and its Session. The machine forwards the person's requests for work to it; it sends
 * back what the voice should be told, as `voice.say`.
 */
export const agentRelay = fromCallback<VoiceCallEvent, RelayInput>(
  ({ input, sendBack, receive }) => {
    const { sessions } = input;

    const reports = reportsTo(sendBack);
    const relay = new AgentRelay(sessions, input, reports);
    const look = new ScreenLook(sessions, input, reports.speak);

    receive((event) => route({ relay, look }, event));

    return sessions.watch(input.sessionId, (happening) =>
      relay.happened(happening),
    );
  },
);
