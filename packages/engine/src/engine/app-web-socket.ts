import {
  abnormalSocketClosure,
  appPongTimeout,
  AppSocketKeepalive,
  serverPongTimeout,
  serverStopping,
} from '@repo/contracts/app-web-socket';
import { WebSocket } from 'ws';

const closeFrameWaitMs = 250;

type ServerClose = typeof serverStopping | typeof serverPongTimeout;

type CloseReport = {
  localReason: ServerClose | undefined;
  code: number;
  reason: Buffer;
};

function closeLine({ localReason, code, reason }: CloseReport): string {
  const peer = code === abnormalSocketClosure ? 'unknown' : 'App';

  return `App connection closed ${JSON.stringify({
    side: localReason ? 'Server' : peer,
    code,
    reason: localReason?.reason ?? reason.toString('utf8'),
    pongTimedOut:
      localReason === serverPongTimeout || code === appPongTimeout.code,
  })}`;
}

export class AppSocketDiagnostics {
  private localReason: ServerClose | undefined;
  private readonly keepalive = new AppSocketKeepalive({
    ping: (): boolean => this.sendPing(),
    timedOut: (): void => this.pongMissing(),
  });
  private forceClose: ReturnType<typeof setTimeout> | undefined;

  public constructor(
    private readonly socket: WebSocket,
    log: (line: string) => void,
  ) {
    socket.on('pong', () => this.keepalive.heard(true));
    socket.on('message', () => this.keepalive.heard());
    socket.once('close', (code, reason) => {
      this.clearTimers();
      log(closeLine({ localReason: this.localReason, code, reason }));
    });
    this.keepalive.heard();
  }

  public stop(): void {
    if (this.socket.readyState === WebSocket.CLOSING && !this.localReason) {
      this.socket.terminate();

      return;
    }

    this.close(serverStopping);
  }

  private clearTimers(): void {
    this.keepalive.stop();
    clearTimeout(this.forceClose);
  }

  private sendPing(): boolean {
    if (this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.ping();

    return true;
  }

  private pongMissing(): void {
    this.close(serverPongTimeout);
  }

  private close(cause: ServerClose): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.localReason = cause;
    this.socket.close(cause.code, cause.reason);
    this.forceClose = setTimeout(
      () => this.socket.terminate(),
      closeFrameWaitMs,
    );
  }
}
