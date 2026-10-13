import { createServer, type Socket } from 'node:net';
import type { AgentLaunch, LoginTerminalProcess } from '../agents';
import {
  createTerminalChannelPath,
  removeTerminalChannelPath,
} from './terminal-channel-path';
import type { TerminalControlMessage } from './terminal-control-message';
import {
  observeTerminalControl,
  rejectTerminalControl,
} from './terminal-control-reader';
const startupTimeout = 5000;
export class TerminalChannel {
  private readonly ready = Promise.withResolvers<void>();
  private readonly result =
    Promise.withResolvers<Awaited<LoginTerminalProcess['exited']>>();
  private readonly server = createServer((socket) => this.accept(socket));
  private readonly sockets = new Set<Socket>();
  private socket?: Socket;
  private closing?: Promise<void>;
  private ownsPath = false;
  public constructor(private readonly token: string) {
    void this.result.promise.catch(() => {});
    void this.ready.promise.catch(() => {});
  }
  public exited(): LoginTerminalProcess['exited'] {
    return this.result.promise;
  }
  public async listen(): Promise<string> {
    const path = await createTerminalChannelPath(this.token);
    this.ownsPath = true;
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(path, () => resolve(path));
    });
  }
  public async launch(launch: AgentLaunch): Promise<void> {
    const timer = setTimeout(
      () => this.ready.reject(new Error('Terminal control did not connect')),
      startupTimeout,
    );
    try {
      await this.ready.promise;
      this.socket?.write(`${JSON.stringify(launchMessage(launch))}\n`);
    } finally {
      clearTimeout(timer);
    }
  }
  public close(): Promise<void> {
    this.closing ??= this.dispose();
    return this.closing;
  }
  private async dispose(): Promise<void> {
    this.stopListening();
    for (const socket of this.sockets) socket.destroy();
    this.ready.reject(new Error('Terminal control closed'));
    this.result.reject(new Error('Terminal control closed'));
    if (this.ownsPath) await removeTerminalChannelPath(this.token);
  }
  private stopListening(): void {
    if (this.server.listening) this.server.close();
  }
  private accept(socket: Socket): void {
    this.sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.on('close', () => this.disconnected(socket));
    observeTerminalControl(socket, (message) => this.message(socket, message));
  }
  private message(socket: Socket, message: TerminalControlMessage): void {
    if (message.type === 'ready') return this.claim(socket, message.token);
    if (socket !== this.socket) {
      rejectTerminalControl(socket);
      return;
    }
    this.result.resolve({ exitCode: message.exitCode, signal: message.signal });
  }
  private claim(socket: Socket, token: string): void {
    if (token !== this.token || this.socket) {
      rejectTerminalControl(socket);
      return;
    }
    this.socket = socket;
    this.server.close();
    this.ready.resolve();
  }
  private disconnected(socket: Socket): void {
    this.sockets.delete(socket);
    if (socket === this.socket)
      this.result.reject(new Error('Terminal control disconnected'));
  }
}
const launchMessage = (launch: AgentLaunch): object => ({
  executable: launch.executable,
  args: launch.args,
  cwd: launch.cwd,
  env: { TERM: 'xterm-256color', ...launch.env },
});
