import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import {
  compactFrame,
  onPhone,
  openConnection,
  phone,
  serveOnePage,
  wide,
  wideFrame,
} from './frame';
import { sessionOpenTimeout } from './new-session';

export async function expectSettingsList(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
}

// A reload or a shared link opens New Session by its URL, so the Sessions list below it is built from that same path.
When('I open New Session by its URL', async ({ page }): Promise<void> => {
  await serveOnePage(page);
  await page.goto('/sessions/new');
  await expect(page).toHaveURL(/\/sessions\/new$/);
  // The load opens its own Connection, as the App's first load did.
  await expect(page.getByRole('button', { name: /^Project: / })).toBeVisible(
    sessionOpenTimeout,
  );
  await expect(page.getByText('Reconnecting…')).toHaveCount(0);
});

When('the Frame becomes a phone Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(phone);
});

When('the Frame becomes a wide Frame', async ({ page }): Promise<void> => {
  await page.setViewportSize(wide);
});

Then(
  'the Connection remains open in the phone Frame',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId(wideFrame)).toHaveCount(0);
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

Then(
  'the Connection remains open in the wide Frame',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId(wideFrame)).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/connection$/);
    await expect(page.getByText('Version', { exact: true })).toBeVisible();
  },
);

// The Accounts page's own title, which it shows with or without Accounts.
const accountsPage = (page: Page): Locator =>
  page.getByRole('heading', { name: 'Accounts', level: 1 });

Then(
  'the phone Frame shows the Settings list without Accounts detail',
  async ({ page }): Promise<void> => {
    await expectSettingsList(page);
    await expect(page.getByTestId(compactFrame)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Accounts(?:,|$)/ }),
    ).toBeVisible();
    await expect(accountsPage(page)).toHaveCount(0);
  },
);

Then(
  'the wide Frame shows Accounts beside the Settings list',
  async ({ page }): Promise<void> => {
    // A wide Frame opens the list's first page, and the URL names it.
    await expect(page).toHaveURL(/\/settings\/accounts$/);
    await expect(
      page.getByRole('link', { name: /^Accounts(?:,|$)/ }),
    ).toBeVisible();
    await expect(
      settingsModal(page).getByRole('heading', { name: 'Accounts', level: 1 }),
    ).toBeVisible();
  },
);

When(
  'I view the Connection from the drawer',
  async ({ page }): Promise<void> => {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await openConnection(page);
  },
);

// A phone Frame picks a section from the Drawer behind ☰; a wide one from its rail.
export async function returnToSessions(page: Page): Promise<void> {
  if (onPhone(page))
    await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
}

When('I return to Sessions', async ({ page }): Promise<void> => {
  await returnToSessions(page);
});

Then(
  'the phone Frame shows the Sessions list',
  async ({ page }): Promise<void> => {
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByTestId(compactFrame)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 1 }),
    ).toBeVisible();
  },
);

Then(
  'the wide Frame shows no Session beside the Sessions list',
  async ({ page }): Promise<void> => {
    // Nothing is picked, so the detail beside the list stays empty and the URL names the list.
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.getByTestId(wideFrame)).toBeVisible();
    await expect(
      page.getByText('Select a Session', { exact: true }),
    ).toBeVisible();
  },
);

// A stale or mistyped link is the normal way to an unknown address.
When('I open an address no page answers', async ({ page }): Promise<void> => {
  await serveOnePage(page);
  await page.goto('/nonsense');
  await expect(page).toHaveURL(/\/nonsense$/);
});

const notFoundPage = (page: Page): Locator =>
  page.getByText("This page doesn't exist", { exact: true });

Then(
  'the wide Frame shows Not found beside the Sessions list',
  async ({ page }): Promise<void> => {
    await expect(page.getByTestId(wideFrame)).toBeVisible();
    await expect(notFoundPage(page)).toBeVisible();
    // The sidebar's list heading: the Frame's Sessions section is open beside the page.
    await expect(
      page.getByRole('heading', { name: 'Sessions', level: 2 }),
    ).toBeVisible();
  },
);

Then('the phone Frame shows Not found', async ({ page }): Promise<void> => {
  await expect(page.getByTestId(compactFrame)).toBeVisible();
  await expect(notFoundPage(page)).toBeVisible();
  // The page's own header, with ☰ to the Drawer, as a section's root has.
  await expect(
    page.getByRole('button', { name: 'Show navigation menu' }),
  ).toBeVisible();
});

When('I leave Not found for Sessions', async ({ page }): Promise<void> => {
  await page.getByRole('button', { name: 'Back to Sessions' }).click();
});

// The stack header's own Back, whatever page it is titled for.
When('I press Back in the page header', async ({ page }): Promise<void> => {
  await page.getByRole('link', { name: /, back$/ }).click();
});

Then('New Session is open', async ({ page }): Promise<void> => {
  await expect(page).toHaveURL(/\/sessions\/new(\?|$)/);
});

const settingsModal = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Settings', exact: true });

export async function closeSettingsModal(page: Page): Promise<void> {
  await expect(settingsModal(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settingsModal(page)).toHaveCount(0);
}

When('I close the Settings modal', async ({ page }) =>
  closeSettingsModal(page),
);

Then('the Settings modal sits over New Session', async ({ page }) => {
  await expect(settingsModal(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Project: /, includeHidden: true }),
  ).toBeVisible();
});

When('I open Agents from the Settings list', async ({ page }) => {
  await settingsModal(page)
    .getByRole('link', { name: /^Agents(?:,|$)/ })
    .click();
  await expect(page).toHaveURL(/\/settings\/agents$/);
});

When(
  /I dismiss the Settings modal with (Escape|the dim|the accessible backdrop)/,
  async ({ page }, control: string) => {
    if (control === 'Escape') return closeSettingsModal(page);

    if (control === 'the accessible backdrop') {
      await settingsModal(page)
        .getByRole('button', { name: 'Dismiss Settings', exact: true })
        .press('Enter');
    } else {
      const tile = page.getByRole('button', {
        name: 'Scheduled',
        exact: true,
        includeHidden: true,
      });

      const box = await tile.boundingBox();

      if (!box) throw new Error('The dimmed rail tile has no bounds.');
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    await expect(settingsModal(page)).toHaveCount(0);
  },
);

Then('focus returns to the Settings rail tile', async ({ page }) => {
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
});

Then('Agents is open in the Settings modal', async ({ page }) => {
  await expect(page).toHaveURL(/\/settings\/agents$/);

  const search = settingsModal(page).getByRole('button', {
    name: 'Search Agents',
  });

  await expect(search).toBeVisible();
});
