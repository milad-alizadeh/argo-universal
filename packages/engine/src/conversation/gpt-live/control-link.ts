import { WebSocket } from 'ws';
import type { ConversationProviderEvent } from '../provider';
import { CallGone } from './gpt-live-requests';
import { textOfFrame } from './link-events';
import { keepAlive } from './link-keepalive';
import { goneWhy, lostWhy } from './service-close';

// Opens the call's control link again; rejects when the service will not have it.
type RejoinLink = () => Promise<WebSocket>;

export type ControlLinkOptions = {
  rejoin: RejoinLink;
  // How long a lost link may stay down before the call closes as lost.
  lostLinkMs: number;
  // How often the link is checked with a ping.
  pingMs: number;
};

// What the link tells the call it belongs to: each text frame, what it does to the call, and notes for the log.
export interface LinkHost {
  frame: (frame: string) => void;
  event: (event: ConversationProviderEvent) => void;
  note: (note: string) => void;
  ended: () => boolean;
}

const retryMs = 100;

const closeNote = (code: number, reason: Buffer): string => {
  const said = reason.toString('utf8');

  return said === '' ? `link closed ${code}` : `link closed ${code} ${said}`;
};

const messageOf = (error: Error | string): string =>
  typeof error === 'string' ? error : error.message;

/*
 * The call's control link, kept for its whole life. A lost link is joined again until it has been down for
 * `lostLinkMs`, then the call closes as lost; a join already under way settles first, as the service may answer that it
 * no longer has the call, which ends the call at once. A link that stops answering pings is dropped and counts as lost.
 */
export class ControlLink {
  // Only frames that could not be sent are kept, for this provider call's next link.
  private readonly pending: string[] = [];
  private lostTimer: ReturnType<typeof setTimeout> | undefined;
  // A join is under way; the link has been down past `lostLinkMs`.
  private joining = false;
  private overdue = false;
  private stopKeepalive: () => void = () => {};

  public constructor(
    private link: WebSocket,
    private readonly host: LinkHost,
    private readonly options: ControlLinkOptions,
  ) {
    this.attach(link);
  }

  public send(text: string): void {
    if (this.link.readyState === WebSocket.OPEN) this.link.send(text);
    else this.pending.push(text);
  }

  // Anything already sent leaves before the closing frame does.
  public close(): void {
    clearTimeout(this.lostTimer);
    this.pending.length = 0;
    this.stopKeepalive();
    this.link.close();
  }

  private attach(link: WebSocket): void {
    this.link = link;
    link.on('message', (data, isBinary) => {
      if (this.holds(link)) this.host.frame(textOfFrame(data, isBinary));
    });
    link.on('close', (code, reason) =>
      this.onClose(link, closeNote(code, reason)),
    );
    link.on('error', () => {});
    this.stopKeepalive();
    this.stopKeepalive = keepAlive(link, this.options.pingMs, () =>
      this.silent(link),
    );
  }

  private silent(link: WebSocket): void {
    this.host.note(
      `link answered no ping in ${this.options.pingMs} ms; dropped it`,
    );
    link.terminate();
  }

  // Only the link the call holds counts: one replaced or closed with the call says nothing.
  private holds(link: WebSocket): boolean {
    return this.link === link && !this.host.ended();
  }

  private onClose(link: WebSocket, note: string): void {
    if (!this.holds(link)) return;
    this.host.note(note);
    this.host.event({ type: 'status', status: 'disconnected' });
    this.lostTimer ??= setTimeout(() => this.late(), this.options.lostLinkMs);
    this.rejoin();
  }

  private late(): void {
    this.overdue = true;

    if (!this.joining)
      this.host.event({ type: 'closed', reason: 'lost', why: lostWhy });
  }

  private rejoin(): void {
    setTimeout(() => {
      if (!this.host.ended()) void this.joinAgain();
    }, retryMs);
  }

  private async joinAgain(): Promise<void> {
    this.joining = true;
    await this.options.rejoin().then(
      (link) => this.rejoined(link),
      (error: Error | string) => this.refused(error),
    );
    this.joining = false;
  }

  // The service no longer having the call ends it now; any other refusal tries again until the link is overdue.
  private refused(error: Error | string): void {
    this.host.note(`rejoin refused: ${messageOf(error)}`);

    if (error instanceof CallGone)
      return this.host.event({ type: 'closed', reason: 'ended', why: goneWhy });

    if (this.overdue)
      return this.host.event({ type: 'closed', reason: 'lost', why: lostWhy });
    this.rejoin();
  }

  private rejoined(link: WebSocket): void {
    if (this.host.ended()) return link.close();
    clearTimeout(this.lostTimer);
    this.lostTimer = undefined;
    this.overdue = false;
    this.attach(link);

    for (const text of this.pending.splice(0)) this.send(text);
    this.host.event({ type: 'status', status: 'connected' });
  }
}
