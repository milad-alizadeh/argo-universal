import type { Page, Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { When, Then, test } from './fixtures';

const enablementLabel = 'Agent enabled';

const removal = (page: Page): Locator => page.getByRole('dialog');

When(
  'I request removing {string}',
  async ({ page }, name: string): Promise<void> => {
    await page
      .getByRole('button', { name: `Remove ${name}`, exact: true })
      .or(
        page.getByRole('button', { name: `Remove ${name} Agent`, exact: true }),
      )
      .click();
  },
);

Then(
  'removing {string} asks before changing the Server',
  async ({ page }, name: string): Promise<void> => {
    await expect(removal(page)).toHaveAccessibleName(`Remove ${name}?`);
    await expect(removal(page)).toContainText(
      'Past Sessions keep their history.',
    );
    await captureManagement(page, 'agent-removal-confirmation.png');
  },
);

When('I cancel removing the Agent', async ({ page }): Promise<void> => {
  await removal(page)
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(removal(page)).toBeHidden();
});

Then('the Agent remains installed', async ({ page }): Promise<void> => {
  await expect(
    page.getByRole('switch', { name: enablementLabel }),
  ).toBeChecked();
  await expect(
    page.getByRole('button', { name: /^Remove Example Agent/ }),
  ).toBeVisible();
});

When('I confirm removing the Agent', async ({ page }): Promise<void> => {
  await removal(page)
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
});

Then(
  'Example Agent is offered as not installed',
  async ({ page }): Promise<void> => {
    // The row shows no status; the Agent's page offers Install.
    await page.getByRole('link', { name: /^Example Agent, (?!back$)/ }).click();
    await expect(
      page.getByRole('button', { name: 'Install', exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the custom removal explains that the external program stays untouched',
  async ({ page }): Promise<void> => {
    await expect(removal(page)).toContainText(
      'Its external program and credentials stay untouched.',
    );
    await captureManagement(page, 'custom-agent-removal-confirmation.png');
  },
);

Then(
  '{string} is absent from the configured Agent choices',
  async ({ page }, name: string): Promise<void> => {
    await expect(page).toHaveURL(/\/settings\/agents$/);
    await expect(
      page.getByRole('link', { name: new RegExp(`^${name}, (?!back$)`) }),
    ).toHaveCount(0);
  },
);

const connectAnotherApp = async (
  page: Page,
  httpUrl: string,
): Promise<void> => {
  await page.addInitScript(
    (serverUrl): void => {
      Object.assign(globalThis, { argo: { serverUrl } });
    },
    httpUrl.replace(/^http/, 'ws'),
  );
  await page.goto('/');
  await browseAgents(page);
  await page.getByRole('link', { name: /^Example Agent,/ }).click();
};

async function observeManagement(first: Page, second: Page): Promise<void> {
  const enabled = second.getByRole('switch', { name: enablementLabel });
  await expect(enabled).toBeChecked();
  await first.getByRole('switch', { name: enablementLabel }).click();
  await expect(enabled).not.toBeChecked();
  await first.getByRole('button', { name: /^Remove Example Agent/ }).click();
  await removal(first)
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
  await expectRemovedInstallation(second);
}

async function captureManagement(page: Page, name: string): Promise<void> {
  await removal(page).screenshot({
    path: test.info().outputPath(name.replace('.png', '-dialog.png')),
    animations: 'disabled',
  });
  await page.screenshot({
    path: test.info().outputPath(name),
    animations: 'disabled',
  });
}

When(
  'another App observes disablement and removal of Example Agent',
  async ({ page, app }): Promise<void> => {
    const second = await page.context().newPage();

    try {
      await connectAnotherApp(second, app.httpUrl);
      await observeManagement(page, second);
    } finally {
      await second.close();
    }
  },
);

async function expectRemovedInstallation(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: 'Install', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Remove Example Agent/ }),
  ).toHaveCount(0);
}
