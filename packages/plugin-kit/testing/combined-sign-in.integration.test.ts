import { expect, it } from 'vitest';
import { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import {
  approving,
  clockUntil,
  itemsText,
  signInLabel,
  start,
} from './sign-in-fixture';
import { keeps, paste } from './token-paste-fixture';

serialiseOnOAuthPort();

const email = 'person@example.com';

const apiToken = 'fixture-api-token';

const pair = Buffer.from(`${email}:${apiToken}`).toString('base64');

const basic = `Basic ${pair}`;

const bearer = 'Bearer oauth-fixture';

const tokenReply = (body: string): FixtureAnswer =>
  new URLSearchParams(body).has('refresh_token')
    ? { status: 400, json: { error: 'invalid_grant' } }
    : {
        json: {
          access_token: 'oauth-fixture',
          refresh_token: 'refresh-fixture',
          expires_in: 3600,
        },
      };

const authorizations = (acceptsPaste: boolean): string[] =>
  acceptsPaste ? [bearer, basic] : [bearer];

function service(
  request: FixtureRequest,
  acceptsPaste: boolean,
): FixtureAnswer {
  const { path, headers, body } = request;

  if (path === '/token') return tokenReply(body);

  const accepts = authorizations(acceptsPaste);

  if (!accepts.includes(String(headers.authorization))) return { status: 401 };

  return readReply(path);
}

const readReply = (path: string): FixtureAnswer => ({
  text: path === '/me' ? email : itemsText,
});

it('uses one Account for Basic and OAuth and shows sign-in again when the refresh is refused', async () => {
  let acceptsPaste = true;

  const { network, requests } = await fixtureServices((request) =>
    service(request, acceptsPaste),
  );

  const test = await start('combined', { network, openBrowser: approving() });
  const address = { projectId: 'one', serverDevice: true };
  const items = await test.pages.open({ path: '/', ...address });
  const signIn = await test.pages.open({ path: '/sign-in', ...address });

  await signIn.act(
    (node) => node.type === 'FieldGroup.TextField',
    'onChangeText',
    email,
  );
  await test.clock.advance(300);
  expect(signIn.pageState.email).toBe(email);
  await paste(test, signIn, apiToken);
  await clockUntil(test, items, itemsText);
  expect(keeps(signIn, apiToken)).toBe(false);
  expect(await test.log()).not.toContain(apiToken);
  expect(
    requests.findLast(({ path }) => path === '/items')?.headers.authorization,
  ).toBe(basic);
  const pasted = test.accounts.list();
  expect(pasted).toHaveLength(1);

  // A revoked paste exposes both flows on the gated page.
  acceptsPaste = false;
  await test.clock.advance(60_000);
  await clockUntil(test, items, signInLabel);
  await items.press(signInLabel);
  await clockUntil(test, signIn, 'Connected');
  await expect
    .poll(async () => {
      await items.draw();

      return requests.findLast(({ path }) => path === '/items')?.headers
        .authorization;
    })
    .toBe(bearer);
  expect(test.accounts.list()).toEqual(pasted);

  await test.clock.advance(3_600_000);
  await clockUntil(test, items, signInLabel);
  expect(
    items.find((node) => node.type === 'FieldGroup.SecretField'),
  ).toBeDefined();
  expect(
    requests.some(({ body }) => new URLSearchParams(body).has('refresh_token')),
  ).toBe(true);
}, 30_000);
