import { onlineManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { holdCacheOnline } from './cache-online.ts';
import { type FakeLink, fakeLink } from './connection.mocks.ts';

const stops: (() => void)[] = [];

const links: FakeLink[] = [];

// A Connection the test drives, as one Server's Connection behaves.
function server(): FakeLink {
  const link = fakeLink();
  links.push(link);

  return link;
}

const lose = (link: FakeLink): void => {
  link.open();
  link.lose();
};

beforeEach(() => {
  onlineManager.setOnline(true);
});

afterEach(() => {
  for (const stop of stops.splice(0)) stop();

  for (const link of links.splice(0)) link.connection.stop();

  onlineManager.setOnline(true);
});

const hold = (link: FakeLink): void =>
  void stops.push(holdCacheOnline(link.connection));

describe('The cache of the Server being looked at', () => {
  it('goes offline while that Server is unreachable and online again when it answers', () => {
    const looked = server();
    hold(looked);

    lose(looked);
    expect(onlineManager.isOnline()).toBe(false);

    looked.open();
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('stays online while another Server is unreachable', () => {
    const looked = server();
    const other = server();
    hold(looked);
    looked.open();

    lose(other);

    expect(onlineManager.isOnline()).toBe(true);
  });

  it('stays offline when another Server closes while the looked-at Server is still down', () => {
    const looked = server();
    const other = server();
    hold(looked);
    lose(looked);

    other.connection.stop();

    expect(onlineManager.isOnline()).toBe(false);
  });

  it('leaves the cache online once the App looks at another Server', () => {
    const looked = server();
    hold(looked);
    lose(looked);

    for (const stop of stops.splice(0)) stop();

    expect(onlineManager.isOnline()).toBe(true);
  });
});
