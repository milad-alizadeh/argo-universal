import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then, When } from './fixtures';

// More presses than the phone Sessions page has stops, so one full cycle fits.
const tabLimit = 30;

interface TabStop {
  name: string;
  hidden: boolean;
}

async function focused(page: Page): Promise<TabStop | null> {
  const focus = page.locator(':focus');

  if ((await focus.count()) === 0) return null;

  return focus.evaluate((element) =>
    element.tagName === 'BODY'
      ? null
      : {
          name: element.getAttribute('aria-label') ?? '',
          hidden: element.closest('[aria-hidden="true"]') !== null,
        },
  );
}

// Tab from the top of the page until focus leaves its controls, keeping each stop.
async function tabOrder(page: Page): Promise<TabStop[]> {
  const stops: TabStop[] = [];

  for (let press = 0; press < tabLimit; press += 1) {
    await page.keyboard.press('Tab');
    const stop = await focused(page);

    if (!stop) break;
    stops.push(stop);
  }

  return stops;
}

Then(
  'the Tab order holds nothing hidden from assistive technology',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeVisible();
    const stops = await tabOrder(page);

    expect(stops.length).toBeGreaterThan(0);
    expect(stops.filter((stop) => stop.hidden)).toEqual([]);
    expect(stops.map((stop) => stop.name)).not.toContain('Close navigation');
  },
);

When(
  'I open the Drawer and choose Settings with the keyboard',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Open navigation' }).focus();
    await page.keyboard.press('Enter');
    const settings = page.getByRole('button', {
      name: 'Settings',
      exact: true,
    });

    await settings.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/settings$/);
  },
);

Then(
  'focus is on the Open navigation button of the Settings page',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toBeFocused();
  },
);
