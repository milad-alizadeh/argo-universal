import type { ScreenImage } from '@repo/contracts/operations';
import { fromCallback } from 'xstate';
import {
  providerEvent,
  type SendBack,
  type VoiceCallEvent,
  type VoiceSay,
} from './call-types';
import type {
  VoiceCallSetup,
  VoiceProvider,
  VoiceStartRequest,
} from './provider';

export type ProviderCallInput = {
  provider: VoiceProvider;
  offer: string;
  briefing: string;
  setup?: VoiceCallSetup;
};

type StartedCall = Awaited<ReturnType<VoiceProvider['start']>>;

// A call that cannot look is never given an image: the Engine does not capture for it.
const deliverImage = (call: StartedCall, image: ScreenImage): void =>
  call.look?.(image);

function deliver(call: StartedCall, say: VoiceSay): void {
  if (say.kind === 'reply') call.reply(say.requestId, say.text, say.delivery);
  else if (say.kind === 'tell') call.tell(say.text, say.delivery);
  else deliverImage(call, say.image);
}

// The provider's call, from the moment it answers to the moment the machine stops wanting it.
class ProviderHold {
  private released = false;
  private call: StartedCall | undefined;
  // What the voice was told before the provider answered, such as a Started Session already waiting on the person.
  private readonly early: VoiceSay[] = [];
  private unlisten: (() => void) | undefined;

  public constructor(private readonly sendBack: SendBack) {}

  public adopt(call: StartedCall): void {
    if (this.released) return call.end();
    this.call = call;
    this.unlisten = call.listen((event) => this.sendBack(providerEvent(event)));
    this.sendBack({
      type: 'call.answered',
      answer: call.answer,
      canLook: call.look !== undefined,
    });

    for (const say of this.early.splice(0)) deliver(call, say);
  }

  // Tells the voice something, once the provider has answered; a call that is gone hears nothing.
  public say(say: VoiceSay): void {
    if (this.released) return;

    if (this.call) deliver(this.call, say);
    else this.early.push(say);
  }

  public fail(error: Error): void {
    if (!this.released)
      this.sendBack({ type: 'call.failed', message: error.message });
  }

  public release(): void {
    this.released = true;
    this.unlisten?.();
    this.call?.end();
  }
}

const asError = (error: Error | string): Error =>
  typeof error === 'string' ? new Error(error) : error;

const requestOf = ({
  offer,
  briefing,
  setup,
}: ProviderCallInput): VoiceStartRequest => ({ ...setup, offer, briefing });

// Starts the provider's call, passes its events on, and ends it when the machine leaves `running`.
export const providerCall = fromCallback<VoiceCallEvent, ProviderCallInput>(
  ({ input, sendBack, receive }) => {
    const hold = new ProviderHold(sendBack);
    receive((event) => {
      if (event.type === 'voice.say') hold.say(event.say);
    });
    void input.provider.start(requestOf(input)).then(
      (call) => hold.adopt(call),
      (error: Error | string) => hold.fail(asError(error)),
    );

    return (): void => hold.release();
  },
);
