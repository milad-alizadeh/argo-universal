// Application close codes shared between the App and the Server.
export const appPongTimeout = {
  code: 4000,
  reason: 'App pong timeout',
} as const;

export const serverPongTimeout = {
  code: 4001,
  reason: 'Server pong timeout',
} as const;

export const serverStopping = {
  code: 4002,
  reason: 'Server stopping',
} as const;

export const abnormalSocketClosure = 1006;

const pingMs = 30_000;

const pongWaitMs = 5000;

interface KeepalivePort {
  // Returns false when the socket has already started closing.
  ping: () => boolean;
  timedOut: () => void;
}

// Both endpoints use the same timing. The transport decides how to send a ping and close.
export class AppSocketKeepalive {
  private ping: ReturnType<typeof setTimeout> | undefined;
  private deadline: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly port: KeepalivePort) {}

  public heard(isPong = false): void {
    if (isPong) {
      clearTimeout(this.deadline);
      this.deadline = undefined;
    }

    if (this.deadline === undefined) this.schedule();
  }

  public stop(): void {
    clearTimeout(this.ping);
    clearTimeout(this.deadline);
  }

  private schedule(): void {
    clearTimeout(this.ping);
    this.ping = setTimeout(() => this.sendPing(), pingMs);
  }

  private sendPing(): void {
    if (this.port.ping())
      this.deadline = setTimeout(this.port.timedOut, pongWaitMs);
  }
}

type AppSocket = Pick<
  WebSocket,
  'addEventListener' | 'close' | 'readyState' | 'send'
>;

function reportClose(
  byApp: boolean,
  pongTimedOut: boolean,
  { code, reason }: CloseEvent,
): void {
  const fromServer =
    code === serverStopping.code || code === serverPongTimeout.code;

  const peer = code === abnormalSocketClosure ? 'unknown' : 'Server';

  console.info('App connection closed', {
    side: byApp && !fromServer ? 'App' : peer,
    code,
    reason,
    pongTimedOut: pongTimedOut || code === serverPongTimeout.code,
  });
}

// tRPC still answers incoming text pings. Owning our timer lets us report why we close.
export class AppSocketDiagnostics {
  private readonly keepalive = new AppSocketKeepalive({
    ping: (): boolean => this.sendPing(),
    timedOut: (): void => this.pongMissing(),
  });
  private closedByApp = false;
  private pongTimedOut = false;

  public constructor(private readonly socket: AppSocket) {}

  public start(): void {
    const { socket } = this;

    this.observeClose();
    socket.addEventListener('open', () => this.keepalive.heard());
    socket.addEventListener('message', ({ data }) =>
      this.keepalive.heard(data === 'PONG'),
    );
  }

  private observeClose(): void {
    const { socket } = this;
    const close = socket.close.bind(socket);

    socket.close = (code, reason): void => {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      )
        this.closedByApp = true;
      close(code, reason);
    };

    socket.addEventListener('close', (event) => {
      this.keepalive.stop();
      reportClose(this.closedByApp, this.pongTimedOut, event);
    });
  }

  private sendPing(): boolean {
    if (this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send('PING');

    return true;
  }

  private pongMissing(): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.pongTimedOut = true;
    this.socket.close(appPongTimeout.code, appPongTimeout.reason);
  }
}

export const observedAppSocket = (Socket: typeof WebSocket): typeof WebSocket =>
  new Proxy(Socket, {
    construct: (
      target,
      [url, protocols]: ConstructorParameters<typeof WebSocket>,
    ) => {
      const socket = new target(url, protocols);
      new AppSocketDiagnostics(socket).start();

      return socket;
    },
  });
