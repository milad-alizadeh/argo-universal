import { AppSocketDiagnostics } from '@repo/contracts/app-web-socket';
import { afterEach, expect, it, vi } from 'vitest';

class Socket extends EventTarget {
  public readyState: WebSocket['readyState'] = WebSocket.OPEN;
  public readonly send = vi.fn<(text: string) => void>();
  public close(code: number, reason: string): void {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new CloseEvent('close', { code, reason }));
  }
}

function openSocket(): Socket {
  vi.stubGlobal('WebSocket', { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  const socket = new Socket();

  new AppSocketDiagnostics(socket).start();
  socket.dispatchEvent(new Event('open'));

  return socket;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('allows five seconds for a pong and logs a close caused by the timeout', () => {
  vi.useFakeTimers();
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const socket = openSocket();

  vi.advanceTimersByTime(30_000);
  expect(socket.send).toHaveBeenCalledWith('PING');
  vi.advanceTimersByTime(4999);
  expect(socket.readyState).toBe(WebSocket.OPEN);
  vi.advanceTimersByTime(1);

  expect(log).toHaveBeenCalledWith('App connection closed', {
    side: 'App',
    code: 4000,
    reason: 'App pong timeout',
    pongTimedOut: true,
  });
});

it('keeps the socket after a late pong and reports a Server close frame', () => {
  vi.useFakeTimers();
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  const socket = openSocket();

  vi.advanceTimersByTime(33_000);
  socket.dispatchEvent(new MessageEvent('message', { data: 'PONG' }));
  vi.advanceTimersByTime(2000);
  expect(socket.readyState).toBe(WebSocket.OPEN);
  socket.dispatchEvent(
    new CloseEvent('close', { code: 4001, reason: 'Server pong timeout' }),
  );

  expect(log).toHaveBeenCalledWith('App connection closed', {
    side: 'Server',
    code: 4001,
    reason: 'Server pong timeout',
    pongTimedOut: true,
  });
});
