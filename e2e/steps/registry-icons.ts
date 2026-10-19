import { expect } from '../fixtures';
import { Then } from './fixtures';

const registryIcon =
  'https://cdn.agentclientprotocol.com/registry/v1/latest/example.svg';

Then(
  'an official Registry logo loads in the desktop renderer',
  async ({ page }) => {
    // Only the remote CDN is replaced; Electron's production CSP checks this image.
    await page.route(registryIcon, (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8"/></svg>',
      }),
    );
    const loaded = await page.evaluate(`new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = ${JSON.stringify(registryIcon)};
  })`);
    expect(loaded).toBe(true);
  },
);
