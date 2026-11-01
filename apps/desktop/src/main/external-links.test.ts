import { describe, expect, it } from 'vitest';
import { LinkInbox, screenLinkIn } from './external-links';

const link = 'argo://open/6f1c2a9e-0d6b-4f0b-9a55-3c1f5b0e7a11/sessions';

describe('screenLinkIn', () => {
  it('finds the Screen link a second launch was started with', () => {
    expect(screenLinkIn(['argo.exe', '--flag', link])).toBe(link);
  });

  it('ignores arguments that are not Screen links', () => {
    expect(
      screenLinkIn(['argo', 'argo://settings/projects/x', 'app://app/open/x']),
    ).toBeUndefined();
  });
});

describe('LinkInbox', () => {
  it('holds a link until the page is listening, then delivers it once', () => {
    const sent: string[] = [];
    const inbox = new LinkInbox((next) => sent.push(next));

    expect(inbox.receive(link)).toBe(true);
    expect(sent).toEqual([]);

    inbox.listen();
    inbox.listen();
    expect(sent).toEqual([link]);
  });

  it('delivers at once while the page is listening, and holds again after it stops', () => {
    const sent: string[] = [];
    const inbox = new LinkInbox((next) => sent.push(next));
    inbox.listen();
    inbox.receive(link);
    inbox.stopListening();
    inbox.receive(link);

    expect(sent).toEqual([link]);
    inbox.listen();
    expect(sent).toEqual([link, link]);
  });

  it('refuses a malformed or unsafe link and never delivers it', () => {
    const sent: string[] = [];
    const inbox = new LinkInbox((next) => sent.push(next));
    inbox.listen();

    for (const bad of [
      'argo://open/x/session/..',
      'argo://settings/projects/x',
      'javascript:alert(1)',
      `${link}?href=/settings`,
    ])
      expect(inbox.receive(bad)).toBe(false);

    expect(sent).toEqual([]);
  });
});
