import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { homeWords } from './home-words';
import { authorizeUrl, hueHost } from './hue';
import { applicationKey, bridgeId, hueApp } from './mocks/hue-data';
import {
  firstAuthorize,
  homePage,
  signIn,
  startHome,
} from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

it(
  'draws the sign-in in place of the Home page until the person signs in to Hue',
  async () => {
    const page = await homePage(await startHome());

    expect(page.findText(`Sign in to ${homeWords.service}`)).toBeDefined();
  },
  timeoutMs,
);

it(
  'sends the browser to Hue with the app’s client ID and Argo’s callback, never the secret',
  async () => {
    const home = await startHome();

    await signIn(home);
    const authorize = firstAuthorize(home);

    expect(`${authorize.origin}${authorize.pathname}`).toBe(authorizeUrl);
    expect(Object.fromEntries(authorize.searchParams)).toMatchObject({
      client_id: hueApp.id,
      response_type: 'code',
      redirect_uri: 'http://127.0.0.1:51789/callback',
    });
    expect(authorize.searchParams.has('client_secret')).toBe(false);
  },
  timeoutMs,
);

it(
  'exchanges the code with the client secret and adds the api.meethue.com Account named by the Bridge',
  async () => {
    const home = await startHome();

    await signIn(home);

    expect(home.hue.cloud.forms[0]?.get('client_secret')).toBe(hueApp.secret);
    expect(home.test.accounts.list()).toMatchObject([
      { host: hueHost, label: `Hue Bridge ${bridgeId}` },
    ]);
  },
  timeoutMs,
);

it(
  'asks to connect the Bridge once signed in, then presses its link button through the cloud for a key',
  async () => {
    const home = await startHome();

    await signIn(home);
    const page = await homePage(home);

    expect(page.findText(homeWords.connect)).toBeDefined();
    const after = await page.press(homeWords.connectButton);

    expect(home.hue.cloud.linkPressed).toBe(true);
    expect(after.findText('Desk lamp')).toBeDefined();
    expect(home.hue.requests.at(-1)?.headers['hue-application-key']).toBe(
      applicationKey,
    );
  },
  timeoutMs,
);

it(
  'fails the sign-in, saying so, until the Remote API app’s client ID and secret are set',
  async () => {
    const home = await startHome(new Map());

    const page = await home.test.pages.open({
      path: '/sign-in',
      serverDevice: true,
    });

    await page.press(`Sign in to ${homeWords.service}`);
    await page.draw();

    expect(home.opened).toEqual([]);
    expect(page.findText('This Plugin has no OAuth client ID yet.')).toBeDefined();
  },
  timeoutMs,
);
