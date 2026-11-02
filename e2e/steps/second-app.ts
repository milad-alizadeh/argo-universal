import { expect } from '../fixtures';
import { Given, Then, When } from './fixtures';

Given(
  'the Server accepts Devices from the local network',
  async ({ secondApp }): Promise<void> => {
    await secondApp.allowLocalNetwork();
  },
);

When(
  'a second App pairs with a Pairing Ticket and the owner presses Allow',
  async ({ secondApp }): Promise<void> => {
    await secondApp.pair();
  },
);

Then(
  'the second App reads the Session {string} through the encrypted channel',
  async ({ secondApp }, title: string): Promise<void> => {
    expect(await secondApp.sessionTitles()).toContain(title);
  },
);

Then(
  'the second App is a Paired Device the Server lists by name',
  async ({ secondApp }): Promise<void> => {
    expect(await secondApp.pairedDeviceNames()).toEqual([secondApp.name]);
  },
);

When(
  'the owner unpairs the second App',
  async ({ secondApp }): Promise<void> => {
    await secondApp.unpair();
  },
);

Then(
  'the Server lists only the Server Device',
  async ({ secondApp }): Promise<void> => {
    expect(await secondApp.pairedDeviceNames()).toEqual([]);
  },
);

When(
  'the Server stops, nothing still listens on its port',
  async ({ app, secondApp }): Promise<void> => {
    await secondApp.expectNothingListening(app.restartEngine);
  },
);
