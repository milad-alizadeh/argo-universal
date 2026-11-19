import { describe, expect, it } from 'vitest';
import { PromptWatch } from './prompt-turn';
import { StubSession, ended, queue, taken } from './prompt-turn.test.mocks';

const stillRunning = 'still running';

// What the Prompt's Turn settled with, or `stillRunning` while it has not ended.
const settled = (end: Promise<string | null>): Promise<string | null> =>
  Promise.race([
    end,
    new Promise<string>((resolve) =>
      setTimeout(() => resolve(stillRunning), 0),
    ),
  ]);

describe('a Prompt in a Turn', () => {
  it('ends with its Turn, and not while the Turn runs', async () => {
    const session = new StubSession();
    const end = new PromptWatch(session).ended({ turnId: 't1' });

    session.changeQueue(queue('other'));
    expect(await settled(end)).toBe(stillRunning);

    session.report(ended('t1'));
    expect(await end).toBe('t1');
    expect(session.watched).toBe(false);
  });

  it("keeps running through another Turn's end", async () => {
    const session = new StubSession();
    const end = new PromptWatch(session).ended({ turnId: 't1' });

    session.report(ended('t0'));
    expect(await settled(end)).toBe(stillRunning);

    session.report(ended('t1'));
    expect(await end).toBe('t1');
  });

  it('ends with a Turn that ended before it was asked about', async () => {
    const session = new StubSession();
    const watch = new PromptWatch(session);

    session.report(ended('t1'));
    expect(await watch.ended({ turnId: 't1' })).toBe('t1');
    expect(session.watched).toBe(false);
  });
});

describe('a queued Prompt', () => {
  it('settles with no Turn when it leaves the queue without one', async () => {
    const session = new StubSession(queue('q1'));
    const end = new PromptWatch(session).ended({ queuedId: 'q1' });

    session.report(ended('t0'));
    expect(await settled(end)).toBe(stillRunning);

    session.changeQueue(queue());
    expect(await end).toBeNull();
  });

  it('follows a steer into the running Turn and ends with it', async () => {
    const session = new StubSession(queue('q1'));
    const end = new PromptWatch(session).ended({ queuedId: 'q1' });

    session.report(taken('q1', 't0'), queue());
    expect(await settled(end)).toBe(stillRunning);

    session.report(ended('t0'));
    expect(await end).toBe('t0');
  });

  it('follows the Turn the queue starts for it and ends with it', async () => {
    const session = new StubSession(queue('q1'));
    const end = new PromptWatch(session).ended({ queuedId: 'q1' });

    session.report(taken('q1', 't1'), queue());
    expect(await settled(end)).toBe(stillRunning);

    session.report(ended('t1'));
    expect(await end).toBe('t1');
  });

  it("keeps waiting while another Prompt's Turn starts and it stays queued", async () => {
    const session = new StubSession(queue('q0', 'q1'));
    const end = new PromptWatch(session).ended({ queuedId: 'q1' });

    session.report(taken('q0', 't1'), queue('q1'));
    session.report(ended('t1'));
    expect(await settled(end)).toBe(stillRunning);

    session.changeQueue(queue());
    expect(await end).toBeNull();
  });

  it('follows a Turn that took it before it was asked about', async () => {
    const session = new StubSession(queue('q1'));
    const watch = new PromptWatch(session);

    session.report(taken('q1', 't1'), queue());
    const end = watch.ended({ queuedId: 'q1' });
    expect(await settled(end)).toBe(stillRunning);

    session.report(ended('t1'));
    expect(await end).toBe('t1');
  });
});

describe('a Session that closes first', () => {
  it('settles with the Turn it knew when the Session completes', async () => {
    const session = new StubSession();
    const end = new PromptWatch(session).ended({ turnId: 't1' });

    session.complete();
    expect(await end).toBe('t1');
  });

  it('settles, and never rejects, when the Session fails', async () => {
    const session = new StubSession(queue('q1'));
    const end = new PromptWatch(session).ended({ queuedId: 'q1' });

    session.fail();
    await expect(end).resolves.toBeNull();
  });

  it('stops hearing the Session when no Prompt is followed', () => {
    const session = new StubSession();

    new PromptWatch(session).stop();
    expect(session.watched).toBe(false);
  });
});
