import { expect, it } from 'vitest';
import { basicCredential, siteHost } from './atlassian';

const site = 'arena-club.atlassian.net';

it('reads a site from what a person types, and refuses any host that is not Atlassian’s', () => {
  expect(siteHost('arena-club')).toBe(site);
  expect(siteHost(' Arena-Club.atlassian.net ')).toBe(site);
  expect(
    siteHost('https://arena-club.atlassian.net/jira/software/projects/ARGO'),
  ).toBe(site);
  expect(siteHost('evil.example.com')).toBeNull();
  expect(siteHost('')).toBeNull();
});

it('encodes the Basic credential as base64 of the UTF-8 email and token', () => {
  for (const [email, token] of [
    ['ada@example.com', 'ATATT-scoped-4f2a9c'],
    ['zoë@example.com', 'a'],
    ['a@b.c', 'tok'],
  ] as const) {
    const expected = Buffer.from(`${email}:${token}`).toString('base64');

    expect(basicCredential(email, token)).toBe(`Basic ${expected}`);
  }
});
