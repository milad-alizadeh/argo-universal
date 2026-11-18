import { WebSocket } from 'ws';
import type {
  VoiceDelivery,
  VoiceProviderCall,
  VoiceProviderEvent,
} from '../provider';
import { eventOfFrame, textOfFrame } from './link-events';

// Opens the call's control link again; rejects when the service will not have it.
type RejoinLink = () => Promise<WebSocket>;

export type GptLiveCallOptions = {
  answer: string;
  link: WebSocket;
  rejoin: RejoinLink;
  lostLinkMs: number;
};

// What the call says on the control link.
type LinkMessage =
  | {
      type: 'delegation.context.append';
      delegation_id: string;
      channel: string;
      text: string;
    }
  | { type: 'session.context.append'; channel: string; text: string }
  | { type: 'session.close' };

const channelOf = (delivery: VoiceDelivery): string =>
  delivery === 'speak' ? 'speakable' : 'commentary';

const retryMs = 100;

/*
 * One GPT-Live call after the service answered: the control link it keeps for its whole life.
 * The link also carries raw audio, which is dropped unread; audio travels between the App and the service, never through here.
 * A lost link is joined again until it has been down for `lostLinkMs`, then the call closes as lost.
 */
export class GptLiveCall implements VoiceProviderCall {
  public readonly answer: string;
  private readonly listeners = new Set<(event: VoiceProviderEvent) => void>();
  private readonly backlog: VoiceProviderEvent[] = [];
  private link: WebSocket;
  private ended = false;
  private lostTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly options: GptLiveCallOptions) {
    this.answer = options.answer;
    this.link = options.link;
    this.attach(options.link);
  }

  public listen(listener: (event: VoiceProviderEvent) => void): () => void {
    this.listeners.add(listener);

    for (const event of this.backlog.splice(0)) listener(event);

    return () => this.listeners.delete(listener);
  }

  public reply(requestId: string, text: string, delivery: VoiceDelivery): void {
    this.sendOut({
      type: 'delegation.context.append',
      delegation_id: requestId,
      channel: channelOf(delivery),
      text,
    });
  }

  public tell(text: string, delivery: VoiceDelivery): void {
    this.sendOut({
      type: 'session.context.append',
      channel: channelOf(delivery),
      text,
    });
  }

  public end(): void {
    if (this.ended) return;
    this.sendOut({ type: 'session.close' });
    this.finish();
  }

  private emit(event: VoiceProviderEvent): void {
    if (this.ended) return;
    this.deliver(event);

    if (event.type === 'closed') this.finish();
  }

  private deliver(event: VoiceProviderEvent): void {
    if (this.listeners.size === 0) this.backlog.push(event);

    for (const listener of this.listeners) listener(event);
  }

  private finish(): void {
    this.ended = true;
    clearTimeout(this.lostTimer);
    // Anything already sent leaves before the closing frame does.
    this.link.close();
  }

  private sendOut(message: LinkMessage): void {
    if (this.link.readyState === WebSocket.OPEN)
      this.link.send(JSON.stringify(message));
  }

  private attach(link: WebSocket): void {
    this.link = link;
    link.on('message', (data, isBinary) =>
      this.onFrame(textOfFrame(data, isBinary)),
    );
    link.on('close', () => this.onClose(link));
    link.on('error', () => {});
  }

  private onFrame(frame: string): void {
    const event = eventOfFrame(frame);

    if (event) this.emit(event);
  }

  private onClose(link: WebSocket): void {
    if (this.link === link) this.lose();
  }

  private lose(): void {
    if (this.ended) return;
    this.emit({ type: 'status', status: 'disconnected' });
    this.lostTimer ??= setTimeout(
      () => this.emit({ type: 'closed', reason: 'lost' }),
      this.options.lostLinkMs,
    );
    this.rejoin();
  }

  private rejoin(): void {
    setTimeout(() => {
      if (!this.ended) void this.joinAgain();
    }, retryMs);
  }

  private async joinAgain(): Promise<void> {
    try {
      this.rejoined(await this.options.rejoin());
    } catch {
      this.rejoin();
    }
  }

  private rejoined(link: WebSocket): void {
    if (this.ended) return link.close();
    clearTimeout(this.lostTimer);
    this.lostTimer = undefined;
    this.attach(link);
    this.emit({ type: 'status', status: 'connected' });
  }
}
