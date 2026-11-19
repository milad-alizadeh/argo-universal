import { WebSocket } from 'ws';

/*
 * Pings the control link and calls `silent` when a ping goes unanswered until the next one is due.
 * The service answers pings at once and sends none of its own (#2405 probe, 2026-11-19), and Codex sends none either; but a
 * link whose network went away without a close (a Mac that slept, a changed Wi-Fi) never closes on its own, so the call
 * would stay "connected" with no one listening. A missed pong turns that into a lost link, which is joined again.
 * `ws` answers the service's pings by itself, so nothing is needed the other way.
 */
class Keepalive {
  private answered = true;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly heard = (): void => {
    this.answered = true;
  };

  public constructor(
    private readonly link: WebSocket,
    everyMs: number,
    private readonly silent: () => void,
  ) {
    link.on('pong', this.heard);
    this.timer = setInterval(() => this.due(), everyMs);
  }

  public stop(): void {
    clearInterval(this.timer);
    this.link.off('pong', this.heard);
  }

  private due(): void {
    if (!this.answered) return this.silent();
    this.answered = false;

    if (this.link.readyState === WebSocket.OPEN) this.link.ping();
  }
}

// Keeps checking the link until the returned function stops it.
export function keepAlive(
  link: WebSocket,
  everyMs: number,
  silent: () => void,
): () => void {
  const keepalive = new Keepalive(link, everyMs, silent);

  return (): void => keepalive.stop();
}
