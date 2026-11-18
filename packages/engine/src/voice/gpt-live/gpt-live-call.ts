import type { WebSocket } from 'ws';
import type {
  VoiceDelivery,
  VoiceProviderCall,
  VoiceProviderEvent,
} from '../provider';
import { eventOfFrame } from './link-events';

// Opens the call's control link again; rejects when the service will not have it.
export type RejoinLink = () => Promise<WebSocket>;

export type GptLiveCallOptions = {
  answer: string;
  link: WebSocket;
  rejoin: RejoinLink;
  lostLinkMs: number;
};

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
  private ended = false;
  private lostTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly options: GptLiveCallOptions) {
    this.answer = options.answer;
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

    if (this.listeners.size === 0) this.backlog.push(event);

    for (const listener of this.listeners) listener(event);

    if (event.type === 'closed') this.finish();
  }

  private finish(): void {
    this.ended = true;
    clearTimeout(this.lostTimer);
    // Let `session.close` leave before the link goes.
    const link = this.currentLink;
    setTimeout(() => link?.close(), 50);
  }

  private currentLink: WebSocket | undefined;

  private sendOut(message: Record<string, unknown>): void {
    if (this.currentLink?.readyState === 1)
      this.currentLink.send(JSON.stringify(message));
  }

  private attach(link: WebSocket): void {
    this.currentLink = link;
    link.on('message', (data, isBinary) => {
      // Audio frames are dropped unread.
      if (isBinary) return;
      const event = eventOfFrame(data.toString());

      if (event) this.emit(event);
    });
    link.on('close', () => {
      if (this.currentLink === link) this.lose();
    });
    link.on('error', () => {});
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
      if (this.ended) return;
      this.options.rejoin().then(
        (link) => this.rejoined(link),
        () => this.rejoin(),
      );
    }, retryMs);
  }

  private rejoined(link: WebSocket): void {
    if (this.ended) return link.close();
    clearTimeout(this.lostTimer);
    this.lostTimer = undefined;
    this.attach(link);
    this.emit({ type: 'status', status: 'connected' });
  }
}
