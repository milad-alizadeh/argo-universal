import type { WebSocket } from 'ws';
import type {
  VoiceDelivery,
  ConversationProviderCall,
  ConversationProviderEvent,
} from '../provider';
import { ControlLink, type ControlLinkOptions } from './control-link';
import { LinkReader } from './link-events';
import { LinkTrail } from './link-trail';
import { longestWhy } from './service-close';

export type GptLiveCallOptions = ControlLinkOptions & {
  answer: string;
  link: WebSocket;
};

type LinkContent = [{ type: 'input_text'; text: string }];

// What the call says on the control link, as Codex writes it (codex-rs realtime_websocket/protocol.rs, RealtimeOutboundMessage).
type LinkMessage =
  | {
      type: 'delegation.context.append';
      delegation_item_id: string;
      channel: string;
      content: LinkContent;
    }
  | { type: 'session.context.append'; channel: string; content: LinkContent }
  | { type: 'session.close' };

const channelOf = (delivery: VoiceDelivery): string =>
  delivery === 'speak' ? 'speakable' : 'commentary';

// The most bytes one context append carries; Codex sends longer text in pieces (methods_frameless_bidi.rs, CONTEXT_APPEND_MAX_BYTES).
const appendMaxBytes = 500;

// Text in pieces of at most `appendMaxBytes` UTF-8 bytes, never splitting a character.
function piecesOf(text: string): LinkContent[] {
  const pieces: LinkContent[] = [];
  let piece = '';

  for (const character of text) {
    if (Buffer.byteLength(piece + character) > appendMaxBytes) {
      pieces.push([{ type: 'input_text', text: piece }]);
      piece = '';
    }

    piece += character;
  }

  return [...pieces, [{ type: 'input_text', text: piece }]];
}

// A close on the call's expiry is the call reaching its longest, whatever the service called it.
const onTime = (event: ConversationProviderEvent): ConversationProviderEvent =>
  event.type === 'closed' && event.reason === 'ended'
    ? { ...event, why: longestWhy }
    : event;

/*
 * One GPT-Live call after the service answered, over the control link it keeps for its whole life.
 * The link also carries raw audio, which is dropped unread; audio travels between the App and the service, never through here.
 * What happens to the link goes to the call's trail, for the Server's log.
 */
export class GptLiveCall implements ConversationProviderCall {
  public readonly answer: string;
  private readonly listeners = new Set<(event: ConversationProviderEvent) => void>();
  private readonly backlog: ConversationProviderEvent[] = [];
  private readonly reader = new LinkReader();
  private readonly trail = new LinkTrail();
  private readonly link: ControlLink;
  private ended = false;
  private lastNote: string | undefined;

  public constructor(options: GptLiveCallOptions) {
    this.answer = options.answer;
    this.link = new ControlLink(
      options.link,
      {
        frame: (frame): void => this.onFrame(frame),
        event: (event): void => this.emit(event),
        note: (note): void => this.note(note),
        ended: (): boolean => this.ended,
      },
      options,
    );
  }

  public listen(listener: (event: ConversationProviderEvent) => void): () => void {
    this.listeners.add(listener);

    for (const event of this.backlog.splice(0)) listener(event);

    return () => this.listeners.delete(listener);
  }

  public reply(requestId: string, text: string, delivery: VoiceDelivery): void {
    for (const content of piecesOf(text))
      this.sendOut({
        type: 'delegation.context.append',
        delegation_item_id: requestId,
        channel: channelOf(delivery),
        content,
      });
  }

  public tell(text: string, delivery: VoiceDelivery): void {
    for (const content of piecesOf(text))
      this.sendOut({
        type: 'session.context.append',
        channel: channelOf(delivery),
        content,
      });
  }

  // Hanging up keeps what was said so far: the turns still open are settled before the call ends.
  public end(): void {
    if (this.ended) return;

    for (const event of this.reader.closing()) this.emit(event);
    this.sendOut({ type: 'session.close' });
    this.finish();
  }

  private emit(event: ConversationProviderEvent): void {
    if (this.ended) return;
    this.deliver(event);

    if (event.type === 'closed') this.finish();
  }

  private deliver(event: ConversationProviderEvent): void {
    if (this.listeners.size === 0) this.backlog.push(event);

    for (const listener of this.listeners) listener(event);
  }

  // A note repeated back to back, as each refused join is, is kept once.
  private note(note: string): void {
    if (note === this.lastNote) return;
    this.lastNote = note;
    this.emit({ type: 'trail', note });
  }

  private finish(): void {
    this.ended = true;
    this.link.close();
  }

  private sendOut(message: LinkMessage): void {
    this.link.send(JSON.stringify(message));
  }

  private onFrame(frame: string): void {
    for (const note of this.trail.read(frame)) this.note(note);

    for (const event of this.reader.read(frame)) this.emit(this.timed(event));
  }

  private timed(event: ConversationProviderEvent): ConversationProviderEvent {
    return this.trail.expired(Date.now()) ? onTime(event) : event;
  }
}
