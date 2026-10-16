import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type FakeNotificationClient,
  fakeNotificationClient,
  heartbeatMs,
  ready,
  turnEnded,
} from '../../../mocks/notifications/notification-consumer.mocks';
import { NotificationConsumer } from './notification-consumer';

let server: FakeNotificationClient;

let shown: string[];

let showResult: boolean;

let consumer: NotificationConsumer;

beforeEach(() => {
  vi.useFakeTimers();
  server = fakeNotificationClient();
  shown = [];
  showResult = true;
  consumer = new NotificationConsumer(server.client, (notification) => {
    if (showResult) shown.push(notification.id);

    return showResult;
  });
  consumer.start();
});

afterEach(() => {
  consumer.stop();
  vi.useRealTimers();
});

describe('NotificationConsumer attention', () => {
  it('reports nothing until the stream is ready', () => {
    consumer.attention('session-a');

    expect(server.attentionReports).toEqual([]);
  });

  it('reports the current attention when the stream becomes ready', () => {
    consumer.attention('session-a');
    consumer.receive(ready);

    expect(server.attentionReports).toEqual(['session-a']);
  });

  it('reports a change of attention after ready', () => {
    consumer.receive(ready);
    consumer.attention('session-a');
    consumer.attention(null);

    expect(server.attentionReports).toEqual([null, 'session-a', null]);
  });

  it('repeats the report every heartbeat while ready', () => {
    consumer.attention('session-a');
    consumer.receive(ready);
    vi.advanceTimersByTime(heartbeatMs * 2);

    expect(server.attentionReports).toEqual([
      'session-a',
      'session-a',
      'session-a',
    ]);
  });

  it('reports nothing after a disconnect', () => {
    consumer.attention('session-a');
    consumer.receive(ready);
    consumer.disconnected();
    vi.advanceTimersByTime(heartbeatMs * 3);
    consumer.attention('session-b');

    expect(server.attentionReports).toEqual(['session-a']);
  });

  it('reports again when the stream is ready after a reconnect', () => {
    consumer.attention('session-a');
    consumer.receive(ready);
    consumer.disconnected();
    consumer.receive(ready);

    expect(server.attentionReports).toEqual(['session-a', 'session-a']);
  });

  it('keeps a single heartbeat when ready arrives twice', () => {
    consumer.receive(ready);
    consumer.receive(ready);
    vi.advanceTimersByTime(heartbeatMs);

    expect(server.attentionReports).toHaveLength(3);
  });

  it('stops reporting when the consumer stops', () => {
    consumer.receive(ready);
    consumer.stop();
    vi.advanceTimersByTime(heartbeatMs * 2);

    expect(server.attentionReports).toEqual([null]);
  });

  it('keeps the heartbeat after a failed report', async () => {
    server.failCalls();
    consumer.receive(ready);
    await vi.advanceTimersByTimeAsync(heartbeatMs);

    expect(server.attentionReports).toEqual([null, null]);
  });
});

describe('NotificationConsumer delivery', () => {
  it('acknowledges a Notification it showed', () => {
    consumer.receive(turnEnded('n1'));

    expect(shown).toEqual(['n1']);
    expect(server.acknowledged).toEqual(['n1']);
  });

  it('shows a Notification even before the stream is ready', () => {
    consumer.receive(turnEnded('n1'));

    expect(server.attentionReports).toEqual([]);
    expect(shown).toEqual(['n1']);
  });

  it('does not acknowledge a Notification that was not shown', () => {
    showResult = false;
    consumer.receive(turnEnded('n1'));

    expect(shown).toEqual([]);
    expect(server.acknowledged).toEqual([]);
  });

  it('shows a redelivered Notification that failed to show before', () => {
    showResult = false;
    consumer.receive(turnEnded('n1'));
    showResult = true;
    consumer.receive(turnEnded('n1'));

    expect(shown).toEqual(['n1']);
    expect(server.acknowledged).toEqual(['n1']);
  });

  it('re-acknowledges a duplicate without showing it again', () => {
    consumer.receive(turnEnded('n1'));
    consumer.receive(turnEnded('n1'));

    expect(shown).toEqual(['n1']);
    expect(server.acknowledged).toEqual(['n1', 'n1']);
  });

  it('treats the same id on another Server as a new Notification', () => {
    consumer.receive(turnEnded('n1', 'server-1'));
    consumer.receive(turnEnded('n1', 'server-2'));

    expect(shown).toEqual(['n1', 'n1']);
  });

  it('still shows a Notification when its acknowledgement fails', async () => {
    server.failCalls();
    consumer.receive(turnEnded('n1'));
    await vi.advanceTimersByTimeAsync(0);

    expect(shown).toEqual(['n1']);
  });

  it('ignores events after stop', () => {
    consumer.stop();
    consumer.receive(turnEnded('n1'));
    consumer.receive(ready);

    expect(shown).toEqual([]);
    expect(server.attentionReports).toEqual([]);
  });

  it('remembers only the most recent 2048 shown Notifications', () => {
    for (let index = 0; index <= 2048; index += 1) {
      consumer.receive(turnEnded(`n${index}`));
    }

    consumer.receive(turnEnded('n2048'));
    consumer.receive(turnEnded('n0'));

    expect(shown.filter((id) => id === 'n2048')).toHaveLength(1);
    expect(shown.filter((id) => id === 'n0')).toHaveLength(2);
  });
});
